"""Employee Attrition Intelligence System — FastAPI app."""
import logging, time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import training, prediction, analytics, reports
from app.services import registry

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting Employee Attrition Intelligence System …")
    loaded = registry.load_models()
    if loaded:
        log.info(f"Pre-trained models loaded. Best: {registry.get_best_name()}")
    else:
        log.info("No pre-trained models found. Run train.py first.")
    yield
    log.info("Shutdown.")

app = FastAPI(
    title="Employee Attrition Intelligence System",
    version="1.0.0",
    description="Production ML platform for HR attrition prediction",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def timing(request: Request, call_next):
    t0 = time.time()
    resp = await call_next(request)
    resp.headers["X-Process-Time"] = str(round(time.time() - t0, 4))
    return resp

app.include_router(training.router,   prefix="/api")
app.include_router(prediction.router, prefix="/api")
app.include_router(analytics.router,  prefix="/api")
app.include_router(reports.router,    prefix="/api")

@app.get("/", tags=["Health"])
async def root():
    return {"name": "Employee Attrition Intelligence System", "version": "1.0.0",
            "status": "operational", "docs": "/api/docs"}

@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "healthy", "model_status": registry.get_status(),
            "best_model": registry.get_best_name(),
            "models_loaded": list(registry.get_all_models().keys())}

@app.exception_handler(Exception)
async def global_exc(req: Request, exc: Exception):
    log.error(f"Unhandled: {exc}", exc_info=True)
    # FIXED: status_code and content must be keyword args
    return JSONResponse(status_code=500, content={"detail": "Internal server error", "error": str(exc)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
