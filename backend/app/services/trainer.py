"""
ML Training Service: Random Forest, XGBoost, LightGBM
Includes hyperparameter tuning, cross-validation, and model comparison.
"""
import numpy as np
import pandas as pd
import json
import logging
import joblib
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_validate, RandomizedSearchCV
from sklearn.metrics import (
    accuracy_score, f1_score, roc_auc_score, precision_score, recall_score,
    confusion_matrix, roc_curve, classification_report
)
import xgboost as xgb
import lightgbm as lgb

from app.core.config import settings

logger = logging.getLogger(__name__)

CV_FOLDS = 5
N_ITER_SEARCH = 20
RANDOM_STATE = 42


def get_model_configs() -> Dict[str, Dict]:
    """Define model hyperparameter search spaces."""
    return {
        'RandomForest': {
            'model': RandomForestClassifier(random_state=RANDOM_STATE, n_jobs=-1, class_weight='balanced'),
            'param_grid': {
                'n_estimators': [100, 200, 300],
                'max_depth': [None, 5, 10, 15],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4],
                'max_features': ['sqrt', 'log2'],
                'bootstrap': [True, False],
            }
        },
        'XGBoost': {
            'model': xgb.XGBClassifier(
                random_state=RANDOM_STATE, eval_metric='logloss',
                use_label_encoder=False, verbosity=0,
                scale_pos_weight=5
            ),
            'param_grid': {
                'n_estimators': [100, 200, 300],
                'max_depth': [3, 5, 7, 9],
                'learning_rate': [0.01, 0.05, 0.1, 0.2],
                'subsample': [0.6, 0.8, 1.0],
                'colsample_bytree': [0.6, 0.8, 1.0],
                'min_child_weight': [1, 3, 5],
                'gamma': [0, 0.1, 0.2],
            }
        },
        'LightGBM': {
            'model': lgb.LGBMClassifier(
                random_state=RANDOM_STATE, verbose=-1,
                class_weight='balanced'
            ),
            'param_grid': {
                'n_estimators': [100, 200, 300],
                'max_depth': [-1, 5, 10, 15],
                'learning_rate': [0.01, 0.05, 0.1, 0.2],
                'num_leaves': [15, 31, 63],
                'subsample': [0.6, 0.8, 1.0],
                'colsample_bytree': [0.6, 0.8, 1.0],
                'min_child_samples': [10, 20, 50],
                'reg_alpha': [0, 0.01, 0.1],
                'reg_lambda': [0, 0.01, 0.1],
            }
        }
    }


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray) -> Dict[str, float]:
    """Compute comprehensive classification metrics."""
    fpr, tpr, thresholds = roc_curve(y_true, y_proba)
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()

    return {
        'accuracy': float(accuracy_score(y_true, y_pred)),
        'f1_score': float(f1_score(y_true, y_pred, zero_division=0)),
        'roc_auc': float(roc_auc_score(y_true, y_proba)),
        'precision': float(precision_score(y_true, y_pred, zero_division=0)),
        'recall': float(recall_score(y_true, y_pred, zero_division=0)),
        'specificity': float(tn / (tn + fp)) if (tn + fp) > 0 else 0,
        'confusion_matrix': cm.tolist(),
        'roc_curve': {
            'fpr': fpr.tolist(),
            'tpr': tpr.tolist(),
            'thresholds': thresholds.tolist()
        }
    }


def train_with_cv(
    model,
    X_train: np.ndarray,
    y_train: np.ndarray,
    model_name: str
) -> Dict[str, Any]:
    """Train model with cross-validation."""
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    
    cv_results = cross_validate(
        model, X_train, y_train, cv=cv,
        scoring=['accuracy', 'f1', 'roc_auc', 'precision', 'recall'],
        return_train_score=True, n_jobs=-1
    )
    
    return {
        'cv_accuracy_mean': float(cv_results['test_accuracy'].mean()),
        'cv_accuracy_std': float(cv_results['test_accuracy'].std()),
        'cv_f1_mean': float(cv_results['test_f1'].mean()),
        'cv_f1_std': float(cv_results['test_f1'].std()),
        'cv_roc_auc_mean': float(cv_results['test_roc_auc'].mean()),
        'cv_roc_auc_std': float(cv_results['test_roc_auc'].std()),
        'cv_precision_mean': float(cv_results['test_precision'].mean()),
        'cv_recall_mean': float(cv_results['test_recall'].mean()),
        'cv_train_accuracy_mean': float(cv_results['train_accuracy'].mean()),
        'cv_train_f1_mean': float(cv_results['train_f1'].mean()),
    }


def tune_hyperparameters(
    model_config: Dict,
    X_train: np.ndarray,
    y_train: np.ndarray,
    model_name: str
) -> Tuple[Any, Dict]:
    """Randomized hyperparameter search."""
    logger.info(f"Tuning hyperparameters for {model_name}...")
    
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=RANDOM_STATE)
    
    search = RandomizedSearchCV(
        model_config['model'],
        param_distributions=model_config['param_grid'],
        n_iter=N_ITER_SEARCH,
        scoring='roc_auc',
        cv=cv,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        verbose=0
    )
    
    search.fit(X_train, y_train)
    
    return search.best_estimator_, {
        'best_params': search.best_params_,
        'best_cv_score': float(search.best_score_)
    }


def get_feature_importance(model, feature_names: List[str], top_n: int = 20) -> List[Dict]:
    """Extract feature importances from fitted model."""
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
        indices = np.argsort(importances)[::-1][:top_n]
        return [
            {
                'feature': feature_names[i] if i < len(feature_names) else f'feature_{i}',
                'importance': float(importances[i])
            }
            for i in indices
        ]
    return []


