# 🧠 Employee Attrition Intelligence System

> A production-grade, end-to-end ML platform for predicting and analysing employee attrition — built with **FastAPI**, **Scikit-learn**, **XGBoost**, **LightGBM**, **SHAP**, and **React + Tailwind CSS**.

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?logo=fastapi)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

---

## 📸 Features

| Feature | Detail |
|---------|--------|
| **Multi-Model Training** | Random Forest · XGBoost · LightGBM with RandomizedSearchCV hyperparameter tuning |
| **Cross-Validation** | 5-fold Stratified CV with per-fold accuracy, F1, ROC-AUC, precision & recall |
| **Auto Model Selection** | Best model chosen by composite score: `0.6 × AUC + 0.4 × F1` |
| **SHAP Explainability** | Global feature importance + per-employee waterfall chart via TreeExplainer |
| **Feature Engineering** | 11 derived features (TenureRatio, SatisfactionScore, PromotionLag, …) |
| **EDA Analytics** | Attrition breakdowns by department, role, age, income, satisfaction, travel, tenure |
| **Prediction API** | Single-employee & batch prediction with risk levels and HR recommendations |
| **Downloadable Reports** | CSV/JSON exports for model comparison, EDA summary, test set predictions |
| **Modern Dashboard** | React + Recharts — responsive, light-themed, with gauge meter and analytics charts |
| **Modular Architecture** | Clean layered FastAPI → services → registry → joblib artefacts |

---

## 🗂 Project Structure

```
attrition-intelligence/
├── backend/
│   ├── train.py                    # ← Run this first! Standalone training script
│   ├── main.py                     # FastAPI application entry point
│   ├── requirements.txt
│   ├── .env
│   ├── data/
│   │   └── WA_Fn-UseC_-HR-Employee-Attrition.csv   # ← place real dataset here
│   ├── models/                     # Auto-created by train.py
│   │   ├── randomforest.joblib
│   │   ├── xgboost.joblib
│   │   ├── lightgbm.joblib
│   │   ├── preprocessor.joblib
│   │   ├── feature_names.joblib
│   │   ├── training_results.json
│   │   ├── test_predictions.json
│   │   └── y_test.npy
│   └── app/
│       ├── api/
│       │   ├── training.py         # Training status + dataset info
│       │   ├── prediction.py       # Single & batch prediction
│       │   ├── analytics.py        # EDA, SHAP, feature importance
│       │   └── reports.py          # CSV/JSON report downloads
│       ├── services/
│       │   ├── registry.py         # Model registry (loads from disk)
│       │   └── eda.py              # EDA computation service
│       ├── models/
│       │   └── schemas.py          # Pydantic request/response models
│       └── utils/
│           └── dataset.py          # Dataset loader
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── shared/             # Sidebar, UIComponents
    │   │   ├── dashboard/          # Overview, Training, ModelComparison,
    │   │   │                       # EDAAnalytics, Explainability, Reports
    │   │   └── prediction/         # PredictAttrition (with gauge meter)
    │   ├── services/api.js         # Axios API layer
    │   └── utils/helpers.js        # Formatters, colour helpers
    ├── package.json
    └── tailwind.config.js
```

---

## 🚀 Quick Start

### 1. Get the Dataset

Download the **IBM HR Analytics Attrition** dataset from Kaggle:

```
https://www.kaggle.com/datasets/pavansubhasht/ibm-hr-analytics-attrition-dataset
```

Extract and place the CSV at:
```
backend/data/WA_Fn-UseC_-HR-Employee-Attrition.csv
```

> **Note:** The system ships with a faithful synthetic replica for development. Replace it with the real CSV for production-quality metrics (expect AUC ≈ 0.85+).

---

### 2. Backend Setup

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Train all models (takes ~3-5 min with tuning)
python train.py

# Start the API server
uvicorn main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/api/docs**

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

---

## 🤖 ML Pipeline

