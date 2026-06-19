import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Map, ShieldAlert, Fingerprint, ActivitySquare, Menu, X, Layers, AlertOctagon, Scale, Moon, AlertTriangle } from 'lucide-react';

const navItems = [
  { name: 'Analytics Command', path: '/analytics', icon: Activity },
  { name: 'Simulation Sandbox', path: '/simulation', icon: Map },
  { name: 'Resource Recommender', path: '/recommender', icon: ShieldAlert },
  { name: 'Event DNA Matcher', path: '/dna', icon: Fingerprint },
  { name: 'Drift Monitor', path: '/drift', icon: ActivitySquare },
  { name: 'Zone Stress', path: '/stress', icon: Layers },
  { name: 'Chronic Problems', path: '/chronic', icon: AlertOctagon },
  { name: 'Workload Balancer', path: '/workload', icon: Scale },
  { name: 'Night Intelligence', path: '/nightshift', icon: Moon },
  { name: 'Precursor Warnings', path: '/precursor', icon: AlertTriangle },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 p-4 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[inset_0_0_20px_rgba(249,115,22,0.05)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="font-medium text-sm">{item.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/50 shrink-0">
        <Map className="w-6 h-6 text-orange-400" />
      </div>
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
          ASTRAM
        </h1>
        <p className="text-[10px] text-slate-400 tracking-wider">TRAFFIC COMMAND</p>
      </div>
    </div>
  );
}

function SystemStatus() {
  return (
    <div className="p-4 m-4 rounded-xl bg-slate-900/80 border border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-xs text-slate-400">Bengaluru Police · ASTRAM</span>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 glass-panel m-4 flex-col rounded-2xl overflow-hidden border-r-0 shrink-0">
        <div className="p-6 border-b border-slate-800">
          <Brand />
        </div>
        <NavItems />
        <SystemStatus />
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <Brand />
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <Brand />
          <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <NavItems onNavigate={() => setMobileOpen(false)} />
        <SystemStatus />
      </div>

      {/* Mobile content offset */}
      <div className="md:hidden h-[60px] shrink-0" />
    </>
  );
}
