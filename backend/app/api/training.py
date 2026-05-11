"""Training status endpoints (actual training done via train.py)."""
import logging, threading
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.services import registry
from app.utils.dataset import load_or_generate_dataset

router = APIRouter(prefix="/training", tags=["Training"])
log    = logging.getLogger(__name__)

def _run_training():
    import subprocess, sys
    registry.set_status("training", 10)
    try:
        result = subprocess.run([sys.executable, "train.py"], capture_output=True, text=True)
        if result.returncode == 0:
            registry.load_models()
            registry.set_status("complete", 100)
            log.info("Training subprocess completed successfully.")
        else:
            log.error(f"Training subprocess failed:\n{result.stderr}")
            registry.set_status("error", 0)
    except Exception as e:
        log.error(f"Training thread error: {e}")
        registry.set_status("error", 0)

@router.post("/start")
async def start_training(background_tasks: BackgroundTasks):
    if registry.get_status() == "training":
        return {"status": "already_training", "message": "Training already in progress"}
    registry.set_status("training", 5)
    background_tasks.add_task(_run_training)
    return {"status": "started", "message": "Training started. Poll /api/training/status for progress."}

@router.get("/status")
async def get_training_status():
    status   = registry.get_status()
    progress = registry.get_progress()
    messages = {
        "idle":     "Ready. Click 'Start Training' to begin.",
        "training": f"Training models… {progress}% — this takes 2-5 minutes.",
        "complete": f"Complete! Best model: {registry.get_best_name()}",
        "error":    "Training failed. Check server logs and retry.",
    }
    return {"status": status, "progress": progress, "best_model": registry.get_best_name(), "message": messages.get(status, "")}

@router.get("/results")
async def get_training_results():
    if not registry.is_loaded():
        raise HTTPException(404, "No results available. Run training first.")
    return {"model_results": registry.get_results(), "best_model": registry.get_best_name(), "comparison_table": registry.build_comparison_table()}

@router.get("/dataset-info")
async def get_dataset_info():
    df = load_or_generate_dataset()
    return {
        "total_records": len(df),
        "features": df.shape[1] - 1,
        "attrition_rate": round(float((df["Attrition"]=="Yes").mean()), 4),
        "departments": df["Department"].value_counts().to_dict(),
        "job_roles":   df["JobRole"].value_counts().to_dict(),
        "age_range":   {"min": int(df["Age"].min()), "max": int(df["Age"].max()), "mean": round(float(df["Age"].mean()),1)},
        "income_range":{"min": int(df["MonthlyIncome"].min()), "max": int(df["MonthlyIncome"].max()), "mean": round(float(df["MonthlyIncome"].mean()),0)},
        "columns": list(df.columns),
    }
