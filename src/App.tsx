import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import type { SortedSetItem } from './components/ItemsList';
import type { LogEntry } from './components/LogViewer';
import ItemsList from './components/ItemsList';
import LogViewer from './components/LogViewer';
import QueueDashboard from './components/QueueDashboard';
import { Layers, ShieldCheck, Cpu } from 'lucide-react';

// Dynamically resolve API URL to support local network devices (e.g. mobile/tablet) accessing the host backend
const API_BASE = `http://${window.location.hostname}:5000/api`;

function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'redlock' | 'queue'>('redlock');

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

  // 1. Fetch Redlock Sorted Set items
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

  // 2. Fetch Queue status
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

  // 3. Establish live SSE stream and fetch initial states
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

        // Append new live log entry to terminal console
        setLogs((prev) => [...prev, log]);

        // Triggers instant queue status refresh when queue worker logs come in
        const { worker, message } = log;
        if (worker.startsWith('Queue Worker') || worker === 'System') {
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

  // 4. Poll Queue status periodically when the Queue tab is active
  useEffect(() => {
    if (activeTab !== 'queue') return;

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // 5. Trigger manual worker concurrency competition (Redlock)
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

  // 6. Clear/flush Redis Sorted Set database (Redlock)
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

  // 7. Enqueue a new task (Queue)
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

  // 8. Toggle worker state (Queue)
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

  // 9. Flush entire queue database (Queue)
  const handleClearQueue = async () => {
    try {
      await handleClearDb(); // Clear redlock set & log buffer
      const res = await fetch(`${API_BASE}/queue`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchQueueStatus();
      }
    } catch (err) {
      console.error('Failed to clear queue database:', err);
    }
  };

  // 10. Clear frontend logs display only
  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen pb-16 px-4 md:px-8">
      {/* Decorative Header */}
      <div className="w-full flex justify-center py-8">
        <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur border border-slate-800 px-6 py-2.5 rounded-full shadow-2xl">
          <Layers size={18} className="text-indigo-400 animate-pulse" />
          <h1 className="text-sm font-semibold tracking-wider uppercase bg-gradient-to-r from-indigo-200 via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Distributed Redis Architecture Panel
          </h1>
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="w-full flex justify-center mb-8">
        <div className="flex bg-slate-950/60 backdrop-blur border border-slate-900 p-1.5 rounded-2xl gap-2 shadow-2xl">
          <button
            onClick={() => setActiveTab('redlock')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold tracking-wide transition-all duration-300 ${
              activeTab === 'redlock'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <ShieldCheck size={16} />
            Redlock Distributed Locks
          </button>
          
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold tracking-wide transition-all duration-300 ${
              activeTab === 'queue'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Layers size={16} />
            Redis Task Queue (FIFO)
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Active Tab Dashboard & Live Event stream */}
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

          {/* SSE Terminal Console */}
          <LogViewer logs={logs} onClearLogs={handleClearLogs} />
        </div>

        {/* Right Side: Redis State Viewers */}
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
                  This dashboard showcases an asynchronous <b>FIFO Task Queue</b> built entirely on top of <b>Redis List</b> structures.
                </p>
                <div>
                  <h4 className="font-semibold text-slate-300 mb-1">Queue Pipeline:</h4>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-400 font-mono text-[10px]">
                    <li>Tasks are enqueued by pushing generated IDs onto <code className="text-indigo-400">queue:tasks</code> List using <code className="text-slate-300">LPUSH</code>.</li>
                    <li>Payload details are mapped inside a Hash <code className="text-emerald-400">queue:task_details</code> using <code className="text-slate-300">HSET</code>.</li>
                    <li>Competing background workers poll the queue using <code className="text-amber-400">RPOP</code> atomically, ensuring each task is fetched by exactly one worker.</li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-slate-900">
                  <h4 className="font-semibold text-slate-300 mb-1">Concurrency Sandbox:</h4>
                  <p>
                    Stop both workers, enqueue multiple items, and watch the queue grow. Turn workers back on to see them pop and balance the load instantly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
