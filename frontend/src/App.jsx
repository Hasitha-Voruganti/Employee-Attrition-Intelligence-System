import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/shared/Sidebar';
import Overview from './components/dashboard/Overview';
import Training from './components/dashboard/Training';
import ModelComparison from './components/dashboard/ModelComparison';
import EDAAnalytics from './components/dashboard/EDAAnalytics';
import PredictAttrition from './components/prediction/PredictAttrition';
import Explainability from './components/dashboard/Explainability';
import Reports from './components/dashboard/Reports';
import { healthAPI } from './services/api';

export default function App() {
  const [modelStatus, setModelStatus] = useState('idle');
  useEffect(() => {
    healthAPI.check().then(d => setModelStatus(d.model_status||'idle')).catch(()=>setModelStatus('idle'));
  }, []);
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar modelStatus={modelStatus} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/"               element={<Overview />} />
            <Route path="/training"       element={<Training onStatusChange={setModelStatus} />} />
            <Route path="/models"         element={<ModelComparison />} />
            <Route path="/analytics"      element={<EDAAnalytics />} />
            <Route path="/predict"        element={<PredictAttrition />} />
            <Route path="/explainability" element={<Explainability />} />
            <Route path="/reports"        element={<Reports />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
