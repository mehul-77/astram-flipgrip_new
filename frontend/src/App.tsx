import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Analytics from './pages/Analytics';
import Simulation from './pages/Simulation';
import Recommender from './pages/Recommender';
import EventDNA from './pages/EventDNA';
import DriftMonitor from './pages/DriftMonitor';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            <Routes>
              <Route path="/" element={<Navigate to="/analytics" replace />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/simulation" element={<Simulation />} />
              <Route path="/recommender" element={<Recommender />} />
              <Route path="/dna" element={<EventDNA />} />
              <Route path="/drift" element={<DriftMonitor />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
