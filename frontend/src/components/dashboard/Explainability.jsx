import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';
import { Brain, Info } from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import { Card, SectionHeader, LoadingCard, ErrorCard, TabBar, Alert } from '../shared/UIComponents';

const MODEL_OPTIONS = ['RandomForest', 'XGBoost', 'LightGBM'];
const MODEL_COLORS = { RandomForest: '#10b981', XGBoost: '#4F6BF5', LightGBM: '#f59e0b' };

function FeatureImportanceChart({ data, modelName, type }) {
  const top = data.slice(0, 20);
  const max = Math.max(...top.map(d => d.importance ?? d.mean_abs_shap ?? 0));
  return (
    <div className="space-y-2 mt-2">
      {top.map((d, i) => {
        const val = d.importance ?? d.mean_abs_shap ?? 0;
        const pct = max > 0 ? (val / max) * 100 : 0;
        const feature = d.feature || d.name;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-6 text-right flex-shrink-0">{i + 1}</span>
            <span className="text-xs text-slate-700 w-40 flex-shrink-0 truncate" title={feature}>
              {feature.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: MODEL_COLORS[modelName] || '#4F6BF5' }}
              />
            </div>
            <span className="text-xs font-mono text-slate-500 w-16 text-right">
              {val.toFixed(type === 'shap' ? 4 : 4)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Explainability() {
  const [selectedModel, setSelectedModel] = useState('XGBoost');
  const [tab, setTab] = useState('feature_importance');
  const [featureImp, setFeatureImp] = useState({});
  const [shapData, setShapData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async (model) => {
    setLoading(true);
    setError(null);
    try {
      const [fi, shap] = await Promise.all([
        analyticsAPI.getFeatureImportance(model),
        analyticsAPI.getShapSummary(model),
      ]);
      setFeatureImp(prev => ({ ...prev, [model]: fi.feature_importance || [] }));
      setShapData(prev => ({ ...prev, [model]: shap.global_importance || [] }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(selectedModel); }, [selectedModel]);

  const currentFI = featureImp[selectedModel] || [];
  const currentShap = shapData[selectedModel] || [];

  // Bar chart data for comparison
  const barData = currentFI.slice(0, 15).map(d => ({
    feature: d.feature.length > 18 ? d.feature.slice(0, 18) + '…' : d.feature,
    importance: +(d.importance).toFixed(4),
    shap: +(currentShap.find(s => s.feature === d.feature)?.mean_abs_shap || 0).toFixed(4),
  }));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <SectionHeader
        title="Model Explainability"
        subtitle="SHAP values and feature importance for transparent AI decision-making"
      />

      {/* Model selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500 font-medium">Model:</span>
        <div className="flex gap-2">
          {MODEL_OPTIONS.map(m => (
            <button key={m} onClick={() => setSelectedModel(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                selectedModel === m
                  ? 'text-white border-transparent'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              style={selectedModel === m ? { background: MODEL_COLORS[m], borderColor: MODEL_COLORS[m] } : {}}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* SHAP explainer info */}
      <Alert type="info">
        <div>
          <strong>About SHAP (SHapley Additive exPlanations)</strong>
          <p className="mt-1 text-xs">SHAP assigns each feature a contribution value for a specific prediction. Positive SHAP values push prediction toward attrition; negative values push away. Tree-based SHAP is exact and computationally efficient.</p>
        </div>
      </Alert>

      <TabBar
        tabs={[
          { value: 'feature_importance', label: 'Feature Importance' },
          { value: 'shap_global', label: 'SHAP Global' },
          { value: 'comparison', label: 'Side-by-Side' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <LoadingCard message={`Computing SHAP values for ${selectedModel}...`} />
      ) : error ? (
        <ErrorCard message={error} onRetry={() => loadData(selectedModel)} />
      ) : (
        <>
          {/* Feature Importance Tab */}
          {tab === 'feature_importance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <h3 className="font-semibold text-slate-700 mb-1">Tree Feature Importance</h3>
                <p className="text-xs text-slate-400 mb-4">Mean decrease in impurity (MDI) — built-in to the model</p>
                {currentFI.length > 0 ? (
                  <>
                    <FeatureImportanceChart data={currentFI} modelName={selectedModel} type="fi" />
                    <div className="mt-4 text-xs text-slate-400 border-t border-slate-50 pt-3">
                      Showing top {Math.min(20, currentFI.length)} of {currentFI.length} features · Higher = more important
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">No data available. Run training first.</p>
                )}
              </Card>

              <Card>
                <h3 className="font-semibold text-slate-700 mb-1">Top Features Bar Chart</h3>
                <p className="text-xs text-slate-400 mb-4">Visual comparison of top 15 features</p>
                {currentFI.length > 0 && (
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={currentFI.slice(0, 12).map(d => ({ feature: d.feature.slice(0, 16), val: +d.importance.toFixed(4) }))} layout="vertical" barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="feature" width={120} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={v => [v.toFixed(4), 'Importance']} />
                      <Bar dataKey="val" radius={[0, 4, 4, 0]}>
                        {currentFI.slice(0, 12).map((_, i) => (
                          <Cell key={i} fill={MODEL_COLORS[selectedModel] || '#4F6BF5'} opacity={1 - i * 0.04} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          )}

          {/* SHAP Global Tab */}
          {tab === 'shap_global' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <h3 className="font-semibold text-slate-700 mb-1">SHAP Global Feature Importance</h3>
                <p className="text-xs text-slate-400 mb-4">Mean |SHAP| value across all test samples</p>
                {currentShap.length > 0 ? (
                  <FeatureImportanceChart data={currentShap} modelName={selectedModel} type="shap" />
                ) : (
                  <p className="text-sm text-slate-400">SHAP values not computed yet.</p>
                )}
              </Card>

              <Card>
                <h3 className="font-semibold text-slate-700 mb-1">SHAP Importance Chart</h3>
                <p className="text-xs text-slate-400 mb-4">Magnitude of average impact on model output</p>
                {currentShap.length > 0 && (
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={currentShap.slice(0, 12).map(d => ({ feature: d.feature.slice(0, 16), val: +d.mean_abs_shap.toFixed(4) }))} layout="vertical" barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="feature" width={120} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={v => [v.toFixed(4), 'Mean |SHAP|']} />
                      <Bar dataKey="val" fill="#7c3aed" radius={[0, 4, 4, 0]}>
                        {currentShap.slice(0, 12).map((_, i) => (
                          <Cell key={i} fill="#7c3aed" opacity={1 - i * 0.04} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          )}

          {/* Comparison Tab */}
          {tab === 'comparison' && (
            <Card>
              <h3 className="font-semibold text-slate-700 mb-1">Feature Importance vs SHAP Importance</h3>
              <p className="text-xs text-slate-400 mb-4">MDI (model-internal) vs SHAP (model-agnostic) — should align for tree models</p>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={barData} layout="vertical" barSize={12} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="feature" width={130} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="importance" name="Tree Importance (MDI)" fill={MODEL_COLORS[selectedModel]} radius={[0, 3, 3, 0]} />
                    <Bar dataKey="shap" name="SHAP Importance" fill="#7c3aed" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400">Run training first to see comparison.</p>
              )}
            </Card>
          )}
        </>
      )}

      {/* Methodology note */}
      <Card className="bg-slate-50">
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-700 text-sm mb-2">Explainability Methodology</h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs text-slate-600">
              <div>
                <p className="font-medium text-slate-700 mb-1">SHAP TreeExplainer</p>
                <p>Uses the exact TreeSHAP algorithm for tree models — O(TL²) complexity, no sampling required. Provides consistent, locally accurate attributions.</p>
              </div>
              <div>
                <p className="font-medium text-slate-700 mb-1">Global vs Local</p>
                <p>Global importance aggregates |SHAP| across all samples. Local explanation (on Predict page) shows individual employee's feature impacts using waterfall charts.</p>
              </div>
              <div>
                <p className="font-medium text-slate-700 mb-1">MDI vs SHAP</p>
                <p>Mean Decrease Impurity (MDI) is biased toward high-cardinality features. SHAP is model-agnostic and more reliable for explanation. Both shown for comparison.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
