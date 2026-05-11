"""
Employee Attrition Intelligence System — ML Training Pipeline
Train Random Forest, XGBoost, LightGBM with hyperparameter tuning,
5-fold CV, SHAP explainability. Results saved to ./models/
Usage: python train.py
"""
import os, sys, time, json, warnings, logging
warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

import numpy as np
import pandas as pd
from sklearn.model_selection import (train_test_split, StratifiedKFold,
                                     cross_validate, RandomizedSearchCV)
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.metrics import (accuracy_score, f1_score, roc_auc_score,
                             precision_score, recall_score,
                             confusion_matrix, roc_curve)
import xgboost as xgb
import lightgbm as lgb
import joblib, shap

# ── CONFIG ────────────────────────────────────────────────────────────────────
DATA_PATH    = "data/WA_Fn-UseC_-HR-Employee-Attrition.csv"
MODEL_DIR    = "models"
RANDOM_STATE = 42
CV_FOLDS     = 5
N_ITER       = 20
os.makedirs(MODEL_DIR, exist_ok=True)

# ── LOAD DATA ─────────────────────────────────────────────────────────────────
log.info("Loading dataset …")
df = pd.read_csv(DATA_PATH)
log.info(f"  Shape: {df.shape}  |  Attrition: {(df['Attrition']=='Yes').mean():.1%}  |  "
         f"Yes={( df['Attrition']=='Yes').sum()}  No={(df['Attrition']=='No').sum()}")

# ── FEATURE ENGINEERING ───────────────────────────────────────────────────────
DROP = ['EmployeeCount','EmployeeNumber','Over18','StandardHours']
df.drop(columns=[c for c in DROP if c in df.columns], inplace=True)

y = (df.pop('Attrition') == 'Yes').astype(int)

def engineer(df):
    d = df.copy()
    d['TenureRatio']      = d['YearsAtCompany']          / d['TotalWorkingYears'].clip(lower=1)
    d['IncomePerYearExp'] = d['MonthlyIncome']            / d['TotalWorkingYears'].clip(lower=1)
    d['SatisfactionScore']= (d['JobSatisfaction']+d['EnvironmentSatisfaction']+
                              d['RelationshipSatisfaction']+d['WorkLifeBalance']) / 4.0
    d['PromotionLag']     = d['YearsSinceLastPromotion']  / d['YearsAtCompany'].clip(lower=1)
    d['ManagerStability'] = d['YearsWithCurrManager']     / d['YearsAtCompany'].clip(lower=1)
    d['OverTimeFlag']     = (d['OverTime']=='Yes').astype(int)
    d['FreqTraveler']     = (d['BusinessTravel']=='Travel_Frequently').astype(int)
    d['LowIncome']        = (d['MonthlyIncome'] < d['MonthlyIncome'].quantile(0.25)).astype(int)
    d['EarlyCareer']      = (d['TotalWorkingYears'] <= 3).astype(int)
    d['HighDistance']     = (d['DistanceFromHome'] > 15).astype(int)
    d['JobHopper']        = (d['NumCompaniesWorked'] >= 4).astype(int)
    return d

df = engineer(df)

# ── COLUMN LISTS ──────────────────────────────────────────────────────────────
NUM_COLS = ['Age','DailyRate','DistanceFromHome','HourlyRate','MonthlyIncome','MonthlyRate',
            'NumCompaniesWorked','PercentSalaryHike','TotalWorkingYears','TrainingTimesLastYear',
            'YearsAtCompany','YearsInCurrentRole','YearsSinceLastPromotion','YearsWithCurrManager',
            'TenureRatio','IncomePerYearExp','SatisfactionScore','PromotionLag',
            'ManagerStability','OverTimeFlag','FreqTraveler','LowIncome','EarlyCareer',
            'HighDistance','JobHopper']
CAT_COLS = ['BusinessTravel','Department','EducationField','Gender','JobRole','MaritalStatus','OverTime']
ORD_COLS = ['Education','EnvironmentSatisfaction','JobInvolvement','JobLevel',
            'JobSatisfaction','PerformanceRating','RelationshipSatisfaction',
            'StockOptionLevel','WorkLifeBalance']
FEATURE_NAMES = NUM_COLS + CAT_COLS + ORD_COLS

# ── PREPROCESSING PIPELINE ────────────────────────────────────────────────────
preprocessor = ColumnTransformer([
    ('num', Pipeline([('imp',SimpleImputer(strategy='median')),
                      ('sc', StandardScaler())]), NUM_COLS),
    ('cat', Pipeline([('imp',SimpleImputer(strategy='most_frequent')),
                      ('enc',OrdinalEncoder(handle_unknown='use_encoded_value',unknown_value=-1))]), CAT_COLS),
    ('ord', Pipeline([('imp',SimpleImputer(strategy='most_frequent')),
                      ('sc', StandardScaler())]), ORD_COLS),
], remainder='drop')

X_train, X_test, y_train, y_test = train_test_split(
    df, y, test_size=0.20, random_state=RANDOM_STATE, stratify=y)

