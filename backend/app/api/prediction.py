"""Prediction endpoints."""
import logging
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import PredictionRequest, PredictionResponse
from app.services import registry
import shap

router = APIRouter(prefix="/predict", tags=["Prediction"])
log    = logging.getLogger(__name__)

RISK = {"Low":(0,.3), "Medium":(.3,.6), "High":(.6,.8), "Critical":(.8,1.)}

def risk_level(p):
    for lvl,(lo,hi) in RISK.items():
        if lo <= p < hi: return lvl
    return "Critical"

def risk_factors(d, p):
    f = []
    if d.get("OverTime")=="Yes":               f.append("Working overtime — 2-3× attrition risk")
    if d.get("JobSatisfaction",3)<=2:           f.append("Low job satisfaction (score ≤ 2)")
    if d.get("EnvironmentSatisfaction",3)<=2:   f.append("Poor environment satisfaction")
    if d.get("WorkLifeBalance",3)<=2:           f.append("Poor work-life balance")
    if d.get("YearsAtCompany",5)<=2:            f.append("Short tenure — early flight-risk window")
    if d.get("BusinessTravel")=="Travel_Frequently": f.append("Frequent travel increases burnout")
    if d.get("MonthlyIncome",5000)<3000:        f.append("Below-average compensation")
    if d.get("Age",35)<28:                      f.append("Younger employees show higher mobility")
    if d.get("MaritalStatus")=="Single":        f.append("Single status correlates with higher mobility")
    if d.get("NumCompaniesWorked",1)>=5:        f.append("History of frequent job changes")
    return f[:5]

def recommendations(level, factors):
    r = []
    fl = " ".join(factors).lower()
    if "overtime" in fl:       r.append("Review workload — consider additional headcount")
    if "satisfaction" in fl:   r.append("Schedule career-development 1-on-1 conversations")
    if "work-life" in fl:      r.append("Explore flexible / remote working arrangements")
    if "compensation" in fl:   r.append("Benchmark salary against current market rates")
    if "tenure" in fl:         r.append("Implement structured 30/60/90-day onboarding check-ins")
    if "travel" in fl:         r.append("Review travel requirements; offer virtual alternatives")
    if level in ("High","Critical"):
        r.append("Flag for urgent retention conversation with line manager")
        r.append("Evaluate fast-track promotion or retention bonus")
    return r[:4] or ["Continue current engagement practices", "Schedule regular performance reviews"]

DROP = ["EmployeeCount","EmployeeNumber","Over18","StandardHours"]
NUM = ["Age","DailyRate","DistanceFromHome","HourlyRate","MonthlyIncome","MonthlyRate",
       "NumCompaniesWorked","PercentSalaryHike","TotalWorkingYears","TrainingTimesLastYear",
       "YearsAtCompany","YearsInCurrentRole","YearsSinceLastPromotion","YearsWithCurrManager",
       "TenureRatio","IncomePerYearExp","SatisfactionScore","PromotionLag",
       "ManagerStability","OverTimeFlag","FreqTraveler","LowIncome","EarlyCareer",
       "HighDistance","JobHopper"]
CAT = ["BusinessTravel","Department","EducationField","Gender","JobRole","MaritalStatus","OverTime"]
ORD = ["Education","EnvironmentSatisfaction","JobInvolvement","JobLevel",
       "JobSatisfaction","PerformanceRating","RelationshipSatisfaction","StockOptionLevel","WorkLifeBalance"]

