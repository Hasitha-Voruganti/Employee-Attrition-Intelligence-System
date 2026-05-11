import React, { useState, useEffect } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Trophy, Download, RefreshCw } from "lucide-react";
import { analyticsAPI, reportsAPI } from "../../services/api";
import {
  Card,
  SectionHeader,
  LoadingCard,
  RiskBadge,
} from "../shared/UIComponents";
import { formatPct } from "../../utils/helpers";

const MODEL_COLORS = {
  RandomForest: "#10b981",
  XGBoost: "#4F6BF5",
  LightGBM: "#f59e0b",
};
const TABS = ["Overview", "Radar", "CV Analysis", "Per-Model Detail"];

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit flex-wrap">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            active === t
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function ConfusionMatrix({ matrix }) {
  if (!matrix || matrix.length < 2)
    return <p className="text-xs text-slate-400">No confusion matrix data.</p>;
  const [[tn, fp], [fn, tp]] = matrix;
  const total = tn + fp + fn + tp;
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        {
          label: "TN",
          value: tn,
          desc: "True Negative",
          style: "bg-green-100 text-green-800",
        },
        {
          label: "FP",
          value: fp,
          desc: "False Positive",
          style: "bg-red-100   text-red-800",
        },
        {
          label: "FN",
          value: fn,
          desc: "False Negative",
          style: "bg-orange-100 text-orange-800",
        },
        {
          label: "TP",
          value: tp,
          desc: "True Positive",
          style: "bg-blue-100  text-blue-800",
        },
      ].map((c) => (
        <div key={c.label} className={`rounded-lg p-3 ${c.style}`}>
          <div className="text-2xl font-bold">{c.value}</div>
          <div className="text-xs font-semibold">
            {c.label} — {c.desc}
          </div>
          <div className="text-[10px] opacity-60">
            {total > 0 ? formatPct(c.value / total) : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

function ROCCurve({ rocData, modelName }) {
  if (!rocData?.fpr?.length)
    return <p className="text-xs text-slate-400">No ROC data.</p>;
  const step = Math.max(1, Math.floor(rocData.fpr.length / 60));
  const pts = rocData.fpr
    .filter((_, i) => i % step === 0)
    .map((fpr, i) => ({
      fpr: +(fpr || 0).toFixed(3),
      tpr: +(rocData.tpr[i * step] || 0).toFixed(3),
    }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="fpr"
          type="number"
          domain={[0, 1]}
          tickCount={6}
          tick={{ fontSize: 10 }}
          label={{
            value: "FPR",
            position: "insideBottom",
            offset: -2,
            fontSize: 11,
          }}
        />
        <YAxis
          type="number"
          domain={[0, 1]}
          tickCount={6}
          tick={{ fontSize: 10 }}
          label={{
            value: "TPR",
            angle: -90,
            position: "insideLeft",
            fontSize: 11,
          }}
        />
        <Tooltip formatter={(v) => v.toFixed(3)} />
        <Line
          data={pts}
          type="monotone"
          dataKey="tpr"
          stroke={MODEL_COLORS[modelName] || "#4F6BF5"}
          dot={false}
          strokeWidth={2.5}
          name="ROC"
        />
        <Line
          data={[
            { fpr: 0, tpr: 0 },
            { fpr: 1, tpr: 1 },
          ]}
          type="linear"
          dataKey="tpr"
          stroke="#cbd5e1"
          dot={false}
          strokeWidth={1}
          strokeDasharray="4 4"
          name="Random"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function ModelComparison() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [selModel, setSelModel] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    analyticsAPI
      .getModelMetrics()
      .then((d) => {
        setMetrics(d);
        setSelModel(d.best_model);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };
  useEffect(load, []);

  if (loading)
    return (
      <div className="p-8">
        <LoadingCard message="Loading model metrics…" />
      </div>
    );
  if (error)
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-700">
          <strong>Error:</strong> {error}
          <button onClick={load} className="ml-4 underline">
            Retry
          </button>
        </div>
      </div>
    );
  if (!metrics?.comparison_table?.length)
    return (
      <div className="p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-700">
          No model results found. Run <code>python train.py</code> first, then
          restart the server.
        </div>
      </div>
    );

  const table = metrics.comparison_table || [];
  const detailed = metrics.detailed_metrics || {};
  const best = metrics.best_model;

  // Radar data
  const METRICS = [
    "accuracy",
    "f1_score",
    "roc_auc",
    "precision",
    "recall",
    "specificity",
  ];
  const radarData = METRICS.map((metric) => {
    const row = {
      metric: metric.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    };
    table.forEach((m) => {
      row[m.model] = +((m[metric] || 0) * 100).toFixed(1);
    });
    return row;
  });

  // CV comparison
  const cvData = table.map((m) => ({
    model: m.model,
    cv_auc: +((m.cv_roc_auc_mean || 0) * 100).toFixed(1),
    test_auc: +((m.roc_auc || 0) * 100).toFixed(1),
    cv_f1: +((m.cv_f1_mean || 0) * 100).toFixed(1),
    test_f1: +((m.f1_score || 0) * 100).toFixed(1),
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <SectionHeader
        title="Model Comparison"
        subtitle="Side-by-side analysis of Random Forest, XGBoost, and LightGBM"
        action={
          <div className="flex gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <a
              href={reportsAPI.downloadModelComparisonCSV()}
              download
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm"
              style={{ background: "#4F6BF5" }}
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </a>
          </div>
        }
      />

      {/* Best model banner */}
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Trophy className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Best Model: {best}
          </p>
          <p className="text-xs text-amber-600">
            Selected by composite: 0.6 × ROC-AUC + 0.4 × F1-Score
          </p>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ── OVERVIEW ── */}
      {tab === "Overview" && (
        <div className="space-y-5">
          {/* Table */}
          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {[
                    "Model",
                    "Accuracy",
                    "F1",
                    "ROC-AUC",
                    "Precision",
                    "Recall",
                    "Specificity",
                    "CV AUC ± Std",
                    "Time",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {table.map((m) => (
                  <tr
                    key={m.model}
                    className={`hover:bg-slate-50 ${m.is_best ? "bg-blue-50/40" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: MODEL_COLORS[m.model] }}
                        />
                        <span className="font-semibold text-slate-700">
                          {m.model}
                        </span>
                        {m.is_best && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                            Best
                          </span>
                        )}
                      </div>
                    </td>
                    {[
                      "accuracy",
                      "f1_score",
                      "roc_auc",
                      "precision",
                      "recall",
                      "specificity",
                    ].map((k) => (
                      <td
                        key={k}
                        className="px-4 py-3 font-mono text-slate-600"
                      >
                        <span
                          className={
                            m.is_best && k === "roc_auc"
                              ? "text-blue-700 font-bold"
                              : ""
                          }
                        >
                          {formatPct(m[k] || 0)}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                      {formatPct(m.cv_roc_auc_mean || 0)} ±{" "}
                      {formatPct(m.cv_roc_auc_std || 0)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {m.training_time}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Bar chart */}
          <Card>
            <h3 className="font-semibold text-slate-700 mb-4">
              Metric Comparison
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={table.map((m) => ({
                  model: m.model,
                  Accuracy: +((m.accuracy || 0) * 100).toFixed(1),
                  "F1 Score": +((m.f1_score || 0) * 100).toFixed(1),
                  "ROC-AUC": +((m.roc_auc || 0) * 100).toFixed(1),
                  Precision: +((m.precision || 0) * 100).toFixed(1),
                  Recall: +((m.recall || 0) * 100).toFixed(1),
                }))}
                barSize={14}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="model" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip formatter={(v) => [`${v}%`]} />
                <Legend />
                {["Accuracy", "F1 Score", "ROC-AUC", "Precision", "Recall"].map(
                  (k, i) => (
                    <Bar
                      key={k}
                      dataKey={k}
                      fill={
                        ["#4F6BF5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][
                          i
                        ]
                      }
                      radius={[3, 3, 0, 0]}
                    />
                  ),
                )}
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── RADAR ── */}
      {tab === "Radar" && (
        <Card>
          <h3 className="font-semibold text-slate-700 mb-4">
            Multi-Metric Radar
          </h3>
          <ResponsiveContainer width="100%" height={420}>
            <RadarChart
              data={radarData}
              margin={{ top: 20, right: 60, bottom: 20, left: 60 }}
            >
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 12, fill: "#64748b" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
              />
              {table.map((m) => (
                <Radar
                  key={m.model}
                  name={m.model}
                  dataKey={m.model}
                  stroke={MODEL_COLORS[m.model]}
                  fill={MODEL_COLORS[m.model]}
                  fillOpacity={0.15}
                  strokeWidth={2.5}
                />
              ))}
              <Legend />
              <Tooltip formatter={(v) => [`${v}%`]} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── CV ANALYSIS ── */}
      {tab === "CV Analysis" && (
        <div className="space-y-5">
          <Card>
            <h3 className="font-semibold text-slate-700 mb-4">
              Cross-Validation vs Test Performance
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cvData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="model" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip formatter={(v) => [`${v}%`]} />
                <Legend />
                <Bar
                  dataKey="cv_auc"
                  name="CV ROC-AUC"
                  fill="#4F6BF5"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="test_auc"
                  name="Test ROC-AUC"
                  fill="#10b981"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="cv_f1"
                  name="CV F1"
                  fill="#f59e0b"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="test_f1"
                  name="Test F1"
                  fill="#ef4444"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {table.map((m) => {
              const cv = detailed[m.model]?.cv_metrics || {};
              return (
                <Card key={m.model}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: MODEL_COLORS[m.model] }}
                    />
                    <h4 className="font-semibold text-slate-700 text-sm">
                      {m.model}
                    </h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      [
                        "CV Accuracy",
                        formatPct(cv.cv_accuracy_mean),
                        `±${formatPct(cv.cv_accuracy_std)}`,
                      ],
                      [
                        "CV F1",
                        formatPct(cv.cv_f1_mean),
                        `±${formatPct(cv.cv_f1_std)}`,
                      ],
                      [
                        "CV ROC-AUC",
                        formatPct(cv.cv_roc_auc_mean),
                        `±${formatPct(cv.cv_roc_auc_std)}`,
                      ],
                      ["CV Precision", formatPct(cv.cv_precision_mean), ""],
                      ["CV Recall", formatPct(cv.cv_recall_mean), ""],
                    ].map(([lbl, val, std]) => (
                      <div
                        key={lbl}
                        className="flex justify-between py-1 border-b border-slate-50"
                      >
                        <span className="text-slate-500">{lbl}</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {val}{" "}
                          <span className="text-slate-400 font-normal">
                            {std}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PER-MODEL DETAIL ── */}
      {tab === "Per-Model Detail" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {table.map((m) => (
              <button
                key={m.model}
                onClick={() => setSelModel(m.model)}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                style={
                  selModel === m.model
                    ? {
                        background: MODEL_COLORS[m.model],
                        color: "white",
                        borderColor: MODEL_COLORS[m.model],
                      }
                    : {
                        background: "white",
                        color: "#475569",
                        borderColor: "#e2e8f0",
                      }
                }
              >
                {m.model}
              </button>
            ))}
          </div>

          {selModel && detailed[selModel] && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <h3 className="font-semibold text-slate-700 mb-4">
                  Confusion Matrix — {selModel}
                </h3>
                <ConfusionMatrix matrix={detailed[selModel].confusion_matrix} />
              </Card>
              <Card>
                <h3 className="font-semibold text-slate-700 mb-2">
                  ROC Curve — {selModel}
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  AUC ={" "}
                  {formatPct(table.find((m) => m.model === selModel)?.roc_auc)}
                </p>
                <ROCCurve
                  rocData={detailed[selModel].roc_curve}
                  modelName={selModel}
                />
              </Card>
              {detailed[selModel].tune_info?.best_params &&
                Object.keys(detailed[selModel].tune_info.best_params).length >
                  0 && (
                  <Card className="lg:col-span-2">
                    <h3 className="font-semibold text-slate-700 mb-4">
                      Best Hyperparameters
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {Object.entries(
                        detailed[selModel].tune_info.best_params,
                      ).map(([k, v]) => (
                        <div key={k} className="bg-slate-50 rounded-lg p-3">
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                            {k.replace(/_/g, " ")}
                          </p>
                          <p className="text-sm font-mono font-semibold text-slate-700 mt-1">
                            {String(v)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
