"""
SHAP-based explainability service.
Provides global and local (per-prediction) feature importance.
"""
import numpy as np
import pandas as pd
import shap
import logging
from typing import Dict, Any, List, Optional
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)


class ShapExplainer:
    """Manages SHAP explainers for multiple models."""

    def __init__(self):
        self.explainers: Dict[str, Any] = {}
        self.shap_values_cache: Dict[str, np.ndarray] = {}

    def build_explainer(self, model, model_name: str, X_background: np.ndarray) -> Any:
        """Build appropriate SHAP explainer for a model."""
        try:
            if model_name in ('XGBoost', 'LightGBM'):
                explainer = shap.TreeExplainer(model)
            elif model_name == 'RandomForest':
                explainer = shap.TreeExplainer(model)
            else:
                # Fallback: kernel explainer with small background
                background = shap.kmeans(X_background, 10)
                explainer = shap.KernelExplainer(model.predict_proba, background)
            
            self.explainers[model_name] = explainer
            return explainer
        except Exception as e:
            logger.error(f"SHAP explainer build error for {model_name}: {e}")
            return None

    def compute_shap_values(
        self,
        model_name: str,
        model,
        X: np.ndarray,
        feature_names: List[str],
        X_background: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """Compute SHAP values for a dataset."""
        if model_name not in self.explainers:
            bg = X_background if X_background is not None else X
            self.build_explainer(model, model_name, bg)
        
        explainer = self.explainers.get(model_name)
        if explainer is None:
            return {}

        try:
            shap_values = explainer.shap_values(X)
            
            # For tree models, shap_values may be list [class0, class1]
            if isinstance(shap_values, list):
                shap_vals = shap_values[1]  # positive class
            else:
                shap_vals = shap_values
            
            # Mean absolute SHAP per feature (global importance)
            mean_shap = np.abs(shap_vals).mean(axis=0)
            sorted_idx = np.argsort(mean_shap)[::-1]
            
            global_importance = [
                {
                    'feature': feature_names[i] if i < len(feature_names) else f'feature_{i}',
                    'mean_abs_shap': float(mean_shap[i])
                }
                for i in sorted_idx[:20]
            ]
            
            self.shap_values_cache[model_name] = shap_vals
            
            return {
                'global_importance': global_importance,
                'shap_values': shap_vals,
                'expected_value': float(explainer.expected_value[1]) if isinstance(explainer.expected_value, np.ndarray) else float(explainer.expected_value)
            }
        except Exception as e:
            logger.error(f"SHAP computation error: {e}")
            return {}

    def explain_single_prediction(
        self,
        model_name: str,
        model,
        X_instance: np.ndarray,
        feature_names: List[str],
        X_background: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """SHAP explanation for a single prediction."""
        if model_name not in self.explainers:
            bg = X_background if X_background is not None else X_instance
            self.build_explainer(model, model_name, bg)
        
        explainer = self.explainers.get(model_name)
        if explainer is None:
            return {}

        try:
            shap_values = explainer.shap_values(X_instance.reshape(1, -1))
            
            if isinstance(shap_values, list):
                sv = shap_values[1][0]
            else:
                sv = shap_values[0]
            
            ev = explainer.expected_value
            if isinstance(ev, (list, np.ndarray)):
                base_value = float(ev[1])
            else:
                base_value = float(ev)
            
            # Build waterfall data
            sorted_idx = np.argsort(np.abs(sv))[::-1][:15]
            
            waterfall = [
                {
                    'feature': feature_names[i] if i < len(feature_names) else f'feature_{i}',
                    'shap_value': float(sv[i]),
                    'feature_value': float(X_instance[i]),
                    'direction': 'increases' if sv[i] > 0 else 'decreases'
                }
                for i in sorted_idx
            ]
            
            return {
                'base_value': base_value,
                'waterfall': waterfall,
                'total_shap_effect': float(sv.sum())
            }
        except Exception as e:
            logger.error(f"Single prediction SHAP error: {e}")
            return {}


# Singleton
_shap_explainer: Optional[ShapExplainer] = None


def get_shap_explainer() -> ShapExplainer:
    global _shap_explainer
    if _shap_explainer is None:
        _shap_explainer = ShapExplainer()
    return _shap_explainer
