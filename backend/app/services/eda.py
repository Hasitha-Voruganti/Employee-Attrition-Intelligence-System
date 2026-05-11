"""
EDA Analytics Service — computes all chart data for the dashboard.
Written to be compatible with pandas 2.x on Windows.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any


def _attrition_rate(series: pd.Series) -> float:
    return round(float((series == "Yes").mean()), 4)


def _safe_groupby_attrition(df: pd.DataFrame, col: str) -> list:
    """Group by col, return list of {col, attrition_rate, count}."""
    out = []
    for val, grp in df.groupby(col):
        out.append({
            col: val,
            "attrition_rate": _attrition_rate(grp["Attrition"]),
            "count": int(len(grp)),
        })
    return out


def compute_eda(df: pd.DataFrame) -> Dict[str, Any]:
    target = "Attrition"
    n = len(df)
    att_yes = int((df[target] == "Yes").sum())

    # ── Summary ──────────────────────────────────────────────────────────────
    summary = {
        "total_employees":    int(n),
        "attrition_count":    att_yes,
        "retention_count":    int(n - att_yes),
        "attrition_rate":     round(float(att_yes / n), 4),
        "avg_age":            round(float(df["Age"].mean()), 1),
        "avg_monthly_income": round(float(df["MonthlyIncome"].mean()), 0),
        "avg_tenure":         round(float(df["YearsAtCompany"].mean()), 1),
        "overtime_pct":       round(float((df["OverTime"] == "Yes").mean()), 4),
    }

    # ── Department ───────────────────────────────────────────────────────────
    department_attrition = _safe_groupby_attrition(df, "Department")

    # ── Job Role ─────────────────────────────────────────────────────────────
    role_rows = _safe_groupby_attrition(df, "JobRole")
    role_attrition = sorted(role_rows, key=lambda x: x["attrition_rate"], reverse=True)
    # Rename key for frontend
    for r in role_attrition:
        r["role"] = r.pop("JobRole")

    # ── Age Distribution ─────────────────────────────────────────────────────
    bins = [18, 25, 30, 35, 40, 45, 50, 61]
    labels = ["18-24","25-29","30-34","35-39","40-44","45-49","50+"]
    df2 = df.copy()
    df2["_age_grp"] = pd.cut(df2["Age"], bins=bins, labels=labels, right=False)
    age_distribution = []
    for grp_val, grp in df2.groupby("_age_grp", observed=True):
        age_distribution.append({
            "age_group": str(grp_val),
            "total":     int(len(grp)),
            "attrited":  int((grp[target] == "Yes").sum()),
            "rate":      round(float((grp[target] == "Yes").mean()), 4),
        })

    # ── Income Distribution ──────────────────────────────────────────────────
    df2["_inc_grp"] = pd.cut(df2["MonthlyIncome"], bins=8)
    income_distribution = []
    for grp_val, grp in df2.groupby("_inc_grp", observed=True):
        income_distribution.append({
            "income_range": str(grp_val),
            "total":        int(len(grp)),
            "attrited":     int((grp[target] == "Yes").sum()),
            "rate":         round(float((grp[target] == "Yes").mean()), 4),
        })

    # ── Satisfaction scores ───────────────────────────────────────────────────
    satisfaction_data = {}
    for col in ["JobSatisfaction", "EnvironmentSatisfaction",
                "WorkLifeBalance", "RelationshipSatisfaction"]:
        rows = []
        for score, grp in df.groupby(col):
            rows.append({
                "score":         int(score),
                "attrition_rate": round(float((grp[target] == "Yes").mean()), 4),
                "count":         int(len(grp)),
            })
        satisfaction_data[col] = rows

    # ── Business Travel ───────────────────────────────────────────────────────
    travel_rows = _safe_groupby_attrition(df, "BusinessTravel")
    for r in travel_rows:
        r["travel_type"] = r.pop("BusinessTravel")
    travel_attrition = travel_rows

    # ── Tenure distribution ───────────────────────────────────────────────────
    tenure_bins   = [0, 1, 3, 5, 10, 15, 41]
    tenure_labels = ["<1","1-2","3-4","5-9","10-14","15+"]
    df2["_ten_grp"] = pd.cut(df2["YearsAtCompany"], bins=tenure_bins, labels=tenure_labels, right=False)
    tenure_distribution = []
    for grp_val, grp in df2.groupby("_ten_grp", observed=True):
        tenure_distribution.append({
            "tenure_group": str(grp_val),
            "total":        int(len(grp)),
            "attrited":     int((grp[target] == "Yes").sum()),
            "rate":         round(float((grp[target] == "Yes").mean()), 4),
        })

    # ── Overtime ─────────────────────────────────────────────────────────────
    overtime_rows = _safe_groupby_attrition(df, "OverTime")
    for r in overtime_rows:
        r["overtime"] = r.pop("OverTime")
    overtime_attrition = overtime_rows

    # ── Gender ────────────────────────────────────────────────────────────────
    gender_data = []
    for val, grp in df.groupby("Gender"):
        gender_data.append({
            "Gender":        val,
            "count":         int(len(grp)),
            "attrition_rate": round(float((grp[target] == "Yes").mean()), 4),
        })

    # ── Marital Status ────────────────────────────────────────────────────────
    marital_data = []
    for val, grp in df.groupby("MaritalStatus"):
        marital_data.append({
            "MaritalStatus": val,
            "count":         int(len(grp)),
            "attrition_rate": round(float((grp[target] == "Yes").mean()), 4),
        })

    # ── Income by attrition ───────────────────────────────────────────────────
    income_by_attrition = {
        "attrited": round(float(df[df[target] == "Yes"]["MonthlyIncome"].mean()), 0),
        "retained": round(float(df[df[target] == "No"]["MonthlyIncome"].mean()),  0),
    }

    # ── Correlation matrix ────────────────────────────────────────────────────
    num_cols = ["Age","MonthlyIncome","YearsAtCompany","TotalWorkingYears",
                "JobSatisfaction","EnvironmentSatisfaction","WorkLifeBalance",
                "DistanceFromHome","NumCompaniesWorked","PercentSalaryHike"]
    num_cols = [c for c in num_cols if c in df.columns]
    corr_matrix = df[num_cols].corr().round(3)
    correlation = {
        "columns": num_cols,
        "matrix":  corr_matrix.values.tolist(),
    }

    return {
        "summary":              summary,
        "department_attrition": department_attrition,
        "role_attrition":       role_attrition,
        "age_distribution":     age_distribution,
        "income_distribution":  income_distribution,
        "satisfaction_data":    satisfaction_data,
        "travel_attrition":     travel_attrition,
        "tenure_distribution":  tenure_distribution,
        "overtime_attrition":   overtime_attrition,
        "gender_data":          gender_data,
        "marital_data":         marital_data,
        "income_by_attrition":  income_by_attrition,
        "correlation":          correlation,
    }
