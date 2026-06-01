import { useState, useEffect } from 'react';
import { ShieldAlert, Zap, RefreshCw, Send, CheckCircle, AlertTriangle } from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:5000/api`;

interface LogItem {
  id: string;
  time: string;
  allowed: boolean;
  tokensLeft: number;
  status: number;
}

export default function RateLimiterSandbox() {
  const [clientId, setClientId] = useState<string>('');
  const [tokens, setTokens] = useState<number>(10.0);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isStressTesting, setIsStressTesting] = useState<boolean>(false);

  // Generate random Client ID on load
  useEffect(() => {
    setClientId(`client_${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
  }, []);

  // Poll a basic fetch or update local token display to simulate dynamic refilling
  useEffect(() => {
    const refillInterval = setInterval(() => {
      setTokens(prev => {
        // Refill 2 tokens per second (0.002 tokens/ms * 100ms interval = 0.2 tokens)
        const next = prev + 0.2;
        return next > 10.0 ? 10.0 : next;
      });
    }, 100);

    return () => clearInterval(refillInterval);
  }, []);

  const fireRequest = async () => {
    if (!clientId) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/rate-limit-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId })
      });

      const data = await res.json();
      const time = new Date().toLocaleTimeString();

      if (res.ok) {
        setTokens(data.remainingTokens);
        setLogs(prev => [
          {
            id: Math.random().toString(),
            time,
            allowed: true,
            tokensLeft: data.remainingTokens,
            status: 200
          },
          ...prev
        ].slice(0, 15));
      } else {
        setTokens(data.remainingTokens || 0);
        setLogs(prev => [
          {
            id: Math.random().toString(),
            time,
            allowed: false,
            tokensLeft: data.remainingTokens || 0,
            status: 429
          },
          ...prev
        ].slice(0, 15));
      }
    } catch (err) {
      console.error('Rate limit test request failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStressTest = async () => {
    if (isStressTesting) return;
    setIsStressTesting(true);

    // Fire 15 requests in rapid sequence with a 80ms spacing
    for (let i = 0; i < 15; i++) {
      fireRequest();
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    setIsStressTesting(false);
  };

  const handleClearLogs = () => {
    setLogs([]);
    setTokens(10.0);
  };

  const percentFill = (tokens / 10.0) * 100;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Card */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
            <Zap size={24} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-wide text-slate-100 flex items-center gap-2">
              Distributed Lua Rate Limiter
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Lua Atomic
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Simulate high-frequency requests running against a thread-safe, atomic **Token Bucket Algorithm** written in Lua.
            </p>
          </div>
        </div>
      </div>

      {/* Main Sandbox Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Controller & Interactive Refill Cylinder */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Rate Limit Sandbox</h3>
              <p className="text-[10px] text-slate-400">Set a client ID, trigger requests, and inspect bucket capacity.</p>
            </div>
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-lg text-[10px] font-mono text-slate-400 hover:text-slate-200 transition"
            >
              <RefreshCw size={10} /> Reset Bucket
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4">
            {/* Visual Token Refill Cylinder */}
            <div className="flex flex-col items-center justify-center gap-3">
              <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-slate-400">Token Bucket Refill</span>
              
              {/* Outer Cylinder container */}
              <div className="relative w-28 h-64 bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden flex items-end shadow-2xl">
                {/* Liquid Fill */}
                <div
                  className="w-full bg-gradient-to-t from-indigo-600/90 to-cyan-400/90 transition-all duration-300 relative"
                  style={{ height: `${percentFill}%` }}
                >
                  {/* Wave micro-animation layer */}
                  {tokens > 0 && (
                    <div className="absolute -top-1 left-0 right-0 h-1 bg-white/20 animate-pulse rounded-t-full" />
                  )}
                </div>

                {/* Absolute overlay elements */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-white font-mono tracking-tighter filter drop-shadow">
                    {tokens.toFixed(1)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest font-mono">
                    / 10 tokens
                  </span>
                </div>
              </div>

              <span className="text-[9px] font-mono text-slate-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                Refilling: +2 tokens / sec
              </span>
            </div>

            {/* Sandbox triggers */}
            <div className="space-y-6">
              {/* Client Id input */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Client ID / Target Key</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Enter unique client identifier..."
                  className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-3">
                {/* Single Fire button */}
                <button
                  onClick={fireRequest}
                  disabled={loading || isStressTesting || !clientId}
                  className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 py-3 rounded-xl text-xs font-semibold text-slate-200 tracking-wide transition shadow-md disabled:opacity-50"
                >
                  <Send size={14} className="text-indigo-400" />
                  Send Single Request
                </button>

                {/* Stress test button */}
                <button
                  onClick={handleStressTest}
                  disabled={isStressTesting || !clientId}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 py-3 rounded-xl text-xs font-bold text-white tracking-wide transition shadow-lg shadow-indigo-500/15 disabled:opacity-50"
                >
                  <Zap size={14} className="text-amber-300 animate-bounce" />
                  Trigger Stress Test (15 Req)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Real-time Request Logs */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 flex flex-col h-[400px]">
          <div className="border-b border-slate-900 pb-3 mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
              <ShieldAlert size={14} className="text-indigo-400" />
              API Sandbox Request Logs
            </h3>
            <span className="text-[9px] font-mono text-slate-400">Capped (15)</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 py-10">
                <Send size={20} className="text-slate-600 animate-pulse" />
                <p className="text-[10px] font-mono text-slate-500 text-center">Fired request events will stream here...</p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    log.allowed
                      ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-300'
                      : 'bg-red-500/5 border-red-500/15 text-red-300 animate-shake'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {log.allowed ? (
                      <CheckCircle size={14} className="text-emerald-400" />
                    ) : (
                      <AlertTriangle size={14} className="text-red-400 animate-bounce" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-bold">
                        {log.allowed ? '200 OK' : '429 TOO MANY REQUESTS'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">{log.time}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold bg-slate-950/60 border border-slate-900 px-2 py-0.5 rounded text-slate-300">
                    Remaining: {log.tokensLeft.toFixed(1)}/10
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