X_tr = preprocessor.fit_transform(X_train)
X_te = preprocessor.transform(X_test)
joblib.dump(preprocessor,    f"{MODEL_DIR}/preprocessor.joblib")
joblib.dump(FEATURE_NAMES,   f"{MODEL_DIR}/feature_names.joblib")
# Save raw split indices for report export
np.save(f"{MODEL_DIR}/y_test.npy", y_test.values)
log.info(f"  Train {X_tr.shape}  Test {X_te.shape}  "
         f"Train attrition={y_train.mean():.1%}  Test attrition={y_test.mean():.1%}")

# ── MODEL CONFIGS ─────────────────────────────────────────────────────────────
pos_w = (y_train==0).sum() / (y_train==1).sum()

MODELS = {
    'RandomForest': {
        'est': RandomForestClassifier(random_state=RANDOM_STATE, n_jobs=-1, class_weight='balanced'),
        'grid': {
            'n_estimators':      [100,200,300,500],
            'max_depth':         [None,5,10,15,20],
            'min_samples_split': [2,5,10],
            'min_samples_leaf':  [1,2,4],
            'max_features':      ['sqrt','log2',0.5],
            'bootstrap':         [True,False],
        }
    },
    'XGBoost': {
        'est': xgb.XGBClassifier(random_state=RANDOM_STATE, eval_metric='logloss',
                                  verbosity=0, scale_pos_weight=pos_w, n_jobs=-1),
        'grid': {
            'n_estimators':    [100,200,300,500],
            'max_depth':       [3,5,7,9],
            'learning_rate':   [0.01,0.05,0.1,0.2],
            'subsample':       [0.6,0.8,1.0],
            'colsample_bytree':[0.6,0.8,1.0],
            'min_child_weight':[1,3,5],
            'gamma':           [0,0.1,0.2,0.5],
            'reg_alpha':       [0,0.01,0.1],
            'reg_lambda':      [1,1.5,2.0],
        }
    },
    'LightGBM': {
        'est': lgb.LGBMClassifier(random_state=RANDOM_STATE, verbose=-1, class_weight='balanced', n_jobs=-1),
        'grid': {
            'n_estimators':     [100,200,300,500],
            'max_depth':        [-1,5,10,15],
            'learning_rate':    [0.01,0.05,0.1,0.2],
            'num_leaves':       [15,31,63,127],
            'subsample':        [0.6,0.8,1.0],
            'colsample_bytree': [0.6,0.8,1.0],
            'min_child_samples':[10,20,50],
            'reg_alpha':        [0,0.01,0.1],
            'reg_lambda':       [0,0.01,0.1],
        }
    },
}

# ── TRAIN ALL MODELS ──────────────────────────────────────────────────────────
cv5  = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
cv3  = StratifiedKFold(n_splits=3, shuffle=True, random_state=RANDOM_STATE)

all_results   = {}
trained_models = {}

for name, cfg in MODELS.items():
    log.info(f"\n{'─'*55}")
    log.info(f"  ▶  {name}")
    t0 = time.time()

    # RandomizedSearchCV
    search = RandomizedSearchCV(cfg['est'], cfg['grid'], n_iter=N_ITER,
                                scoring='roc_auc', cv=cv3,
                                random_state=RANDOM_STATE, n_jobs=-1, verbose=0)
    search.fit(X_tr, y_train)
    best = search.best_estimator_
    log.info(f"     best CV AUC={search.best_score_:.4f}")
    log.info(f"     params={search.best_params_}")

    # Full 5-fold CV metrics
    cv_res = cross_validate(best, X_tr, y_train, cv=cv5,
                            scoring=['accuracy','f1','roc_auc','precision','recall'],
                            return_train_score=True, n_jobs=-1)

    # Re-fit on full train then evaluate test
    best.fit(X_tr, y_train)
    y_pred  = best.predict(X_te)
    y_prob  = best.predict_proba(X_te)[:,1]

    tn,fp,fn,tp = confusion_matrix(y_test, y_pred).ravel()
    fpr,tpr,thresh = roc_curve(y_test, y_prob)

    auc = roc_auc_score(y_test, y_prob)
    f1  = f1_score(y_test, y_pred, zero_division=0)
    acc = accuracy_score(y_test, y_pred)
    elapsed = round(time.time()-t0, 2)
    log.info(f"     Test → AUC={auc:.4f}  F1={f1:.4f}  Acc={acc:.4f}  [{elapsed}s]")

    # Feature importance
    fi = []
    if hasattr(best,'feature_importances_'):
        idx = np.argsort(best.feature_importances_)[::-1][:25]
        fi  = [{'feature': FEATURE_NAMES[i], 'importance': float(best.feature_importances_[i])} for i in idx]

    all_results[name] = {
        'test_metrics': {
            'accuracy':     float(acc),
            'f1_score':     float(f1),
            'roc_auc':      float(auc),
            'precision':    float(precision_score(y_test,y_pred,zero_division=0)),
            'recall':       float(recall_score(y_test,y_pred,zero_division=0)),
            'specificity':  float(tn/(tn+fp)) if (tn+fp)>0 else 0.0,
            'confusion_matrix': [[int(tn),int(fp)],[int(fn),int(tp)]],
            'roc_curve': {'fpr':fpr.tolist(),'tpr':tpr.tolist(),'thresholds':thresh.tolist()},
        },
        'cv_metrics': {
            'cv_accuracy_mean':  float(cv_res['test_accuracy'].mean()),
            'cv_accuracy_std':   float(cv_res['test_accuracy'].std()),
            'cv_f1_mean':        float(cv_res['test_f1'].mean()),
            'cv_f1_std':         float(cv_res['test_f1'].std()),
            'cv_roc_auc_mean':   float(cv_res['test_roc_auc'].mean()),
            'cv_roc_auc_std':    float(cv_res['test_roc_auc'].std()),
            'cv_precision_mean': float(cv_res['test_precision'].mean()),
            'cv_recall_mean':    float(cv_res['test_recall'].mean()),
            'cv_train_f1_mean':  float(cv_res['train_f1'].mean()),
        },
        'tune_info': {
            'best_params':   {k: (v.item() if isinstance(v,np.generic) else v)
                              for k,v in search.best_params_.items()},
            'best_cv_score': float(search.best_score_),
        },
        'feature_importance':     fi,
        'training_time_seconds':  elapsed,
    }
    trained_models[name] = best
    joblib.dump(best, f"{MODEL_DIR}/{name.lower()}.joblib")

