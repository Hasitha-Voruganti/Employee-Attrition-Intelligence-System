import React, { useEffect, useState } from "react";
import {
  Users,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Activity,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import { analyticsAPI } from "../../services/api";
import {
  StatCard,
  Card,
  LoadingCard,
  SectionHeader,
} from "../shared/UIComponents";
import { formatNumber, formatPct } from "../../utils/helpers";
import { Link } from "react-router-dom";

const COLORS = [
  "#4F6BF5",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

export default function Overview() {
  const [eda, setEda] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getEDA(),
      analyticsAPI.getModelMetrics().catch(() => null), // optional
    ])
      .then(([edaData, metricsData]) => {
        setEda(edaData);
        setMetrics(metricsData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="p-8">
        <LoadingCard message="Loading dashboard…" />
      </div>
    );

  if (error)
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-700">
          <strong>Error loading data:</strong> {error}
          <br />
          <span className="text-xs mt-1 block">
            Make sure the backend is running on port 8000.
          </span>
        </div>
      </div>
    );

  const summary = eda?.summary || {};
  const bestModel = metrics?.comparison_table?.[0];

  // Department chart
  const deptData = (eda?.department_attrition || []).map((d) => ({
    name: (d.Department || d.department || "").replace(
      "Research & Development",
      "R&D",
    ),
    rate: +((d.attrition_rate || 0) * 100).toFixed(1),
    count: d.count || 0,
  }));

  // Job satisfaction chart
  const satData = (eda?.satisfaction_data?.JobSatisfaction || []).map((d) => ({
    score: `Level ${d.score}`,
    rate: +((d.attrition_rate || 0) * 100).toFixed(1),
  }));

  // Gender pie chart
  const genderData = (eda?.gender_data || []).map((d) => ({
    name: d.Gender || d.gender || "",
    value: d.count || 0,
    rate: +((d.attrition_rate || 0) * 100).toFixed(1),
  }));

  // Model comparison bar chart
  const modelData = (metrics?.comparison_table || []).map((m) => ({
    model: m.model,
    Accuracy: +((m.accuracy || 0) * 100).toFixed(1),
    "ROC-AUC": +((m.roc_auc || 0) * 100).toFixed(1),
    F1: +((m.f1_score || 0) * 100).toFixed(1),
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl text-slate-800">
            Employee Attrition Intelligence
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            IBM HR Analytics · Real-time insights and predictive analytics
          </p>
        </div>
        <Link to="/predict">
          <button
            className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors shadow-sm"
            style={{ background: "#4F6BF5" }}
          >
            <Target className="w-4 h-4" /> Predict Attrition
          </button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Employees"
          value={
            summary.total_employees
              ? formatNumber(summary.total_employees)
              : "—"
          }
          sub="IBM HR Dataset"
          icon={Users}
          color="brand"
        />
        <StatCard
          label="Attrition Rate"
          value={
            summary.attrition_rate != null
              ? formatPct(summary.attrition_rate)
              : "—"
          }
          sub={
            summary.attrition_count != null
              ? `${summary.attrition_count} employees left`
              : ""
          }
          icon={TrendingDown}
          color="red"
          trend="up"
          trendVal="vs 12% industry avg"
        />
        <StatCard
          label="Avg Monthly Income"
          value={
            summary.avg_monthly_income != null
              ? `$${formatNumber(summary.avg_monthly_income)}`
              : "—"
          }
          sub="Across all roles"
          icon={DollarSign}
          color="green"
        />
        <StatCard
          label="Avg Tenure"
          value={summary.avg_tenure != null ? `${summary.avg_tenure} yrs` : "—"}
          sub="Years at company"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Best model banner */}
      {bestModel && (
        <div
          className="rounded-xl p-5 text-white"
          style={{ background: "linear-gradient(to right,#4F6BF5,#2e40c4)" }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                Best Performing Model
              </p>
              <p className="text-2xl font-bold mt-1">{bestModel.model}</p>
              <p className="text-sm opacity-70 mt-0.5">
                Auto-selected by composite score (0.6×AUC + 0.4×F1)
              </p>
            </div>
            <div className="flex gap-3">
              {[
                { label: "Accuracy", val: formatPct(bestModel.accuracy) },
                { label: "ROC-AUC", val: formatPct(bestModel.roc_auc) },
                { label: "F1 Score", val: formatPct(bestModel.f1_score) },
              ].map((m) => (
                <div
                  key={m.label}
                  className="text-center px-4 py-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                >
                  <p className="text-xl font-bold">{m.val}</p>
                  <p className="text-xs opacity-70 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Dept attrition */}
        <Card>
          <h3 className="font-semibold text-slate-700 mb-4">
            Attrition by Department
          </h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptData} layout="vertical" barSize={22}>
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={55}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v) => [`${v}%`, "Attrition Rate"]} />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {deptData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">No data</p>
          )}
        </Card>

        {/* Gender */}
        <Card>
          <h3 className="font-semibold text-slate-700 mb-4">
            Gender Distribution
          </h3>
          {genderData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, rate }) => `${name}: ${rate}%`}
                  labelLine={false}
                >
                  {genderData.map((_, i) => (
                    <Cell key={i} fill={["#4F6BF5", "#f59e0b"][i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, _, p) => [formatNumber(v), p.payload.name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">No data</p>
          )}
        </Card>

        {/* Job satisfaction */}
        <Card>
          <h3 className="font-semibold text-slate-700 mb-4">
            Job Satisfaction vs Attrition
          </h3>
          {satData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={satData} barSize={32}>
                <XAxis dataKey="score" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, "Attrition Rate"]} />
                <Bar dataKey="rate" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">No data</p>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Model comparison */}
        {modelData.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">
                Model Performance
              </h3>
              <Link
                to="/models"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                Details <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={modelData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                <YAxis
                  domain={[50, 100]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip formatter={(v) => [`${v}%`]} />
                <Legend />
                <Bar dataKey="Accuracy" fill="#4F6BF5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="ROC-AUC" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="F1" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Risk factors */}
        <Card>
          <h3 className="font-semibold text-slate-700 mb-4">
            Top Attrition Risk Factors
          </h3>
          <div className="space-y-3">
            {[
              { factor: "Overtime Work", pct: 92, color: "#ef4444" },
              { factor: "Low Job Satisfaction", pct: 78, color: "#f97316" },
              { factor: "Frequent Travel", pct: 65, color: "#f59e0b" },
              { factor: "Poor Work-Life Balance", pct: 62, color: "#f59e0b" },
              { factor: "Short Tenure (≤2 yrs)", pct: 48, color: "#4F6BF5" },
              { factor: "Low Income", pct: 42, color: "#4F6BF5" },
            ].map((r) => (
              <div key={r.factor} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-44 flex-shrink-0">
                  {r.factor}
                </span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${r.pct}%`, background: r.color }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-500 w-8">
                  {r.pct}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Run Prediction",
            desc: "Assess individual risk",
            to: "/predict",
            icon: Target,
            bg: "#4F6BF5",
          },
          {
            label: "Train Models",
            desc: "Retrain with latest data",
            to: "/training",
            icon: Activity,
            bg: "#10b981",
          },
          {
            label: "Explore Data",
            desc: "EDA & visualizations",
            to: "/analytics",
            icon: Briefcase,
            bg: "#f59e0b",
          },
          {
            label: "SHAP Analysis",
            desc: "Feature explainability",
            to: "/explainability",
            icon: AlertTriangle,
            bg: "#8b5cf6",
          },
        ].map((a) => (
          <Link key={a.to} to={a.to}>
            <div className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-all cursor-pointer group">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: a.bg }}
              >
                <a.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-semibold text-slate-700">{a.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{a.desc}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Go <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
