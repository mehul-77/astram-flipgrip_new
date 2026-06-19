import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="surface p-12 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]"
    >
      <div className="text-zinc-700">{icon}</div>
      <div>
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        <p className="text-xs text-zinc-600 mt-1 max-w-[280px] leading-relaxed">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}
