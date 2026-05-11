import React, { useState, useEffect } from 'react';
import { Download, FileText, BarChart2, Table, FileJson, CheckCircle, Trophy, Database } from 'lucide-react';
import { reportsAPI, analyticsAPI } from '../../services/api';
import { Card, SectionHeader, StatCard } from '../shared/UIComponents';
import { formatPct, formatNumber } from '../../utils/helpers';

const REPORTS = [
  {
    id: 'model_csv',
    title: 'Model Comparison Report',
    desc: 'All three models with accuracy, F1, ROC-AUC, precision, recall, specificity, and cross-validation metrics.',
    format: 'CSV', icon: BarChart2, color: { bg:'bg-brand-50', icon:'text-brand-600', badge:'bg-brand-100 text-brand-700', btn:'hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200' },
    getUrl: reportsAPI.downloadModelComparisonCSV, filename: 'model_comparison.csv',
  },
  {
    id: 'model_json',
    title: 'Full Training Results',
    desc: 'Complete JSON with best hyperparameters, CV fold scores, confusion matrices, and ROC curve data.',
    format: 'JSON', icon: FileJson, color: { bg:'bg-green-50', icon:'text-green-600', badge:'bg-green-100 text-green-700', btn:'hover:bg-green-50 hover:text-green-700 hover:border-green-200' },
    getUrl: reportsAPI.downloadModelComparisonJSON, filename: 'training_results.json',
  },
  {
    id: 'eda_csv',
    title: 'EDA Summary',
    desc: 'Attrition rates broken down by department, role, age group, income band, satisfaction scores, and more.',
    format: 'CSV', icon: Table, color: { bg:'bg-amber-50', icon:'text-amber-600', badge:'bg-amber-100 text-amber-700', btn:'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200' },
    getUrl: reportsAPI.downloadEDASummaryCSV, filename: 'eda_summary.csv',
  },
  {
    id: 'predictions_csv',
    title: 'Test Set Predictions',
    desc: 'Actual vs predicted attrition labels, probability scores, risk levels, and correctness for all test samples.',
    format: 'CSV', icon: FileText, color: { bg:'bg-purple-50', icon:'text-purple-600', badge:'bg-purple-100 text-purple-700', btn:'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200' },
    getUrl: reportsAPI.downloadPredictionsCSV, filename: 'test_predictions.csv',
  },
];

function ReportCard({ report }) {
  const [state, setState] = useState('idle'); // idle | done

  const handleDownload = () => {
    const url = report.getUrl();
    const a = document.createElement('a');
    a.href = url; a.download = report.filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setState('done');
    setTimeout(() => setState('idle'), 3000);
  };

  const { color } = report;
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${color.bg}`}>
          <report.icon className={`w-5 h-5 ${color.icon}`} />
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color.badge}`}>{report.format}</span>
      </div>
      <h3 className="font-semibold text-slate-700 text-sm mb-1">{report.title}</h3>
      <p className="text-xs text-slate-400 mb-4 leading-relaxed">{report.desc}</p>
      <button onClick={handleDownload}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border border-slate-200 ${
          state === 'done' ? 'bg-green-50 text-green-700 border-green-200' : `bg-slate-50 text-slate-700 ${color.btn}`
        }`}
      >
        {state === 'done' ? <><CheckCircle className="w-4 h-4" /> Downloaded!</> : <><Download className="w-4 h-4" /> Download {report.format}</>}
      </button>
    </div>
  );
}

const DATA_DICT = [
  ['Age','Numeric','18–60','Employee age'],
  ['Attrition','Target','Yes/No','Whether employee left (target variable)'],
  ['BusinessTravel','Categorical','Non-Travel / Travel_Rarely / Travel_Frequently','Frequency of business travel'],
  ['DailyRate','Numeric','102–1499','Daily pay rate'],
  ['Department','Categorical','Sales / R&D / HR','Employee department'],
  ['DistanceFromHome','Numeric','1–29','Commute distance in km'],
  ['Education','Ordinal','1–5','1=Below College … 5=Doctor'],
  ['EnvironmentSatisfaction','Ordinal','1–4','1=Low … 4=Very High'],
  ['JobInvolvement','Ordinal','1–4','1=Low … 4=Very High'],
  ['JobLevel','Ordinal','1–5','Seniority level'],
  ['JobSatisfaction','Ordinal','1–4','1=Low … 4=Very High'],
  ['MonthlyIncome','Numeric','1009–19999','Monthly gross salary'],
  ['NumCompaniesWorked','Numeric','0–9','Number of previous employers'],
  ['OverTime','Categorical','Yes/No','Whether employee works overtime'],
  ['PercentSalaryHike','Numeric','11–25','Last salary increase %'],
  ['RelationshipSatisfaction','Ordinal','1–4','1=Low … 4=Very High'],
  ['StockOptionLevel','Ordinal','0–3','0=None … 3=High'],
  ['TotalWorkingYears','Numeric','0–40','Total years of work experience'],
  ['WorkLifeBalance','Ordinal','1–4','1=Bad … 4=Best'],
  ['YearsAtCompany','Numeric','0–40','Tenure at current company'],
  ['YearsInCurrentRole','Numeric','0–18','Time in current role'],
  ['YearsSinceLastPromotion','Numeric','0–15','Years since last promotion'],
  ['YearsWithCurrManager','Numeric','0–17','Years with current manager'],
];

export default function Reports() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    analyticsAPI.getModelMetrics().then(setMetrics).catch(console.error);
  }, []);

  const best = metrics?.comparison_table?.[0];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <SectionHeader title="Reports & Exports" subtitle="Download training artifacts, EDA summaries, and prediction data" />

      {best && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Best Model"   value={best.model}                  icon={Trophy}   color="brand" />
          <StatCard label="Test ROC-AUC" value={formatPct(best.roc_auc)}     icon={BarChart2} color="green" />
          <StatCard label="Test F1"      value={formatPct(best.f1_score)}    icon={FileText} color="amber" />
          <StatCard label="Accuracy"     value={formatPct(best.accuracy)}    icon={Database} color="brand" />
        </div>
      )}

      <div>
        <h2 className="font-display text-xl text-slate-800 mb-4">Available Reports</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {REPORTS.map(r => <ReportCard key={r.id} report={r} />)}
        </div>
      </div>

      {/* Data Dictionary */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Dataset Feature Reference</h3>
          <p className="text-xs text-slate-400 mt-0.5">IBM HR Analytics — 35 original features, 1470 records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                {['Feature','Type','Range / Values','Description'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {DATA_DICT.map(([feat, type, range, desc]) => (
                <tr key={feat} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-mono font-medium text-brand-600">{feat}</td>
                  <td className="px-4 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      type==='Target' ? 'bg-red-100 text-red-700' :
                      type==='Numeric' ? 'bg-blue-100 text-blue-700' :
                      type==='Ordinal' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>{type}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-slate-500">{range}</td>
                  <td className="px-4 py-2 text-slate-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
