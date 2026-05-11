// Format number with commas
export const formatNumber = (n, decimals = 0) => {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// Format as percentage
export const formatPct = (n, decimals = 1) => {
  if (n === null || n === undefined) return '—';
  return `${(Number(n) * 100).toFixed(decimals)}%`;
};

// Format currency
export const formatCurrency = (n) => {
  if (n === null || n === undefined) return '—';
  return `$${formatNumber(n)}`;
};

// Risk level color helpers
export const riskColors = {
  Low: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', dot: '#10b981' },
  Medium: { bg: '#fef3c7', text: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  High: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', dot: '#ef4444' },
  Critical: { bg: '#f3e8ff', text: '#581c87', border: '#e9d5ff', dot: '#7c3aed' },
};

export const getRiskColor = (level) => riskColors[level] || riskColors.Medium;

// Model colors
export const modelColors = {
  RandomForest: '#10b981',
  XGBoost: '#4F6BF5',
  LightGBM: '#f59e0b',
};

// Chart color palette
export const CHART_COLORS = ['#4F6BF5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

// Format metric name for display
export const formatMetricName = (key) => {
  const map = {
    accuracy: 'Accuracy',
    f1_score: 'F1 Score',
    roc_auc: 'ROC-AUC',
    precision: 'Precision',
    recall: 'Recall',
    specificity: 'Specificity',
    cv_roc_auc_mean: 'CV ROC-AUC',
    cv_f1_mean: 'CV F1',
    training_time: 'Train Time (s)',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

// Download helper
export const downloadURL = (url, filename) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// Clamp value
export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// Truncate text
export const truncate = (str, n = 30) => str?.length > n ? str.slice(0, n) + '…' : str;