class ModelTrainer:
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.results: Dict[str, Any] = {}
        self.best_model_name: Optional[str] = None
        self.best_model = None
        self.training_status = "idle"
        self.training_progress = 0

    def train_all_models(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_test: np.ndarray,
        y_test: np.ndarray,
        feature_names: List[str],
        tune: bool = True
    ) -> Dict[str, Any]:
        """Train all three models and compare performance."""
        self.training_status = "training"
        model_configs = get_model_configs()
        all_results = {}
        total = len(model_configs)
        
        for idx, (model_name, config) in enumerate(model_configs.items()):
            self.training_progress = int((idx / total) * 90)
            logger.info(f"Training {model_name}... ({idx+1}/{total})")
            start_time = time.time()
            
            try:
                if tune:
                    model, tune_info = tune_hyperparameters(config, X_train, y_train, model_name)
                else:
                    model = config['model']
                    model.fit(X_train, y_train)
                    tune_info = {'best_params': {}, 'best_cv_score': 0}
                
                # CV metrics
                cv_metrics = train_with_cv(model, X_train, y_train, model_name)
                
                # Final fit & test evaluation
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
                y_proba = model.predict_proba(X_test)[:, 1]
                
                test_metrics = compute_metrics(y_test, y_pred, y_proba)
                feature_imp = get_feature_importance(model, feature_names)
                
                training_time = time.time() - start_time
                
                all_results[model_name] = {
                    'test_metrics': test_metrics,
                    'cv_metrics': cv_metrics,
                    'tune_info': tune_info,
                    'feature_importance': feature_imp,
                    'training_time_seconds': round(training_time, 2)
                }
                
                self.models[model_name] = model
                logger.info(f"{model_name} - AUC: {test_metrics['roc_auc']:.4f}, F1: {test_metrics['f1_score']:.4f}")
                
            except Exception as e:
                logger.error(f"Error training {model_name}: {e}")
                all_results[model_name] = {'error': str(e)}
        
        # Select best model by ROC-AUC
        self.best_model_name = self._select_best_model(all_results)
        self.best_model = self.models.get(self.best_model_name)
        self.results = all_results
        self.training_progress = 100
        self.training_status = "complete"
        
        # Save models
        self._save_models()
        
        return {
            'model_results': all_results,
            'best_model': self.best_model_name,
            'comparison_table': self._build_comparison_table(all_results)
        }

    def _select_best_model(self, results: Dict) -> str:
        """Select best model based on composite score (AUC + F1)."""
        best_name = None
        best_score = -1
        
        for name, res in results.items():
            if 'error' in res:
                continue
            metrics = res['test_metrics']
            # Weighted composite: 60% AUC + 40% F1
            score = 0.6 * metrics['roc_auc'] + 0.4 * metrics['f1_score']
            if score > best_score:
                best_score = score
                best_name = name
        
        return best_name

    def _build_comparison_table(self, results: Dict) -> List[Dict]:
        """Build model comparison table."""
        rows = []
        for name, res in results.items():
            if 'error' in res:
                continue
            m = res['test_metrics']
            cv = res['cv_metrics']
            rows.append({
                'model': name,
                'accuracy': round(m['accuracy'], 4),
                'f1_score': round(m['f1_score'], 4),
                'roc_auc': round(m['roc_auc'], 4),
                'precision': round(m['precision'], 4),
                'recall': round(m['recall'], 4),
                'specificity': round(m['specificity'], 4),
                'cv_roc_auc_mean': round(cv['cv_roc_auc_mean'], 4),
                'cv_roc_auc_std': round(cv['cv_roc_auc_std'], 4),
                'cv_f1_mean': round(cv['cv_f1_mean'], 4),
                'training_time': res['training_time_seconds'],
                'is_best': name == self.best_model_name
            })
        return sorted(rows, key=lambda x: x['roc_auc'], reverse=True)

    def _save_models(self):
        """Persist trained models to disk."""
        model_dir = Path(settings.MODEL_DIR)
        model_dir.mkdir(parents=True, exist_ok=True)
        
        for name, model in self.models.items():
            path = model_dir / f"{name.lower().replace(' ', '_')}.joblib"
            joblib.dump(model, path)
            logger.info(f"Saved {name} to {path}")
        
        # Save results metadata
        results_path = model_dir / "training_results.json"
        
        def _serialize(obj):
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            if isinstance(obj, (np.int64, np.int32)):
                return int(obj)
            if isinstance(obj, (np.float64, np.float32)):
                return float(obj)
            raise TypeError(f"Not serializable: {type(obj)}")
        
        with open(results_path, 'w') as f:
            json.dump({
                'best_model': self.best_model_name,
                'results': self.results
            }, f, default=_serialize, indent=2)

    def load_models(self) -> bool:
        """Load pre-trained models from disk."""
        model_dir = Path(settings.MODEL_DIR)
        for name in ['RandomForest', 'XGBoost', 'LightGBM']:
            path = model_dir / f"{name.lower().replace(' ', '_')}.joblib"
            if path.exists():
                self.models[name] = joblib.load(path)
        
        results_path = model_dir / "training_results.json"
        if results_path.exists():
            with open(results_path) as f:
                data = json.load(f)
                self.best_model_name = data.get('best_model')
                self.results = data.get('results', {})
                self.best_model = self.models.get(self.best_model_name)
                self.training_status = "complete"
                return True
        return False


# Singleton trainer instance
_trainer: Optional[ModelTrainer] = None


def get_trainer() -> ModelTrainer:
    global _trainer
    if _trainer is None:
        _trainer = ModelTrainer()
    return _trainer
