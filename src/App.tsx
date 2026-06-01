import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import type { SortedSetItem } from './components/ItemsList';
import type { LogEntry } from './components/LogViewer';
import ItemsList from './components/ItemsList';
import LogViewer from './components/LogViewer';
import QueueDashboard from './components/QueueDashboard';
import MetricsDashboard from './components/MetricsDashboard';
import RateLimiterSandbox from './components/RateLimiterSandbox';
import { Layers, ShieldCheck, Cpu, BarChart2, Zap } from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:5000/api`;

type TabType = 'redlock' | 'queue' | 'metrics' | 'limiter';

function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('redlock');

  // Redlock Concurrency States
  const [items, setItems] = useState<SortedSetItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [workerStates, setWorkerStates] = useState<{
    'Worker A': 'idle' | 'acquiring' | 'locked' | 'failed' | 'released';
    'Worker B': 'idle' | 'acquiring' | 'locked' | 'failed' | 'released';
  }>({
    'Worker A': 'idle',
    'Worker B': 'idle',
  });

  // Redis Queue States
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);

  // Common Live SSE Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Fetch Redlock items
  const fetchItems = async () => {
    try {
      setIsLoadingItems(true);
      const res = await fetch(`${API_BASE}/items`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (err) {
      console.error('Failed to fetch Redis items:', err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Fetch Queue status
  const fetchQueueStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/queue/status`);
      const data = await res.json();
      if (data.success) {
        setQueueStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch Redis queue status:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  // Establish SSE stream and fetch initial states
  useEffect(() => {
    fetchItems();
    fetchQueueStatus();

    const eventSource = new EventSource(`${API_BASE}/logs`);

    eventSource.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);

        if (log.type === 'init') {
          setLogs(log.logs);
          return;
        }

        // Append new live log entry
        setLogs((prev) => [...prev, log]);

        // Refresh queue state if queue worker logs or rate limits arrive
        const { worker, message } = log;
        if (worker.startsWith('Queue Worker') || worker === 'System' || worker === 'Rate Limiter') {
          fetchQueueStatus();
        }

        // Parse Redlock states dynamically from logs
        if (worker === 'Worker A' || worker === 'Worker B') {
          const wKey = worker as 'Worker A' | 'Worker B';
          if (message.includes('Attempting to acquire')) {
            setWorkerStates((prev) => ({ ...prev, [wKey]: 'acquiring' }));
          } else if (message.includes('LOCK ACQUIRED')) {
            setWorkerStates((prev) => ({ ...prev, [wKey]: 'locked' }));
            setTimeout(fetchItems, 100); 
          } else if (message.includes('Redlock blocked')) {
            setWorkerStates((prev) => ({ ...prev, [wKey]: 'failed' }));
            setTimeout(() => {
              setWorkerStates((prev) => ({
                ...prev,
                [wKey]: prev[wKey] === 'failed' ? 'idle' : prev[wKey]
              }));
            }, 5000);
          } else if (message.includes('Lock released')) {
            setWorkerStates((prev) => ({ ...prev, [wKey]: 'released' }));
            setTimeout(() => {
              setWorkerStates((prev) => ({
                ...prev,
                [wKey]: prev[wKey] === 'released' ? 'idle' : prev[wKey]
              }));
            }, 3000);
          }
        }
      } catch (err) {
        console.error('Error parsing SSE log stream:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error. Retrying...', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Poll Queue status periodically when the Queue tab is active
  useEffect(() => {
    if (activeTab !== 'queue') return;

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 1500);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Trigger Redlock competition
  const handleTriggerCompetition = async () => {
    try {
      setIsTriggering(true);
      setWorkerStates({ 'Worker A': 'idle', 'Worker B': 'idle' });
      
      const res = await fetch(`${API_BASE}/trigger`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        console.error('Failed to trigger competition:', data.error);
      }
    } catch (err) {
      console.error('Error triggering competition:', err);
    } finally {
      setTimeout(() => setIsTriggering(false), 3000);
    }
  };

  // Clear Redis Sorted Set items (Redlock)
  const handleClearDb = async () => {
    if (!window.confirm('Are you sure you want to flush all items from the Redis sorted set?')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/items`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setItems([]);
        setLogs([]);
      }
    } catch (err) {
      console.error('Error flushing database:', err);
    }
  };

  // Enqueue new task (Queue)
  const handleEnqueue = async (type: string, duration: number, forceFailure: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/queue/enqueue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, duration, forceFailure })
      });
      const data = await res.json();
      if (data.success) {
        fetchQueueStatus();
      }
    } catch (err) {
      console.error('Failed to enqueue task:', err);
    }
  };

  // Toggle worker state (Queue)
  const handleToggleWorker = async (workerName: string, targetState: 'active' | 'stopped') => {
    try {
      const res = await fetch(`${API_BASE}/queue/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerName, state: targetState })
      });
      const data = await res.json();
      if (data.success) {
        fetchQueueStatus();
      }
    } catch (err) {
      console.error('Failed to toggle worker state:', err);
    }
  };

  // Flush entire queue database
  const handleClearQueue = async () => {
    try {
      const res = await fetch(`${API_BASE}/queue`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchQueueStatus();
        setLogs([]);
      }
    } catch (err) {
      console.error('Failed to clear queue database:', err);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const isFullWidthTab = activeTab === 'metrics' || activeTab === 'limiter';

  return (
    <div className="min-h-screen pb-16 px-4 md:px-8">
      {/* Premium Header */}
      <div className="w-full flex justify-center py-8">
        <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur border border-slate-800 px-6 py-2.5 rounded-full shadow-2xl">
          <Layers size={18} className="text-indigo-400 animate-pulse" />
          <h1 className="text-sm font-semibold tracking-wider uppercase bg-gradient-to-r from-indigo-200 via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Distributed Redis Architecture Panel
          </h1>
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        </div>
      </div>

      {/* Modern 4-Tab Navigation Bar */}
      <div className="w-full flex justify-center mb-8">
        <div className="flex flex-wrap justify-center bg-slate-950/60 backdrop-blur border border-slate-900 p-1.5 rounded-2xl gap-2 shadow-2xl max-w-full">
          <button
            onClick={() => setActiveTab('redlock')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold tracking-wide transition-all duration-300 ${
              activeTab === 'redlock'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <ShieldCheck size={16} />
            Distributed Locks
          </button>
          
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold tracking-wide transition-all duration-300 ${
              activeTab === 'queue'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Layers size={16} />
            Task Queue (FIFO)
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold tracking-wide transition-all duration-300 ${
              activeTab === 'metrics'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <BarChart2 size={16} />
            System Metrics
          </button>

          <button
            onClick={() => setActiveTab('limiter')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold tracking-wide transition-all duration-300 ${
              activeTab === 'limiter'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Zap size={16} />
            Rate Limiter
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto">
        {isFullWidthTab ? (
          // Full-width view for Telemetry & Rate Limiting Sandbox
          <div className="w-full">
            {activeTab === 'metrics' ? <MetricsDashboard /> : <RateLimiterSandbox />}
          </div>
        ) : (
          // Split-grid layout for Redlock / Task Queue with sidebars and logs
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Active tab content & console logs */}
            <div className="lg:col-span-8 space-y-8">
              {activeTab === 'redlock' ? (
                <Dashboard
                  onTriggerCompetition={handleTriggerCompetition}
                  isTriggering={isTriggering}
                  workerStates={workerStates}
                />
              ) : (
                <QueueDashboard
                  status={queueStatus}
                  isLoading={isLoadingQueue}
                  onEnqueue={handleEnqueue}
                  onToggleWorker={handleToggleWorker}
                  onClearQueue={handleClearQueue}
                  onRefresh={fetchQueueStatus}
                />
              )}

              {/* Server-Sent Events Logs stream */}
              <LogViewer logs={logs} onClearLogs={handleClearLogs} />
            </div>

            {/* Right Column: Key-value stores and system diagrams */}
            <div className="lg:col-span-4">
              {activeTab === 'redlock' ? (
                <ItemsList
                  items={items}
                  onClearDb={handleClearDb}
                  isLoading={isLoadingItems}
                />
              ) : (
                <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -z-10" />
                  
                  <div className="flex items-center gap-2 text-indigo-400 font-bold border-b border-slate-900 pb-3">
                    <Cpu size={18} />
                    <h3 className="text-xs uppercase tracking-wider text-slate-200 font-mono">Queue Architecture</h3>
                  </div>
                  <div className="space-y-4 text-xs text-slate-400 leading-relaxed font-sans">
                    <p>
                      This panel showcases an advanced <b>Asynchronous Redis Queue</b> featuring resilient messaging primitives.
                    </p>
                    <div>
                      <h4 className="font-semibold text-slate-300 mb-1">Pipelined Processing:</h4>
                      <ul className="list-disc pl-4 space-y-1.5 text-slate-400 font-mono text-[10px]">
                        <li>Tasks are pushed onto `queue:tasks` List via `LPUSH` as simple atomic payloads.</li>
                        <li>Detailed metadata hashes are updated in `queue:task_details` using `HSET` to avoid memory fragmentation.</li>
                        <li>Workers atomically poll using `RPOP` to claim tasks with zero duplicate delivery.</li>
                      </ul>
                    </div>
                    <div className="pt-2 border-t border-slate-900">
                      <h4 className="font-semibold text-slate-300 mb-1">Fault-Tolerant Resiliency:</h4>
                      <ul className="list-disc pl-4 space-y-1.5 text-slate-400 font-mono text-[10px]">
                        <li>Failed tasks initiate an <b>Exponential Backoff (2^retry × 2000ms)</b> delay.</li>
                        <li>Scheduled tasks wait in `queue:delayed` Sorted Set using Epoch timestamp scores.</li>
                        <li>After exceeding 3 retries, payloads automatically route to the **Dead Letter Queue (DLQ)**.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
