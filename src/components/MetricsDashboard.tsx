import { useState, useEffect } from 'react';
import { Database, Activity, BarChart2, Radio, Server } from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:5000/api`;

interface TelemetryData {
  memory: {
    usedBytes: number;
    usedHuman: string;
    peakBytes: number;
    peakHuman: string;
    fragmentation: number;
  };
  clients: {
    connected: number;
    blocked: number;
  };
  throughput: {
    opsPerSec: number;
    commandsProcessed: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRatio: number;
  };
  system: {
    uptimeSeconds: number;
    role: string;
    version: string;
  };
}

export default function MetricsDashboard() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opsHistory, setOpsHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);

  // Poll telemetry stats every 1.5 seconds
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch(`${API_BASE}/redis/telemetry`);
        const data = await res.json();
        if (data.success) {
          setTelemetry(data.telemetry);
          setError(null);

          // Update histories
          setOpsHistory(prev => {
            const next = [...prev, data.telemetry.throughput.opsPerSec];
            return next.slice(-20); // Keep last 20 elements
          });

          setMemHistory(prev => {
            const next = [...prev, data.telemetry.memory.usedBytes];
            return next.slice(-20); // Keep last 20 elements
          });
        }
      } catch (err: any) {
        console.error('Telemetry error:', err);
        setError('Unable to fetch live Redis telemetry. Make sure Redis container is up.');
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 1500);
    return () => clearInterval(interval);
  }, []);

  // Helper to construct SVG Path for custom sparkline
  const generateSparklinePath = (points: number[], width: number, height: number) => {
    if (points.length < 2) return '';
    const maxVal = Math.max(...points, 1);
    const minVal = Math.min(...points, 0);
    const range = maxVal - minVal;

    const usableHeight = height - 10;
    const paddingY = 5;

    const mapped = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      // Invert Y since (0,0) is top-left
      const y = height - paddingY - ((val - minVal) / range) * usableHeight;
      return `${x},${y}`;
    });

    return `M ${mapped.join(' L ')}`;
  };

  const getUptimeString = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  if (error) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-red-500/20 bg-red-950/10 text-center">
        <Activity className="mx-auto text-red-400 mb-3 animate-pulse" size={32} />
        <h3 className="text-lg font-bold text-red-200">Observability Offline</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">{error}</p>
      </div>
    );
  }

  if (!telemetry) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-mono">Parsing Redis internal telemetry...</p>
      </div>
    );
  }

  const maxOps = Math.max(...opsHistory, 10);
  const maxMem = Math.max(...memHistory, 1024 * 1024);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Banner */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
            <Radio size={24} className="text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-wide text-slate-100 flex items-center gap-2">
              Redis Live Telemetry Dashboard
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Redis v{telemetry.system.version} • Role: {telemetry.system.role} • Uptime: {getUptimeString(telemetry.system.uptimeSeconds)}
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Glowing KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI: Memory Usage */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-3 right-3 text-indigo-500/20"><Database size={36} /></div>
          <p className="text-[10px] tracking-wider uppercase font-bold text-indigo-400 font-mono">Memory Allocation</p>
          <p className="text-2xl font-black mt-2 text-slate-100 tracking-tight font-mono">
            {telemetry.memory.usedHuman}
          </p>
          <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-400 border-t border-slate-900/50 pt-2 font-mono">
            <span className="text-slate-300">Peak: {telemetry.memory.peakHuman}</span>
            <span>•</span>
            <span className="text-slate-300">Frag: {telemetry.memory.fragmentation.toFixed(2)}</span>
          </div>
        </div>

        {/* KPI: Throughput Operations */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-3 right-3 text-emerald-500/20"><Activity size={36} /></div>
          <p className="text-[10px] tracking-wider uppercase font-bold text-emerald-400 font-mono">Ops / Throughput</p>
          <p className="text-2xl font-black mt-2 text-slate-100 tracking-tight font-mono">
            {telemetry.throughput.opsPerSec} <span className="text-xs font-semibold text-slate-400">ops/s</span>
          </p>
          <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-400 border-t border-slate-900/50 pt-2 font-mono">
            <span className="text-slate-300">Total processed: {telemetry.throughput.commandsProcessed.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI: Client Connections */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-3 right-3 text-cyan-500/20"><Server size={36} /></div>
          <p className="text-[10px] tracking-wider uppercase font-bold text-cyan-400 font-mono">Client Load</p>
          <p className="text-2xl font-black mt-2 text-slate-100 tracking-tight font-mono">
            {telemetry.clients.connected} <span className="text-xs font-semibold text-slate-400">active</span>
          </p>
          <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-400 border-t border-slate-900/50 pt-2 font-mono">
            <span className="text-amber-400">Blocked: {telemetry.clients.blocked}</span>
            <span>•</span>
            <span className="text-slate-300">Sentinel: inactive</span>
          </div>
        </div>

        {/* KPI: Cache Hit Ratio */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-3 right-3 text-rose-500/20"><BarChart2 size={36} /></div>
          <p className="text-[10px] tracking-wider uppercase font-bold text-rose-400 font-mono">Cache Hit Ratio</p>
          <p className="text-2xl font-black mt-2 text-slate-100 tracking-tight font-mono">
            {telemetry.cache.hitRatio.toFixed(1)}<span className="text-xs font-semibold text-slate-400">%</span>
          </p>
          <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-400 border-t border-slate-900/50 pt-2 font-mono">
            <span className="text-slate-300">Hits: {telemetry.cache.hits}</span>
            <span>•</span>
            <span className="text-slate-300">Misses: {telemetry.cache.misses}</span>
          </div>
        </div>
      </div>

      {/* Sparkline Charts (Telemetry trends) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ops Sparkline */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              Throughput Speed (Ops/Sec)
            </h3>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/25">
              Max: {maxOps} ops/s
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex items-center justify-center relative h-36">
            {opsHistory.length < 2 ? (
              <p className="text-[10px] font-mono text-slate-500">Buffering datapoints...</p>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                {/* Gradient background */}
                <defs>
                  <linearGradient id="opsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d={`${generateSparklinePath(opsHistory, 300, 100)} L 300 100 L 0 100 Z`}
                  fill="url(#opsGrad)"
                />
                <path
                  d={generateSparklinePath(opsHistory, 300, 100)}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Memory Sparkline */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
              Memory Allocation (Bytes)
            </h3>
            <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/25">
              Max: {(maxMem / 1024).toFixed(1)} KB
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex items-center justify-center relative h-36">
            {memHistory.length < 2 ? (
              <p className="text-[10px] font-mono text-slate-500">Buffering datapoints...</p>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d={`${generateSparklinePath(memHistory, 300, 100)} L 300 100 L 0 100 Z`}
                  fill="url(#memGrad)"
                />
                <path
                  d={generateSparklinePath(memHistory, 300, 100)}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
