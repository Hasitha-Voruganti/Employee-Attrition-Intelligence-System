import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle, AlertCircle, Clock, Database, Cpu, RefreshCw } from 'lucide-react';
import { trainingAPI } from '../../services/api';
import { Card, SectionHeader, StatCard, Alert, Spinner } from '../shared/UIComponents';
import { formatNumber, formatPct } from '../../utils/helpers';

const steps = [
  { id: 1, label: 'Loading Dataset', range: [0, 15] },
  { id: 2, label: 'Feature Engineering', range: [15, 25] },
  { id: 3, label: 'Training Random Forest', range: [25, 50] },
  { id: 4, label: 'Training XGBoost', range: [50, 70] },
  { id: 5, label: 'Training LightGBM', range: [70, 85] },
  { id: 6, label: 'Computing SHAP Values', range: [85, 95] },
  { id: 7, label: 'Saving Models', range: [95, 100] },
];

function getStepStatus(step, progress) {
  if (progress >= step.range[1]) return 'done';
  if (progress >= step.range[0]) return 'active';
  return 'pending';
}

export default function Training({ onStatusChange }) {
  const [status, setStatus] = useState({ status: 'idle', progress: 0, best_model: null, message: '' });
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const s = await trainingAPI.getStatus();
      setStatus(s);
      onStatusChange?.(s.status);
      if (s.status === 'complete' || s.status === 'error') {
        clearInterval(pollRef.current);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchStatus();
    trainingAPI.getDatasetInfo().then(setDatasetInfo).catch(console.error);
  }, []);

  const startTraining = async () => {
    setStarting(true);
    try {
      await trainingAPI.startTraining();
      setStatus(s => ({ ...s, status: 'training', progress: 5 }));
      pollRef.current = setInterval(fetchStatus, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (status.status === 'training' && !pollRef.current) {
      pollRef.current = setInterval(fetchStatus, 2000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const isTraining = status.status === 'training';
  const isComplete = status.status === 'complete';
  const isError = status.status === 'error';

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <SectionHeader
        title="Model Training"
        subtitle="Train Random Forest, XGBoost, and LightGBM with hyperparameter tuning"
        action={
          <button
            onClick={startTraining}
            disabled={isTraining || starting}
            className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTraining || starting ? <Spinner size="sm" /> : <Play className="w-4 h-4" />}
            {isTraining ? 'Training...' : 'Start Training'}
          </button>
        }
      />

      {/* Dataset Info */}
      {datasetInfo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Records" value={formatNumber(datasetInfo.total_records)} icon={Database} color="brand" />
          <StatCard label="Features" value={datasetInfo.features} icon={Cpu} color="green" />
          <StatCard label="Attrition Rate" value={formatPct(datasetInfo.attrition_rate)} icon={AlertCircle} color="red" />
          <StatCard label="Avg Age" value={`${datasetInfo.age_range?.mean} yrs`} icon={Clock} color="amber" />
        </div>
      )}

      {/* Dataset breakdown */}
      {datasetInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-semibold text-slate-700 mb-4 text-sm">Department Distribution</h3>
            <div className="space-y-2">
              {Object.entries(datasetInfo.departments || {}).map(([dept, count]) => (
                <div key={dept} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-40 truncate">{dept}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-400 rounded-full" style={{ width: `${(count / datasetInfo.total_records) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-slate-500">{count}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-700 mb-4 text-sm">Training Pipeline</h3>
            <div className="space-y-2 text-xs text-slate-600">
              {[
                ['Preprocessing', 'StandardScaler + OrdinalEncoder + Imputer'],
                ['Feature Engineering', '9 derived features (tenure ratio, satisfaction score, ...)'],
                ['CV Strategy', '5-Fold Stratified Cross-Validation'],
                ['Hyperparameter Search', 'RandomizedSearchCV (n_iter=20)'],
                ['Model Selection', 'Best composite score: 0.6×AUC + 0.4×F1'],
                ['Explainability', 'SHAP TreeExplainer (global + local)'],
                ['Imbalance Handling', 'Class weights / scale_pos_weight'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="font-medium text-slate-700 w-36 flex-shrink-0">{k}:</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Training Progress */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">Training Progress</h3>
          <div className="flex items-center gap-2">
            {isComplete && <CheckCircle className="w-5 h-5 text-green-500" />}
            {isError && <AlertCircle className="w-5 h-5 text-red-500" />}
            {isTraining && <Spinner size="sm" />}
            <span className={`text-sm font-medium ${isComplete ? 'text-green-600' : isError ? 'text-red-600' : isTraining ? 'text-brand-600' : 'text-slate-500'}`}>
              {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Overall Progress</span>
            <span className="font-mono">{status.progress}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-gradient-to-r from-brand-500 to-brand-600'}`}
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {steps.map(step => {
            const stepStatus = getStepStatus(step, status.progress);
            return (
              <div key={step.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                stepStatus === 'active' ? 'bg-brand-50 border border-brand-200' :
                stepStatus === 'done' ? 'bg-green-50' : 'bg-slate-50'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  stepStatus === 'done' ? 'bg-green-500 text-white' :
                  stepStatus === 'active' ? 'bg-brand-500 text-white' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {stepStatus === 'done' ? '✓' : stepStatus === 'active' ? <Spinner size="sm" /> : step.id}
                </div>
                <div>
                  <p className={`text-xs font-medium ${stepStatus === 'active' ? 'text-brand-700' : stepStatus === 'done' ? 'text-green-700' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-400">{step.range[0]}% – {step.range[1]}%</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status message */}
        {status.message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${isComplete ? 'bg-green-50 text-green-700' : isError ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'}`}>
            {status.message}
          </div>
        )}
      </Card>

      {/* Idle notice */}
      {status.status === 'idle' && (
        <Alert type="info">
          <strong>Ready to train.</strong> Click "Start Training" to begin the full ML pipeline with hyperparameter tuning and cross-validation. Training takes approximately 2-5 minutes.
        </Alert>
      )}
    </div>
  );
}
