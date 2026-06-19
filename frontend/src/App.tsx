import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import CardNav from './components/CardNav';
import type { CardNavItem } from './components/CardNav';
import Analytics from './pages/Analytics';
import Simulation from './pages/Simulation';
import Recommender from './pages/Recommender';
import EventDNA from './pages/EventDNA';
import DriftMonitor from './pages/DriftMonitor';
import ZoneStress from './pages/ZoneStress';
import ChronicProblems from './pages/ChronicProblems';
import WorkloadBalancer from './pages/WorkloadBalancer';
import NightShift from './pages/NightShift';
import PrecursorWarning from './pages/PrecursorWarning';

const navItems: CardNavItem[] = [
  {
    label: "Monitor",
    bgColor: "#111113",
    textColor: "#e4e4e7",
    links: [
      { label: "Analytics", href: "/analytics", ariaLabel: "Analytics Command Center" },
      { label: "Drift Monitor", href: "/drift", ariaLabel: "Drift Monitor" },
      { label: "Zone Stress", href: "/stress", ariaLabel: "Zone Stress Score" },
      { label: "Chronic Problems", href: "/chronic", ariaLabel: "Chronic Problem Detector" }
    ]
  },
  {
    label: "Simulate",
    bgColor: "#131316",
    textColor: "#e4e4e7",
    links: [
      { label: "Sandbox", href: "/simulation", ariaLabel: "Simulation Sandbox" },
      { label: "Event DNA", href: "/dna", ariaLabel: "Event DNA Matcher" },
      { label: "Precursor Warnings", href: "/precursor", ariaLabel: "Precursor Event Warning" },
      { label: "Night Intelligence", href: "/nightshift", ariaLabel: "Night Shift Intelligence Panel" }
    ]
  },
  {
    label: "Optimize",
    bgColor: "#141410",
    textColor: "#e4e4e7",
    links: [
      { label: "Recommender", href: "/recommender", ariaLabel: "Resource Recommender" },
      { label: "Workload Balancer", href: "/workload", ariaLabel: "Police Station Workload Balancer" }
    ]
  }
];

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/analytics" replace />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/recommender" element={<Recommender />} />
          <Route path="/dna" element={<EventDNA />} />
          <Route path="/drift" element={<DriftMonitor />} />
          <Route path="/stress" element={<ZoneStress />} />
          <Route path="/chronic" element={<ChronicProblems />} />
          <Route path="/workload" element={<WorkloadBalancer />} />
          <Route path="/nightshift" element={<NightShift />} />
          <Route path="/precursor" element={<PrecursorWarning />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-app-dark">
        <CardNav
          items={navItems}
          baseColor="rgba(9, 9, 11, 0.92)"
          menuColor="#71717a"
        />
        <main className="pt-20 px-4 md:px-8 pb-12">
          <div className="max-w-[1200px] mx-auto">
            <AnimatedRoutes />
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