def engineer(df):
    d = df.copy()
    d["TenureRatio"]      = d["YearsAtCompany"]          / d["TotalWorkingYears"].clip(lower=1)
    d["IncomePerYearExp"] = d["MonthlyIncome"]            / d["TotalWorkingYears"].clip(lower=1)
    d["SatisfactionScore"]= (d["JobSatisfaction"]+d["EnvironmentSatisfaction"]+
                              d["RelationshipSatisfaction"]+d["WorkLifeBalance"]) / 4.0
    d["PromotionLag"]     = d["YearsSinceLastPromotion"]  / d["YearsAtCompany"].clip(lower=1)
    d["ManagerStability"] = d["YearsWithCurrManager"]     / d["YearsAtCompany"].clip(lower=1)
    d["OverTimeFlag"]     = (d["OverTime"]=="Yes").astype(int)
    d["FreqTraveler"]     = (d["BusinessTravel"]=="Travel_Frequently").astype(int)
    d["LowIncome"]        = (d["MonthlyIncome"] < 3000).astype(int)
    d["EarlyCareer"]      = (d["TotalWorkingYears"] <= 3).astype(int)
    d["HighDistance"]     = (d["DistanceFromHome"] > 15).astype(int)
    d["JobHopper"]        = (d["NumCompaniesWorked"] >= 4).astype(int)
    return d

def preprocess_request(req: PredictionRequest):
    if not registry.is_loaded():
        raise HTTPException(503, "Models not loaded. Run train.py first.")
    pre = registry.get_preprocessor()
    if pre is None:
        raise HTTPException(503, "Preprocessor not found. Run train.py first.")
    d = req.model_dump()
    d.update({"EmployeeCount":1,"EmployeeNumber":999999,"Over18":"Y","StandardHours":80,"Attrition":"No"})
    df = pd.DataFrame([d])
    df.drop(columns=[c for c in DROP if c in df.columns], inplace=True)
    df.drop(columns=["Attrition"], inplace=True, errors="ignore")
    df = engineer(df)
    return pre.transform(df)

@router.post("/single", response_model=PredictionResponse)
async def predict_single(req: PredictionRequest):
    X = preprocess_request(req)
    name  = registry.get_best_name()
    model = registry.get_best_model()
    prob  = float(model.predict_proba(X)[0,1])
    pred  = int(prob >= 0.5)
    lvl   = risk_level(prob)
    fnames = registry.get_feature_names()

    # SHAP for single prediction
    shap_exp = {}
    try:
        exp = shap.TreeExplainer(model)
        sv  = exp.shap_values(X)
        sv_pos = sv[1][0] if isinstance(sv, list) else (sv[:,:,1][0] if sv.ndim==3 else sv[0])
        ev = exp.expected_value
        ev = float(ev[1] if isinstance(ev,(list,np.ndarray)) else ev)
        sorted_idx = np.argsort(np.abs(sv_pos))[::-1][:12]
        waterfall = [{"feature": fnames[i] if i<len(fnames) else f"f{i}",
                      "shap_value": float(sv_pos[i]),
                      "direction": "increases" if sv_pos[i]>0 else "decreases"}
                     for i in sorted_idx]
        shap_exp = {"base_value": ev, "waterfall": waterfall, "total_shap_effect": float(sv_pos.sum())}
    except Exception as e:
        log.warning(f"SHAP single predict failed: {e}")

    d      = req.model_dump()
    rf     = risk_factors(d, prob)
    recs   = recommendations(lvl, rf)

    return PredictionResponse(
        prediction=pred, probability_attrition=round(prob,4),
        probability_retention=round(1-prob,4), risk_level=lvl,
        model_used=name, shap_explanation=shap_exp,
        risk_factors=rf, recommendations=recs,
    )

@router.post("/batch")
async def predict_batch(requests: List[PredictionRequest]):
    if len(requests) > 200:
        raise HTTPException(400, "Batch limited to 200 records.")
    model = registry.get_best_model()
    results = []
    for req in requests:
        try:
            X    = preprocess_request(req)
            prob = float(model.predict_proba(X)[0,1])
            results.append({"probability_attrition": round(prob,4), "risk_level": risk_level(prob), "prediction": int(prob>=0.5)})
        except Exception as e:
            results.append({"error": str(e)})
    return {"predictions": results, "count": len(results), "model_used": registry.get_best_name()}

@router.get("/model-info")
async def model_info():
    if not registry.is_loaded():
        raise HTTPException(503, "Models not loaded.")
    return {"best_model": registry.get_best_name(), "available_models": list(registry.get_all_models().keys()), "status": registry.get_status()}
