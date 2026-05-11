"""Analytics & EDA endpoints."""
import logging, math
from fastapi import APIRouter, HTTPException
from app.services import registry
from app.services.eda import compute_eda
from app.utils.dataset import load_or_generate_dataset

router = APIRouter(prefix="/analytics", tags=["Analytics"])
log    = logging.getLogger(__name__)
_eda_cache: dict = {}


def _clean(obj):
    """Recursively replace inf/nan with None so JSON serialises cleanly."""
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean(v) for v in obj]
    return obj


@router.get("/eda")
async def get_eda():
    if _eda_cache:
        return _eda_cache
    try:
        df   = load_or_generate_dataset()
        data = compute_eda(df)
        _eda_cache.update(data)
        return data
    except Exception as e:
        log.error(f"EDA error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feature-importance")
async def get_feature_importance(model_name: str = None):
    if not registry.is_loaded():
        raise HTTPException(status_code=404, detail="Models not trained. Run train.py first.")
    name    = model_name or registry.get_best_name()
    results = registry.get_results()
    if name not in results:
        raise HTTPException(status_code=404, detail=f"Model '{name}' not found.")
    return {
        "model":              name,
        "feature_importance": results[name].get("feature_importance", []),
    }


@router.get("/shap-summary")
async def get_shap_summary(model_name: str = None):
    if not registry.is_loaded():
        raise HTTPException(status_code=404, detail="Models not trained. Run train.py first.")
    name = model_name or registry.get_best_name()
    shap = registry.get_shap()
    if name not in shap:
        raise HTTPException(status_code=404, detail=f"SHAP data for '{name}' not found.")
    return {
        "model":             name,
        "global_importance": shap[name].get("global_importance", []),
        "expected_value":    shap[name].get("expected_value", 0),
    }


@router.get("/model-metrics")
async def get_model_metrics():
    if not registry.is_loaded():
        raise HTTPException(status_code=404, detail="Models not trained. Run train.py first.")
    results  = registry.get_results()
    detailed = {}
    for name, res in results.items():
        if "error" in res:
            continue
        tm = res["test_metrics"]
        # Strip roc_curve thresholds — they contain inf and are large; frontend only needs fpr/tpr
        roc = tm.get("roc_curve", {})
        detailed[name] = {
            "confusion_matrix": tm.get("confusion_matrix", []),
            "roc_curve": {
                "fpr": _clean(roc.get("fpr", [])),
                "tpr": _clean(roc.get("tpr", [])),
            },
            "cv_metrics": res.get("cv_metrics", {}),
            "tune_info":  res.get("tune_info",  {}),
        }
    return _clean({
        "comparison_table": registry.build_comparison_table(),
        "best_model":       registry.get_best_name(),
        "detailed_metrics": detailed,
    })


@router.get("/correlation")
async def get_correlation():
    df   = load_or_generate_dataset()
    cols = ["Age","MonthlyIncome","YearsAtCompany","TotalWorkingYears",
            "JobSatisfaction","EnvironmentSatisfaction","WorkLifeBalance",
            "DistanceFromHome","NumCompaniesWorked","PercentSalaryHike",
            "JobLevel","StockOptionLevel"]
    cols = [c for c in cols if c in df.columns]
    corr = df[cols].corr().round(3)
    return _clean({"columns": cols, "matrix": corr.values.tolist()})
