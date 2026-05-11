import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Brain, BarChart3, UserCheck,
  FileDown, Activity, Cpu, ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/training', label: 'Model Training', icon: Cpu },
  { to: '/models', label: 'Model Comparison', icon: BarChart3 },
  { to: '/analytics', label: 'EDA Analytics', icon: Activity },
  { to: '/predict', label: 'Predict Attrition', icon: UserCheck },
  { to: '/explainability', label: 'Explainability', icon: Brain },
  { to: '/reports', label: 'Reports', icon: FileDown },
];

export default function Sidebar({ modelStatus }) {
  const statusColor = {
    idle: 'bg-slate-400',
    training: 'bg-amber-500 animate-pulse',
    complete: 'bg-green-500',
    error: 'bg-red-500',
  }[modelStatus] || 'bg-slate-400';

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-slate-100 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">AttritionIQ</p>
            <p className="text-[10px] text-slate-400">HR Intelligence Platform</p>
          </div>
        </div>
      </div>

      {/* Model Status Pill */}
      <div className="mx-4 mt-4 mb-2 px-3 py-2 bg-slate-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Model Status</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
            <span className="text-xs font-semibold text-slate-700 capitalize">{modelStatus || 'idle'}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 mt-2">Navigation</p>
        <ul className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 text-brand-400" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400">IBM HR Analytics Dataset</p>
        <p className="text-[10px] text-slate-300 mt-0.5">© 2025 AttritionIQ v1.0</p>
      </div>
    </aside>
  );
}
