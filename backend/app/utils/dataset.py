"""Dataset loader — uses real IBM CSV if present, otherwise a synthetic replica."""
import pandas as pd
import numpy as np
from pathlib import Path

DATA_PATH = Path("data/WA_Fn-UseC_-HR-Employee-Attrition.csv")

def load_or_generate_dataset() -> pd.DataFrame:
    if DATA_PATH.exists():
        return pd.read_csv(DATA_PATH)
    raise FileNotFoundError(
        f"Dataset not found at {DATA_PATH}. "
        "Download WA_Fn-UseC_-HR-Employee-Attrition.csv from "
        "https://www.kaggle.com/datasets/pavansubhasht/ibm-hr-analytics-attrition-dataset "
        "and place it in backend/data/"
    )