```
Raw CSV (35 cols)
    ↓
Drop constants (EmployeeCount, Over18, StandardHours, EmployeeNumber)
    ↓
Feature Engineering (+11 derived features = 41 total)
    ↓
ColumnTransformer
    ├── Numeric  → SimpleImputer(median) → StandardScaler
    ├── Categorical → SimpleImputer(most_frequent) → OrdinalEncoder
    └── Ordinal  → SimpleImputer(most_frequent) → StandardScaler
    ↓
RandomizedSearchCV (n_iter=20, 3-fold CV, scoring=roc_auc)
    ├── RandomForestClassifier  (class_weight='balanced')
    ├── XGBClassifier           (scale_pos_weight=pos/neg ratio)
    └── LGBMClassifier          (class_weight='balanced')
    ↓
5-Fold Stratified CV → final test evaluation
    ↓
Best model = argmax(0.6×AUC + 0.4×F1)
    ↓
SHAP TreeExplainer → global & local feature attributions
    ↓
Serialise: joblib + JSON → models/
```

---

## 📊 Engineered Features

| Feature | Formula |
|---------|---------|
| `TenureRatio` | `YearsAtCompany / TotalWorkingYears` |
| `IncomePerYearExp` | `MonthlyIncome / TotalWorkingYears` |
| `SatisfactionScore` | Mean of 4 satisfaction survey scores |
| `PromotionLag` | `YearsSinceLastPromotion / YearsAtCompany` |
| `ManagerStability` | `YearsWithCurrManager / YearsAtCompany` |
| `OverTimeFlag` | Binary: OverTime == Yes |
| `FreqTraveler` | Binary: BusinessTravel == Travel_Frequently |
| `LowIncome` | Binary: MonthlyIncome < 25th percentile |
| `EarlyCareer` | Binary: TotalWorkingYears ≤ 3 |
| `HighDistance` | Binary: DistanceFromHome > 15 |
| `JobHopper` | Binary: NumCompaniesWorked ≥ 4 |

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/health` | System health + model status |
| `POST` | `/api/training/start` | Trigger training (runs train.py) |
| `GET`  | `/api/training/status` | Training progress |
| `GET`  | `/api/training/results` | Comparison table |
| `GET`  | `/api/training/dataset-info` | Dataset statistics |
| `POST` | `/api/predict/single` | Single-employee risk prediction |
| `POST` | `/api/predict/batch` | Batch prediction (≤200) |
| `GET`  | `/api/analytics/eda` | Full EDA data for charts |
| `GET`  | `/api/analytics/model-metrics` | Model metrics + confusion matrices |
| `GET`  | `/api/analytics/feature-importance` | Tree feature importances |
| `GET`  | `/api/analytics/shap-summary` | SHAP global importances |
| `GET`  | `/api/analytics/correlation` | Feature correlation matrix |
| `GET`  | `/api/reports/model-comparison/csv` | Download comparison CSV |
| `GET`  | `/api/reports/model-comparison/json` | Download full results JSON |
| `GET`  | `/api/reports/eda-summary/csv` | Download EDA summary CSV |
| `GET`  | `/api/reports/predictions-sample/csv` | Download test predictions CSV |

---

## 🛠 Tech Stack

**Backend**
- Python 3.10+ · FastAPI · Uvicorn · Pydantic v2
- Scikit-learn · XGBoost · LightGBM · SHAP
- Pandas · NumPy · Joblib

**Frontend**
- React 18 · Vite · React Router v6
- Tailwind CSS v3 · Recharts · Axios
- Lucide React icons · DM Sans / DM Serif Display fonts

---

## 📝 Notes

- **Real dataset:** With the actual IBM CSV, expect AUC ≈ 0.83–0.87 after tuning
- **Imbalance:** ~16% attrition rate handled via `class_weight='balanced'` and `scale_pos_weight`
- **SHAP:** TreeExplainer uses exact Shapley values — no sampling required for tree models
- **Retrain:** Simply drop a new CSV at `data/WA_Fn-UseC_-HR-Employee-Attrition.csv` and re-run `train.py`

---

## 📄 License

MIT © 2025 — Built for ML engineering portfolio demonstration.
