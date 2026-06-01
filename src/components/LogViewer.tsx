import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2, ShieldAlert } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: string;
  worker: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'init';
}

interface LogViewerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, onClearLogs }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Smoothly scroll to bottom on new logs
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getWorkerBadgeStyle = (worker: string) => {
    switch (worker) {
      case 'Worker A':
        return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
      case 'Worker B':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Cron Schedule':
        return 'bg-pink-500/10 text-pink-400 border border-pink-500/20';
      case 'System':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'Rate Limiter':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const getLogMessageStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-emerald-300 font-medium';
      case 'warning':
        return 'text-amber-400 font-medium';
      case 'error':
        return 'text-rose-400 font-semibold';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-[400px]">
      {/* Terminal Header */}
      <div className="bg-slate-900/80 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
          </div>
          <span className="text-slate-500 px-2">|</span>
          <div className="flex items-center gap-2 text-slate-300 font-mono text-sm font-semibold">
            <Terminal size={16} className="text-indigo-400" />
            Live Redlock Event Stream
          </div>
        </div>
        
        <button
          onClick={onClearLogs}
          disabled={logs.length === 0}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 disabled:opacity-40 disabled:hover:text-slate-400 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/50 transition-all font-mono"
        >
          <Trash2 size={13} />
          Clear Console
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 p-5 overflow-y-auto font-mono text-xs md:text-sm space-y-3 bg-slate-950/60 scroll-smooth">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
            <ShieldAlert size={28} className="text-slate-600 animate-pulse" />
            <p>Console is silent. Trigger the competition to stream Redlock races!</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex flex-col md:flex-row md:items-start gap-2 md:gap-3 py-1 border-b border-slate-900/50 hover:bg-slate-900/20 px-1 rounded transition-all">
              {/* Timestamp */}
              <span className="text-slate-500 shrink-0 font-semibold select-none">
                [{log.timestamp}]
              </span>

              {/* Worker Badge */}
              <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-semibold shrink-0 uppercase tracking-wider text-center w-28 md:w-auto ${getWorkerBadgeStyle(log.worker)}`}>
                {log.worker}
              </span>

              {/* Message */}
              <span className={`break-words ${getLogMessageStyle(log.type)}`}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};

export default LogViewer;
