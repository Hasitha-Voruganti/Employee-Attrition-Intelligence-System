"""Reports / export endpoints."""
import io, json, csv, logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.services import registry
from app.services.eda import compute_eda
from app.utils.dataset import load_or_generate_dataset
import numpy as np

router = APIRouter(prefix="/reports", tags=["Reports"])
log    = logging.getLogger(__name__)

def _risk(p):
    if p<.3: return "Low"
    if p<.6: return "Medium"
    if p<.8: return "High"
    return "Critical"

def _csv_response(rows, filename):
    if not rows: raise HTTPException(404, "No data.")
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=rows[0].keys())
    w.writeheader(); w.writerows(rows)
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename={filename}"})

@router.get("/model-comparison/csv")
async def model_comparison_csv():
    if not registry.is_loaded(): raise HTTPException(404, "No results.")
    rows = registry.build_comparison_table()
    return _csv_response(rows, f"model_comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")

@router.get("/model-comparison/json")
async def model_comparison_json():
    if not registry.is_loaded(): raise HTTPException(404, "No results.")
    payload = {"generated_at": datetime.now().isoformat(), "best_model": registry.get_best_name(), "comparison_table": registry.build_comparison_table()}
    content = json.dumps(payload, indent=2, default=str)
    fn = f"model_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    return StreamingResponse(iter([content]), media_type="application/json",
                             headers={"Content-Disposition": f"attachment; filename={fn}"})

@router.get("/eda-summary/csv")
async def eda_summary_csv():
    df = load_or_generate_dataset()
    eda = compute_eda(df)
    rows = [{"metric": k, "value": v} for k,v in eda.get("summary",{}).items()]
    for d in eda.get("department_attrition",[]):
        rows.append({"metric": f"dept_{d['department']}_attrition", "value": d["attrition_rate"]})
    return _csv_response(rows, f"eda_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")

@router.get("/predictions-sample/csv")
async def predictions_csv():
    if not registry.is_loaded(): raise HTTPException(404, "No model.")
    try:
        with open("models/test_predictions.json") as f:
            preds = json.load(f)
        y_test = np.load("models/y_test.npy")
        best   = registry.get_best_name()
        probs  = preds[best]
        rows   = [{"index":i,"actual":int(y_test[i]),"predicted":int(probs[i]>=.5),
                   "prob_attrition":round(probs[i],4),"risk_level":_risk(probs[i]),
                   "correct":int(y_test[i])==int(probs[i]>=.5)}
                  for i in range(len(y_test))]
        return _csv_response(rows, f"predictions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
    except Exception as e:
        raise HTTPException(500, str(e))