# Save test set predictions for reports
preds_out = {}
for name, model in trained_models.items():
    prob = model.predict_proba(X_te)[:,1]
    preds_out[name] = prob.tolist()
with open(f"{MODEL_DIR}/test_predictions.json","w") as f:
    json.dump(preds_out, f)

# ── SELECT BEST MODEL ─────────────────────────────────────────────────────────
scores   = {n: 0.6*r['test_metrics']['roc_auc'] + 0.4*r['test_metrics']['f1_score']
            for n,r in all_results.items()}
best_name = max(scores, key=scores.get)
log.info(f"\n{'═'*55}")
log.info(f"  ★  BEST MODEL: {best_name}  (composite={scores[best_name]:.4f})")
for n,s in sorted(scores.items(), key=lambda x:-x[1]):
    m = all_results[n]['test_metrics']
    log.info(f"     {n:15s}  AUC={m['roc_auc']:.4f}  F1={m['f1_score']:.4f}  Acc={m['accuracy']:.4f}")

# ── SHAP EXPLAINABILITY ───────────────────────────────────────────────────────
log.info("\nComputing SHAP values …")
shap_results = {}
for name, model in trained_models.items():
    try:
        exp  = shap.TreeExplainer(model)
        sv   = exp.shap_values(X_te[:150])
        # For multi-output / binary classifiers get positive class
        if isinstance(sv, list) and len(sv) == 2:
            sv_pos = sv[1]
        elif isinstance(sv, np.ndarray) and sv.ndim == 3:
            sv_pos = sv[:,:,1]
        else:
            sv_pos = sv
        mean_shap = np.abs(sv_pos).mean(axis=0)
        idx_top   = np.argsort(mean_shap)[::-1][:25]
        ev = exp.expected_value
        if isinstance(ev, (list,np.ndarray)):
            ev = float(ev[1])
        shap_results[name] = {
            'global_importance': [
                {'feature': FEATURE_NAMES[i], 'mean_abs_shap': float(mean_shap[i])}
                for i in idx_top
            ],
            'expected_value': float(ev)
        }
        log.info(f"  ✓ {name}")
    except Exception as e:
        log.warning(f"  ✗ {name}: {e}")
        shap_results[name] = {'global_importance':[], 'expected_value':0.0}

# ── PERSIST ALL RESULTS ───────────────────────────────────────────────────────
def default(o):
    if isinstance(o, np.generic): return o.item()
    raise TypeError(f"Not serializable: {type(o)}")

payload = {
    'best_model':   best_name,
    'results':      all_results,
    'shap':         shap_results,
    'feature_names': FEATURE_NAMES,
    'dataset_info': {
        'n_samples':              len(df),
        'attrition_rate':         float(y.mean()),
        'n_features_raw':         35,
        'n_features_engineered':  len(FEATURE_NAMES),
        'train_size':             int(len(X_tr)),
        'test_size':              int(len(X_te)),
    }
}
with open(f"{MODEL_DIR}/training_results.json","w") as f:
    json.dump(payload, f, default=default, indent=2)

log.info(f"\n✓ Models  → ./{MODEL_DIR}/randomforest.joblib  xgboost.joblib  lightgbm.joblib")
log.info(f"✓ Pipeline → ./{MODEL_DIR}/preprocessor.joblib")
log.info(f"✓ Results  → ./{MODEL_DIR}/training_results.json")
log.info(f"✓ Done!")
