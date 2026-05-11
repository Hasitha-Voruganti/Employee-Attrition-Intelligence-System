import React from 'react';
import { AlertCircle, CheckCircle, Clock, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Card ───────────────────────────────────────────────────────────────────
export const Card = ({ children, className = '', hover = false }) => (
  <div className={`bg-white rounded-xl border border-slate-100 p-6 shadow-sm ${hover ? 'transition-shadow hover:shadow-md' : ''} ${className}`}>
    {children}
  </div>
);

// ─── Stat Card ───────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, icon: Icon, color = 'brand', trend, trendVal }) => {
  const colorMap = {
    brand: { bg: 'bg-brand-50', text: 'text-brand-600', val: 'text-brand-700' },
    green: { bg: 'bg-green-50', text: 'text-green-600', val: 'text-green-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', val: 'text-amber-700' },
    red: { bg: 'bg-red-50', text: 'text-red-600', val: 'text-red-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', val: 'text-purple-700' },
  };
  const c = colorMap[color] || colorMap.brand;
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${c.val}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${c.bg}`}>
            <Icon className={`w-5 h-5 ${c.text}`} />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend === 'up' ? <TrendingUp className="w-3 h-3 text-red-500" /> : trend === 'down' ? <TrendingDown className="w-3 h-3 text-green-500" /> : <Minus className="w-3 h-3 text-slate-400" />}
          <span className={trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-slate-500'}>{trendVal}</span>
        </div>
      )}
    </div>
  );
};

// ─── Badge ───────────────────────────────────────────────────────────────────
export const RiskBadge = ({ level }) => {
  const styles = {
    Low: 'bg-green-100 text-green-800 border-green-200',
    Medium: 'bg-amber-100 text-amber-800 border-amber-200',
    High: 'bg-red-100 text-red-800 border-red-200',
    Critical: 'bg-purple-100 text-purple-800 border-purple-200',
  };
  const dots = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444', Critical: '#7c3aed' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[level] || styles.Medium}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dots[level] }} />
      {level}
    </span>
  );
};

// ─── Loading Spinner ─────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };
  return <Loader2 className={`animate-spin text-brand-500 ${sizes[size]} ${className}`} />;
};

// ─── Loading State ────────────────────────────────────────────────────────────
export const LoadingCard = ({ message = 'Loading...' }) => (
  <div className="bg-white rounded-xl border border-slate-100 p-10 flex flex-col items-center justify-center gap-3">
    <Spinner size="lg" />
    <p className="text-sm text-slate-500">{message}</p>
  </div>
);

// ─── Error State ──────────────────────────────────────────────────────────────
export const ErrorCard = ({ message, onRetry }) => (
  <div className="bg-white rounded-xl border border-red-100 p-8 flex flex-col items-center gap-3">
    <AlertCircle className="w-10 h-10 text-red-400" />
    <p className="text-sm text-slate-600 text-center">{message}</p>
    {onRetry && <button onClick={onRetry} className="btn-primary text-sm">Retry</button>}
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, desc, action }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    {Icon && <div className="p-4 bg-slate-100 rounded-full"><Icon className="w-8 h-8 text-slate-400" /></div>}
    <h3 className="font-semibold text-slate-700">{title}</h3>
    {desc && <p className="text-sm text-slate-500 text-center max-w-xs">{desc}</p>}
    {action}
  </div>
);

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export const ProgressBar = ({ value, max = 100, color = '#4F6BF5', showLabel = true, height = 8 }) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-100 rounded-full overflow-hidden" style={{ height }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && <span className="text-xs font-mono text-slate-500 w-10 text-right">{pct.toFixed(1)}%</span>}
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
export const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h2 className="font-display text-2xl text-slate-800">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// ─── Metric Pill ──────────────────────────────────────────────────────────────
export const MetricPill = ({ label, value, good = true }) => (
  <div className={`flex flex-col items-center p-3 rounded-lg ${good ? 'bg-green-50' : 'bg-red-50'}`}>
    <span className={`text-xl font-bold ${good ? 'text-green-700' : 'text-red-700'}`}>{value}</span>
    <span className="text-xs text-slate-500 mt-0.5">{label}</span>
  </div>
);

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
export const TabBar = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
    {tabs.map(tab => (
      <button
        key={tab.value}
        onClick={() => onChange(tab.value)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          active === tab.value
            ? 'bg-white text-brand-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-800'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// ─── Alert ────────────────────────────────────────────────────────────────────
export const Alert = ({ type = 'info', children }) => {
  const styles = {
    info: 'bg-brand-50 border-brand-200 text-brand-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };
  const icons = {
    info: <AlertCircle className="w-4 h-4 flex-shrink-0" />,
    success: <CheckCircle className="w-4 h-4 flex-shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 flex-shrink-0" />,
  };
  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border text-sm ${styles[type]}`}>
      {icons[type]}
      <div>{children}</div>
    </div>
  );
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────
export const Tooltip = ({ children, tip }) => (
  <div className="relative group inline-block">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
      {tip}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
    </div>
  </div>
);
