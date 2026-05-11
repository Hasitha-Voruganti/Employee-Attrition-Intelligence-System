import React, { useState } from 'react';
import { UserCheck, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { predictionAPI } from '../../services/api';
import { Card, SectionHeader, RiskBadge, Spinner, Alert } from '../shared/UIComponents';
import { formatPct, getRiskColor } from '../../utils/helpers';

const FIELD_GROUPS = [
  {
    title: 'Personal Information',
    fields: [
      { key: 'Age', label: 'Age', type: 'number', min: 18, max: 65, default: 35 },
      { key: 'Gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
      { key: 'MaritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced'] },
      { key: 'Education', label: 'Education Level', type: 'select', options: [1, 2, 3, 4, 5], labels: ['Below College', 'College', 'Bachelor', 'Master', 'Doctor'] },
      { key: 'EducationField', label: 'Education Field', type: 'select', options: ['Life Sciences', 'Medical', 'Marketing', 'Technical Degree', 'Human Resources', 'Other'] },
    ]
  },
  {
    title: 'Job Details',
    fields: [
      { key: 'Department', label: 'Department', type: 'select', options: ['Sales', 'Research & Development', 'Human Resources'] },
      { key: 'JobRole', label: 'Job Role', type: 'select', options: ['Sales Executive', 'Research Scientist', 'Laboratory Technician', 'Manufacturing Director', 'Healthcare Representative', 'Manager', 'Sales Representative', 'Research Director', 'Human Resources'] },
      { key: 'JobLevel', label: 'Job Level', type: 'number', min: 1, max: 5, default: 2 },
      { key: 'JobInvolvement', label: 'Job Involvement (1-4)', type: 'number', min: 1, max: 4, default: 3 },
      { key: 'JobSatisfaction', label: 'Job Satisfaction (1-4)', type: 'number', min: 1, max: 4, default: 3 },
    ]
  },
  {
    title: 'Work Environment',
    fields: [
      { key: 'EnvironmentSatisfaction', label: 'Environment Satisfaction (1-4)', type: 'number', min: 1, max: 4, default: 3 },
      { key: 'WorkLifeBalance', label: 'Work-Life Balance (1-4)', type: 'number', min: 1, max: 4, default: 3 },
      { key: 'RelationshipSatisfaction', label: 'Relationship Satisfaction (1-4)', type: 'number', min: 1, max: 4, default: 3 },
      { key: 'OverTime', label: 'Works Overtime', type: 'select', options: ['Yes', 'No'] },
      { key: 'BusinessTravel', label: 'Business Travel', type: 'select', options: ['Non-Travel', 'Travel_Rarely', 'Travel_Frequently'] },
      { key: 'DistanceFromHome', label: 'Distance from Home (km)', type: 'number', min: 1, max: 30, default: 5 },
    ]
  },
  {
    title: 'Compensation',
    fields: [
      { key: 'MonthlyIncome', label: 'Monthly Income ($)', type: 'number', min: 1009, max: 20000, default: 5000 },
      { key: 'DailyRate', label: 'Daily Rate', type: 'number', min: 100, max: 1500, default: 800 },
      { key: 'HourlyRate', label: 'Hourly Rate', type: 'number', min: 30, max: 100, default: 65 },
      { key: 'MonthlyRate', label: 'Monthly Rate', type: 'number', min: 2000, max: 27000, default: 15000 },
      { key: 'PercentSalaryHike', label: 'Salary Hike (%)', type: 'number', min: 11, max: 25, default: 14 },
      { key: 'StockOptionLevel', label: 'Stock Option Level (0-3)', type: 'number', min: 0, max: 3, default: 1 },
    ]
  },
  {
    title: 'Experience & Tenure',
    fields: [
      { key: 'TotalWorkingYears', label: 'Total Working Years', type: 'number', min: 0, max: 40, default: 10 },
      { key: 'YearsAtCompany', label: 'Years at Company', type: 'number', min: 0, max: 40, default: 5 },
      { key: 'YearsInCurrentRole', label: 'Years in Current Role', type: 'number', min: 0, max: 18, default: 3 },
      { key: 'YearsSinceLastPromotion', label: 'Years Since Last Promotion', type: 'number', min: 0, max: 15, default: 1 },
      { key: 'YearsWithCurrManager', label: 'Years with Current Manager', type: 'number', min: 0, max: 17, default: 4 },
      { key: 'NumCompaniesWorked', label: 'Previous Companies', type: 'number', min: 0, max: 9, default: 2 },
      { key: 'TrainingTimesLastYear', label: 'Training Sessions Last Year', type: 'number', min: 0, max: 6, default: 2 },
      { key: 'PerformanceRating', label: 'Performance Rating (3-4)', type: 'number', min: 3, max: 4, default: 3 },
    ]
  }
];

const DEFAULT_VALUES = FIELD_GROUPS.reduce((acc, group) => {
  group.fields.forEach(f => {
    if (f.type === 'select') acc[f.key] = f.options[0];
    else acc[f.key] = f.default ?? f.min;
  });
  return acc;
}, {});

function ProbabilityMeter({ probability }) {
  const pct = Math.round(probability * 100);
  const color = pct < 30 ? '#10b981' : pct < 60 ? '#f59e0b' : pct < 80 ? '#ef4444' : '#7c3aed';
  const rotation = -90 + (pct / 100) * 180;

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-48 h-24 overflow-hidden">
        {/* Gauge background */}
        <svg viewBox="0 0 200 100" className="w-full">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          {/* Background arc */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e2e8f0" strokeWidth="18" strokeLinecap="round" />
          {/* Colored arc */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="18" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 251.3} 251.3`} />
          {/* Needle */}
          <g transform={`rotate(${rotation}, 100, 100)`}>
            <line x1="100" y1="100" x2="100" y2="28" stroke={color} strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="100" r="5" fill={color} />
          </g>
          {/* Center labels */}
          <text x="100" y="95" textAnchor="middle" fontSize="24" fontWeight="bold" fill={color} fontFamily="JetBrains Mono, monospace">
            {pct}%
          </text>
        </svg>
      </div>
      <div className="flex justify-between w-48 text-[10px] text-slate-400 -mt-1">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

export default function PredictAttrition() {
  const [formData, setFormData] = useState(DEFAULT_VALUES);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({ 0: true, 1: true });

  const handleChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: typeof value === 'string' && !isNaN(value) && value !== '' ? Number(value) : value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await predictionAPI.predict(formData);
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (i) => setExpandedGroups(prev => ({ ...prev, [i]: !prev[i] }));

  const riskColors = result ? getRiskColor(result.risk_level) : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <SectionHeader title="Predict Attrition" subtitle="Enter employee details to assess attrition risk" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          {FIELD_GROUPS.map((group, gi) => (
            <Card key={group.title} className="p-0 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                onClick={() => toggleGroup(gi)}
              >
                <h3 className="font-semibold text-slate-700 text-sm">{group.title}</h3>
                {expandedGroups[gi] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {expandedGroups[gi] && (
                <div className="px-5 pb-5 grid grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-50">
                  {group.fields.map(field => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-slate-500 mb-1 mt-3">
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={formData[field.key]}
                          onChange={e => handleChange(field.key, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                        >
                          {field.options.map((opt, oi) => (
                            <option key={opt} value={opt}>
                              {field.labels ? `${opt} - ${field.labels[oi]}` : opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          value={formData[field.key]}
                          min={field.min}
                          max={field.max}
                          onChange={e => handleChange(field.key, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {loading ? <Spinner size="sm" /> : <Zap className="w-4 h-4" />}
              {loading ? 'Predicting...' : 'Predict Attrition Risk'}
            </button>
            <button
              onClick={() => { setFormData(DEFAULT_VALUES); setResult(null); }}
              className="px-6 py-3 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
          </div>

          {error && <Alert type="error">{error}</Alert>}
        </div>

        {/* Result Panel */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Risk gauge */}
              <Card>
                <h3 className="font-semibold text-slate-700 text-center mb-2">Attrition Risk Score</h3>
                <ProbabilityMeter probability={result.probability_attrition} />
                <div className="text-center mt-2">
                  <RiskBadge level={result.risk_level} />
                  <p className="text-xs text-slate-400 mt-2">Model: {result.model_used}</p>
                </div>
              </Card>

              {/* Probability bars */}
              <Card>
                <h3 className="font-semibold text-slate-700 mb-4 text-sm">Prediction Breakdown</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-red-600">Will Leave</span>
                      <span className="font-mono font-bold text-red-600">{formatPct(result.probability_attrition)}</span>
                    </div>
                    <div className="h-3 bg-red-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full transition-all duration-700" style={{ width: `${result.probability_attrition * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-green-600">Will Stay</span>
                      <span className="font-mono font-bold text-green-600">{formatPct(result.probability_retention)}</span>
                    </div>
                    <div className="h-3 bg-green-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${result.probability_retention * 100}%` }} />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Risk factors */}
              {result.risk_factors?.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Risk Factors
                  </h3>
                  <ul className="space-y-2">
                    {result.risk_factors.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" /> Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* SHAP waterfall */}
              {result.shap_explanation?.waterfall?.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-slate-700 mb-4 text-sm">SHAP Feature Impact</h3>
                  <div className="space-y-2">
                    {result.shap_explanation.waterfall.slice(0, 8).map((w, i) => {
                      const pct = Math.min(100, Math.abs(w.shap_value) * 200);
                      const isPos = w.shap_value > 0;
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500 w-28 truncate text-right">{w.feature.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                            <div
                              className="absolute h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                left: isPos ? '50%' : `${50 - pct / 2}%`,
                                background: isPos ? '#ef4444' : '#10b981',
                              }}
                            />
                            <div className="absolute w-px h-full bg-slate-300" style={{ left: '50%' }} />
                          </div>
                          <span className={`font-mono text-[10px] w-14 text-right ${isPos ? 'text-red-600' : 'text-green-600'}`}>
                            {isPos ? '+' : ''}{w.shap_value.toFixed(3)}
                          </span>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-slate-400 mt-2">Red = increases risk · Green = decreases risk</p>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
                <UserCheck className="w-8 h-8 text-brand-400" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-2">Ready to Predict</h3>
              <p className="text-xs text-slate-400 max-w-[200px]">
                Fill in the employee details and click "Predict Attrition Risk" to get an AI-powered assessment.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
