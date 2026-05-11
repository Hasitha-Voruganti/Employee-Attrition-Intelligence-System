"""
Model registry — loads pre-trained models + results from disk.
All actual training happens via train.py (standalone script).
"""
import json, logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
import numpy as np

log = logging.getLogger(__name__)

MODEL_DIR = Path("models")
DATA_DIR  = Path("data")

# ---------------------------------------------------------
# Singleton state
# ---------------------------------------------------------
_state: Dict[str, Any] = {
    "models":        {},       # name → fitted sklearn model
    "results":       {},       # training_results.json["results"]
    "shap":          {},       # training_results.json["shap"]
    "best_model":    None,
    "feature_names": [],
    "preprocessor":  None,
    "dataset_info":  {},
    "loaded":        False,
    "status":        "idle",   # idle | training | complete | error
    "progress":      0,
}


def load_models() -> bool:
    """Load all artefacts produced by train.py.  Returns True on success."""
    results_path = MODEL_DIR / "training_results.json"
    if not results_path.exists():
        log.warning("training_results.json not found — run train.py first.")
        return False

    try:
        with open(results_path) as f:
            data = json.load(f)

        _state["results"]      = data.get("results", {})
        _state["shap"]         = data.get("shap", {})
        _state["best_model"]   = data.get("best_model")
        _state["feature_names"]= data.get("feature_names", [])
        _state["dataset_info"] = data.get("dataset_info", {})

        for name in ("RandomForest", "XGBoost", "LightGBM"):
            p = MODEL_DIR / f"{name.lower()}.joblib"
            if p.exists():
                _state["models"][name] = joblib.load(p)
                log.info(f"  Loaded {name}")

        pre_path = MODEL_DIR / "preprocessor.joblib"
        if pre_path.exists():
            _state["preprocessor"] = joblib.load(pre_path)

        fn_path = MODEL_DIR / "feature_names.joblib"
        if fn_path.exists():
            _state["feature_names"] = joblib.load(fn_path)

        _state["loaded"] = True
        _state["status"] = "complete"
        _state["progress"] = 100
        log.info(f"Registry loaded. Best={_state['best_model']}  "
                 f"Models={list(_state['models'].keys())}")
        return True

    except Exception as e:
        log.error(f"load_models failed: {e}", exc_info=True)
        return False


# ---------------------------------------------------------
# Accessors
# ---------------------------------------------------------
def get_best_model():
    return _state["models"].get(_state["best_model"])

def get_model(name: str):
    return _state["models"].get(name)

def get_all_models() -> Dict:
    return _state["models"]

def get_results() -> Dict:
    return _state["results"]

def get_shap() -> Dict:
    return _state["shap"]

def get_best_name() -> Optional[str]:
    return _state["best_model"]

def get_feature_names() -> List[str]:
    return _state["feature_names"]

def get_preprocessor():
    return _state["preprocessor"]

def get_status() -> str:
    return _state["status"]

def set_status(s: str, p: int = 0):
    _state["status"]   = s
    _state["progress"] = p

def get_progress() -> int:
    return _state["progress"]

def get_dataset_info() -> Dict:
    return _state["dataset_info"]

def is_loaded() -> bool:
    return _state["loaded"]


def build_comparison_table() -> List[Dict]:
    results = _state["results"]
    best    = _state["best_model"]
    rows = []
    for name, res in results.items():
        if "error" in res:
            continue
        m  = res["test_metrics"]
        cv = res["cv_metrics"]
        rows.append({
            "model":           name,
            "accuracy":        round(m["accuracy"],   4),
            "f1_score":        round(m["f1_score"],   4),
            "roc_auc":         round(m["roc_auc"],    4),
            "precision":       round(m["precision"],  4),
            "recall":          round(m["recall"],     4),
            "specificity":     round(m["specificity"],4),
            "cv_roc_auc_mean": round(cv["cv_roc_auc_mean"], 4),
            "cv_roc_auc_std":  round(cv["cv_roc_auc_std"],  4),
            "cv_f1_mean":      round(cv["cv_f1_mean"],      4),
            "training_time":   res.get("training_time_seconds", 0),
            "is_best":         name == best,
        })
    return sorted(rows, key=lambda x: x["roc_auc"], reverse=True)
