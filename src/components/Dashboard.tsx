import React from 'react';
import { Cpu, RefreshCw, Layers, ShieldCheck, HelpCircle } from 'lucide-react';

interface DashboardProps {
  onTriggerCompetition: () => void;
  isTriggering: boolean;
  workerStates: {
    'Worker A': 'idle' | 'acquiring' | 'locked' | 'failed' | 'released';
    'Worker B': 'idle' | 'acquiring' | 'locked' | 'failed' | 'released';
  };
}

const Dashboard: React.FC<DashboardProps> = ({
  onTriggerCompetition,
  isTriggering,
  workerStates
}) => {
  
  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'acquiring':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse';
      case 'locked':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] font-bold';
      case 'failed':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'released':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Core Controls & Race Visualizer */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20">
              <Cpu size={24} className="animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-slate-100">Redlock Concurrency Manager</h2>
              <p className="text-xs text-slate-400">Manage worker nodes and trigger distributed locks</p>
            </div>
          </div>

          <button
            onClick={onTriggerCompetition}
            disabled={isTriggering}
            className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold px-6 py-3 rounded-xl border border-indigo-400/20 hover:border-indigo-400/40 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw size={18} className={isTriggering ? 'animate-spin' : ''} />
            Trigger Concurrency Race
          </button>
        </div>

        {/* Worker Arena Visualizer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Worker A */}
          <div className={`glass-panel p-5 rounded-xl border transition-all duration-300 relative overflow-hidden ${
            workerStates['Worker A'] === 'locked' ? 'border-violet-500/50 bg-violet-500/5' : 'border-slate-800'
          }`}>
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl" />
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-xs text-violet-400 font-bold tracking-wider">INSTANCE_01</span>
              <span className={`text-xs px-2.5 py-1 rounded-md font-mono border uppercase tracking-wider ${getStatusBadge(workerStates['Worker A'])}`}>
                {workerStates['Worker A']}
              </span>
            </div>
            <h4 className="text-lg font-semibold text-slate-200">Worker Node Alpha</h4>
            <p className="text-xs text-slate-400 mt-1">Queries mock third-party source & pushes to sorted set.</p>
            <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center text-xs text-slate-500 font-mono">
              <span>Lock Key:</span>
              <span className="text-slate-400">locks:cron-job-1min</span>
            </div>
          </div>

          {/* Worker B */}
          <div className={`glass-panel p-5 rounded-xl border transition-all duration-300 relative overflow-hidden ${
            workerStates['Worker B'] === 'locked' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800'
          }`}>
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-xs text-emerald-400 font-bold tracking-wider">INSTANCE_02</span>
              <span className={`text-xs px-2.5 py-1 rounded-md font-mono border uppercase tracking-wider ${getStatusBadge(workerStates['Worker B'])}`}>
                {workerStates['Worker B']}
              </span>
            </div>
            <h4 className="text-lg font-semibold text-slate-200">Worker Node Beta</h4>
            <p className="text-xs text-slate-400 mt-1">Simultaneous cron instance competing for the same lock.</p>
            <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center text-xs text-slate-500 font-mono">
              <span>Lock Key:</span>
              <span className="text-slate-400">locks:cron-job-1min</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Parameters & Redlock Mechanics Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Redlock Parameters Card */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-2.5 text-indigo-400 mb-3">
            <Layers size={18} />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-200">Redlock Specs</h3>
          </div>
          <div className="space-y-2 text-xs font-mono text-slate-400">
            <div className="flex justify-between border-b border-slate-900 pb-1">
              <span>retryCount:</span>
              <span className="text-emerald-400 font-bold">0 (No retries)</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1">
              <span>driftFactor:</span>
              <span className="text-slate-300">0.01</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1">
              <span>retryDelay:</span>
              <span className="text-slate-300">200 ms</span>
            </div>
            <div className="flex justify-between">
              <span>Lock TTL:</span>
              <span className="text-indigo-400 font-bold">4 Minutes</span>
            </div>
          </div>
        </div>

        {/* Distributed Consensus Card */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-2.5 text-emerald-400 mb-2">
            <ShieldCheck size={18} />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-200">Atoms & Safety</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            By setting <code className="text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded font-mono">retryCount: 0</code>, other instances immediately fail and drop out instead of waiting, guaranteeing that duplicate cron jobs are avoided.
          </p>
        </div>

        {/* How It Works Card */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-2.5 text-purple-400 mb-2">
            <HelpCircle size={18} />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-200">Sorted Set Order</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Items are pushed using <code className="text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded font-mono">zAdd</code> with a score of <code className="text-slate-300">Date.now()</code>. Redis orders them atomically, ensuring chronologically ordered logs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
