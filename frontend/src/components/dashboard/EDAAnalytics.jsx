import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { analyticsAPI } from "../../services/api";
import {
  Card,
  SectionHeader,
  LoadingCard,
  StatCard,
} from "../shared/UIComponents";
import { formatPct, formatNumber } from "../../utils/helpers";
import { Users, TrendingDown, Briefcase, Heart } from "lucide-react";

const COLORS = [
  "#4F6BF5",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
];

// Simple tab component inline — avoids any import issues
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

export default function EDAAnalytics() {
  const [eda, setEda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("Overview");

  useEffect(() => {
    analyticsAPI
      .getEDA()
      .then((data) => {
        setEda(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="p-8">
        <LoadingCard message="Running exploratory data analysis…" />
      </div>
    );

  if (error)
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-700">
          <strong>Failed to load EDA data:</strong> {error}
          <br />
          <span className="text-xs mt-1 block">
            Make sure the backend is running on port 8000 and your dataset CSV
            is in backend/data/
          </span>
        </div>
      </div>
    );

  if (!eda)
    return (
      <div className="p-8">
        <p className="text-slate-500">No data returned from server.</p>
      </div>
    );

  // ── Safe data extraction ────────────────────────────────────────────────────
  const s = eda.summary || {};

  const deptData = (eda.department_attrition || []).map((d) => ({
    name: (d.Department || d.department || "").replace(
      "Research & Development",
      "R&D",
    ),
    rate: +((d.attrition_rate || 0) * 100).toFixed(1),
    count: d.count || 0,
  }));

  const roleData = (eda.role_attrition || []).slice(0, 8).map((d) => ({
    name: d.role || d.JobRole || "",
    rate: +((d.attrition_rate || 0) * 100).toFixed(1),
    count: d.count || 0,
  }));

  const ageData = (eda.age_distribution || []).map((d) => ({
    age: d.age_group || "",
    rate: +((d.rate || 0) * 100).toFixed(1),
    total: d.total || 0,
  }));

  const travelData = (eda.travel_attrition || []).map((d) => ({
    name: (d.travel_type || d.BusinessTravel || "")
      .replace("Travel_", "")
      .replace("Non-", "No "),
    rate: +((d.attrition_rate || 0) * 100).toFixed(1),
    count: d.count || 0,
  }));

  const tenureData = (eda.tenure_distribution || []).map((d) => ({
    tenure: d.tenure_group || "",
    rate: +((d.rate || 0) * 100).toFixed(1),
    total: d.total || 0,
  }));

  const overtimeData = (eda.overtime_attrition || []).map((d) => ({
    name:
      (d.overtime || d.OverTime || "") === "Yes"
        ? "With Overtime"
        : "No Overtime",
    rate: +((d.attrition_rate || 0) * 100).toFixed(1),
    count: d.count || 0,
    isOT: (d.overtime || d.OverTime || "") === "Yes",
  }));

  const genderData = (eda.gender_data || []).map((d) => ({
    name: d.Gender || d.gender || "",
    value: d.count || 0,
    rate: +((d.attrition_rate || 0) * 100).toFixed(1),
  }));

  const maritalData = (eda.marital_data || []).map((d) => ({
    name: d.MaritalStatus || d.maritalStatus || "",
    value: d.count || 0,
    rate: +((d.attrition_rate || 0) * 100).toFixed(1),
  }));

  const incomeByAtt = eda.income_by_attrition || {};

  const incomeData = (eda.income_distribution || []).map((d) => ({
    range: (d.income_range || "")
      .split(",")[0]
      .replace("(", "$")
      .replace("[", "$")
      .trim(),
    rate: +((d.rate || 0) * 100).toFixed(1),
    total: d.total || 0,
  }));

  const satCharts = {};
  for (const [key, rows] of Object.entries(eda.satisfaction_data || {})) {
    satCharts[key] = (rows || []).map((d) => ({
      score: `Level ${d.score}`,
      rate: +((d.attrition_rate || 0) * 100).toFixed(1),
    }));
  }

  const corr = eda.correlation || {};
  const corrCols = corr.columns || [];
  const corrMat = corr.matrix || [];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <SectionHeader
        title="EDA Analytics"
        subtitle="Exploratory analysis of the IBM HR Attrition dataset"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Employees"
          value={s.total_employees ? formatNumber(s.total_employees) : "—"}
          icon={Users}
          color="brand"
        />
        <StatCard
          label="Attrition Rate"
          value={s.attrition_rate != null ? formatPct(s.attrition_rate) : "—"}
          sub={
            s.attrition_count != null ? `${s.attrition_count} employees` : ""
          }
          icon={TrendingDown}
          color="red"
        />
        <StatCard
          label="Avg Monthly Salary"
          value={
            s.avg_monthly_income != null
              ? `$${formatNumber(s.avg_monthly_income)}`
              : "—"
          }
          icon={Briefcase}
          color="green"
        />
        <StatCard
          label="Overtime Workers"
          value={s.overtime_pct != null ? formatPct(s.overtime_pct) : "—"}
          icon={Heart}
          color="amber"
        />
      </div>

      <Tabs
        tabs={[
          "Overview",
          "Workforce",
          "Satisfaction",
          "Compensation",
          "Correlation",
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── OVERVIEW ── */}
      {tab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-semibold text-slate-700 mb-4">
              Attrition by Department
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} layout="vertical" barSize={24}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={60}
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
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-700 mb-4">
              Attrition by Job Role
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roleData} layout="vertical" barSize={16}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip formatter={(v) => [`${v}%`, "Attrition Rate"]} />
                <Bar dataKey="rate" fill="#4F6BF5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-700 mb-4">
              Attrition by Age Group
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, "Attrition Rate"]} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {ageData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.rate > 20
                          ? "#ef4444"
                          : d.rate > 15
                            ? "#f97316"
                            : "#4F6BF5"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-700 mb-4">
              Attrition by Business Travel
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={travelData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, "Attrition Rate"]} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {travelData.map((_, i) => (
                    <Cell key={i} fill={["#10b981", "#f59e0b", "#ef4444"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── WORKFORCE ── */}
      {tab === "Workforce" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-semibold text-slate-700 mb-4">
              Attrition by Tenure
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tenureData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="tenure" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, "Attrition Rate"]} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {tenureData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.rate > 25
                          ? "#ef4444"
                          : d.rate > 15
                            ? "#f59e0b"
                            : "#10b981"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-700 mb-4">
              Overtime Impact on Attrition
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={overtimeData} barSize={64}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, "Attrition Rate"]} />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                  {overtimeData.map((d, i) => (
                    <Cell key={i} fill={d.isOT ? "#ef4444" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-700 mb-4">
              Gender Breakdown
            </h3>
            <div className="space-y-5 mt-2">
              {genderData.map((g, i) => (
                <div key={g.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-700">{g.name}</span>
                    <span className="font-mono text-slate-600">
                      {g.rate}% attrition · {formatNumber(g.value)} employees
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${g.rate * 4}%`,
                        background: ["#4F6BF5", "#f59e0b"][i],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-700 mb-4">
              Marital Status
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={maritalData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, rate }) => `${name}: ${rate}%`}
                >
                  {maritalData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, _, p) => [formatNumber(v), p.payload.name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── SATISFACTION ── */}
      {tab === "Satisfaction" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Object.entries(satCharts).map(([key, data]) => (
            <Card key={key}>
              <h3 className="font-semibold text-slate-700 mb-1">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Score 1 = Low, 4 = Very High
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="score" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip formatter={(v) => [`${v}%`, "Attrition Rate"]} />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                    {data.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.rate > 25
                            ? "#ef4444"
                            : d.rate > 15
                              ? "#f59e0b"
                              : "#10b981"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          ))}
        </div>
      )}

      {/* ── COMPENSATION ── */}
      {tab === "Compensation" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-semibold text-slate-700 mb-1">
              Attrition by Income Band
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Lower income strongly predicts attrition
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={incomeData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="range"
                  width={90}
                  tick={{ fontSize: 9 }}
                />
                <Tooltip formatter={(v) => [`${v}%`, "Attrition Rate"]} />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {incomeData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.rate > 30
                          ? "#ef4444"
                          : d.rate > 20
                            ? "#f59e0b"
                            : "#10b981"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-700 mb-4">
              Avg Income: Attrited vs Retained
            </h3>
            <div className="space-y-6 mt-6">
              {[
                {
                  label: "Retained Employees",
                  value: incomeByAtt.retained,
                  color: "#10b981",
                },
                {
                  label: "Attrited Employees",
                  value: incomeByAtt.attrited,
                  color: "#ef4444",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {item.label}
                    </span>
                    <span
                      className="text-sm font-bold font-mono"
                      style={{ color: item.color }}
                    >
                      ${formatNumber(item.value)}/mo
                    </span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (item.value || 0) / 80)}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-400 pt-2">
                Retained employees earn $
                {formatNumber(
                  (incomeByAtt.retained || 0) - (incomeByAtt.attrited || 0),
                )}
                /mo more on average.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ── CORRELATION ── */}
      {tab === "Correlation" && corrCols.length > 0 && (
        <Card>
          <h3 className="font-semibold text-slate-700 mb-2">
            Feature Correlation Heatmap
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Pearson correlation coefficients — blue = positive, red = negative
          </p>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="w-32 p-1" />
                  {corrCols.map((c) => (
                    <th
                      key={c}
                      className="p-1 font-medium text-slate-500"
                      style={{
                        writingMode: "vertical-rl",
                        height: 80,
                        verticalAlign: "bottom",
                      }}
                    >
                      {c.replace(/([A-Z])/g, " $1").trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrMat.map((row, i) => (
                  <tr key={i}>
                    <td className="p-1.5 text-slate-500 font-medium text-right pr-2 whitespace-nowrap">
                      {corrCols[i].replace(/([A-Z])/g, " $1").trim()}
                    </td>
                    {row.map((val, j) => {
                      const v = val ?? 0;
                      const abs = Math.abs(v);
                      const bg =
                        i === j
                          ? "#e2e8f0"
                          : v > 0
                            ? `rgba(79,107,245,${abs * 0.8})`
                            : `rgba(239,68,68,${abs * 0.8})`;
                      const tc = abs > 0.5 ? "white" : "#334155";
                      return (
                        <td
                          key={j}
                          className="border border-white/50 rounded text-center font-mono min-w-[44px] p-1"
                          style={{ background: bg, color: tc }}
                        >
                          {v.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "Correlation" && corrCols.length === 0 && (
        <Card>
          <p className="text-sm text-slate-400 text-center py-10">
            Correlation data not available.
          </p>
        </Card>
      )}
    </div>
  );
}
