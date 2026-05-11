from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    APP_NAME: str = "Employee Attrition Intelligence System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "*"]
    MODEL_DIR: str = "./models"
    DATA_DIR: str = "./data"
    REPORTS_DIR: str = "./reports"
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Ensure directories exist
for d in [settings.MODEL_DIR, settings.DATA_DIR, settings.REPORTS_DIR]:
    os.makedirs(d, exist_ok=True)
