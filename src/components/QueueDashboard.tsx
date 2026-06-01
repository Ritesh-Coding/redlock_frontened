import React, { useState, useEffect } from 'react';
import { 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Database,  
  History, 
  Activity, 
  Layers, 
  Power, 
  Clock, 
  Sparkles, 
  RefreshCw, 
  Server,
  Trash2,
  Plus,
  Flame,
  LifeBuoy
} from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:5000/api`;

interface QueueTask {
  id: string;
  displayId: string;
  type: string;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  forceFailure: boolean;
  worker: string | null;
  retries: number;
  maxRetries: number;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  error?: string | null;
}

interface QueueStatus {
  backlogSize: number;
  delayedSize: number;
  dlqSize: number;
  processedCount: number;
  failedCount: number;
  workers: Record<string, 'active' | 'stopped'>;
  pendingTasks: QueueTask[];
  processingTasks: QueueTask[];
  delayedTasks: QueueTask[];
  history: QueueTask[];
}

interface QueueDashboardProps {
  status: QueueStatus | null;
  isLoading: boolean;
  onEnqueue: (type: string, duration: number, forceFailure: boolean) => Promise<void>;
  onToggleWorker: (workerName: string, state: 'active' | 'stopped') => Promise<void>;
  onClearQueue: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

const QueueDashboard: React.FC<QueueDashboardProps> = ({
  status,
  isLoading,
  onEnqueue,
  onToggleWorker,
  onClearQueue,
  onRefresh
}) => {
  // Enqueue Form State
  const [taskType, setTaskType] = useState('📝 Generate PDF Report');
  const [duration, setDuration] = useState(5);
  const [forceFailure, setForceFailure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Worker Spawning State
  const [newWorkerName, setNewWorkerName] = useState('');
  const [isSpawning, setIsSpawning] = useState(false);

  // DLQ Drawer State
  const [dlqTasks, setDlqTasks] = useState<QueueTask[]>([]);
  const [isDlqOpen, setIsDlqOpen] = useState(false);
  const [isDlqLoading, setIsDlqLoading] = useState(false);

  // Dynamic millisecond timer to drive smooth worker progress bars
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Poll DLQ tasks list when DLQ view is open
  useEffect(() => {
    if (isDlqOpen) {
      fetchDlqTasks();
    }
  }, [isDlqOpen]);

  const fetchDlqTasks = async () => {
    setIsDlqLoading(true);
    try {
      const res = await fetch(`${API_BASE}/queue/dlq`);
      const data = await res.json();
      if (data.success) {
        setDlqTasks(data.tasks);
      }
    } catch (err) {
      console.error('Failed to fetch DLQ tasks:', err);
    } finally {
      setIsDlqLoading(false);
    }
  };

  const handleEnqueueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onEnqueue(taskType, duration, forceFailure);
      setForceFailure(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSpawnWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newWorkerName.trim();
    if (!name) return;
    setIsSpawning(true);

    try {
      const res = await fetch(`${API_BASE}/queue/workers/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerName: name })
      });
      const data = await res.json();
      if (data.success) {
        setNewWorkerName('');
        onRefresh();
      } else {
        alert(data.error || 'Failed to spawn worker.');
      }
    } catch (err) {
      console.error('Failed to spawn worker:', err);
    } finally {
      setIsSpawning(false);
    }
  };

  const handleTerminateWorker = async (workerName: string) => {
    if (!window.confirm(`Are you sure you want to permanently terminate worker "${workerName}"?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/queue/workers/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerName })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to terminate worker:', err);
    }
  };

  const handleRescueTask = async (taskId: string) => {
    try {
      const res = await fetch(`${API_BASE}/queue/dlq/reenqueue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      const data = await res.json();
      if (data.success) {
        fetchDlqTasks();
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to rescue task:', err);
    }
  };

  const handlePurgeDlq = async () => {
    if (!window.confirm('Are you sure you want to completely purge the Dead Letter Queue?')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/queue/dlq`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchDlqTasks();
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to purge DLQ:', err);
    }
  };

  // Generate unique color classes for dynamic workers based on name hash
  const getWorkerColorClasses = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'text-violet-400 border-violet-500/20 bg-violet-500/5',
      'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
      'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',
      'text-pink-400 border-pink-500/20 bg-pink-500/5',
      'text-amber-400 border-amber-500/20 bg-amber-500/5',
      'text-orange-400 border-orange-500/20 bg-orange-500/5'
    ];
    return colors[hash % colors.length];
  };

  const getWorkerStatusBadge = (state: 'active' | 'stopped') => {
    if (state === 'active') {
      return (
        <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          <Activity size={10} className="animate-pulse" />
          ONLINE
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-500">
        <Power size={10} className="rotate-180" />
        PAUSED
      </span>
    );
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* 1. Core Controls & Queue Producer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Task Producer Form (Glass Panel) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
          
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Play size={20} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">Enqueue Task Producer</h3>
                <p className="text-xs text-slate-400">Submit asynchronous work payloads to the Redis List Queue</p>
              </div>
            </div>

            <form onSubmit={handleEnqueueSubmit} className="space-y-4">
              {/* Task Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers size={12} className="text-slate-500" /> Task Type
                </label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-sans"
                >
                  <option value="📝 Generate PDF Report">📝 Generate PDF Report</option>
                  <option value="📧 Send Marketing Emails">📧 Send Marketing Emails</option>
                  <option value="🖼️ Process Raw Images">🖼️ Process Raw Images</option>
                  <option value="📊 Train Neural Network">📊 Train Neural Network</option>
                  <option value="🧹 Cleanup Old Logs">🧹 Cleanup Old Logs</option>
                </select>
              </div>

              {/* Task Duration Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5"><Clock size={12} className="text-slate-500" /> Process Time</span>
                  <span className="text-indigo-400 font-mono text-sm font-bold">{duration} Seconds</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="15"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>2s (Fast)</span>
                  <span>15s (Heavy)</span>
                </div>
              </div>

              {/* Force Task Failure Switch */}
              <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-900 hover:border-slate-800/80 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-amber-500" /> Simulate Task Failure
                  </span>
                  <p className="text-[10px] text-slate-500">Forces exponential retries & eventual DLQ routing</p>
                </div>
                <input
                  type="checkbox"
                  checked={forceFailure}
                  onChange={(e) => setForceFailure(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-indigo-400/20 hover:border-indigo-400/40 disabled:opacity-50 disabled:pointer-events-none mt-2"
              >
                {isSubmitting ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                Enqueue Task Payload
              </button>
            </form>
          </div>
        </div>

        {/* Dynamic Worker Pool Scaling Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Server size={14} className="text-slate-500" /> Elastic Worker Pool Manager
            </h3>

            {/* Spawner Inline Form */}
            <form onSubmit={handleSpawnWorker} className="flex gap-2 shrink-0">
              <input
                type="text"
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                placeholder="Worker Gamma..."
                className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono w-32"
              />
              <button
                type="submit"
                disabled={isSpawning || !newWorkerName.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold font-mono transition shadow-lg shadow-indigo-500/10 disabled:opacity-40"
              >
                <Plus size={12} /> Spawn
              </button>
              <button 
                type="button"
                onClick={onRefresh}
                className="p-1.5 border border-slate-800 bg-slate-950/60 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 transition"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </form>
          </div>

          {/* Grid of Dynamic Workers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[295px] overflow-y-auto pr-1 custom-scrollbar">
            {status && Object.entries(status.workers).length === 0 ? (
              <div className="col-span-2 text-center py-10 border-2 border-dashed border-slate-900 rounded-2xl bg-slate-950/30 text-slate-500 text-xs">
                No active workers. Enqueued tasks will pile up in the backlog list!
              </div>
            ) : (
              status && Object.entries(status.workers).map(([workerName, workerState]) => {
                // Find if worker is currently processing a task
                const activeTask = status.processingTasks.find(t => t.worker === workerName);
                const colorClasses = getWorkerColorClasses(workerName);
                
                // Calculate processing progress
                let progressPercent = 0;
                let elapsedSec = 0;
                if (activeTask && activeTask.startedAt) {
                  const elapsedMs = currentTime - activeTask.startedAt;
                  elapsedSec = Math.floor(elapsedMs / 1000);
                  progressPercent = Math.min(100, (elapsedMs / (activeTask.duration * 1000)) * 100);
                }

                return (
                  <div 
                    key={workerName}
                    className={`glass-panel p-4.5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[200px] ${
                      activeTask ? 'border-indigo-500/40 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.06)]' : 
                      workerState === 'stopped' ? 'border-slate-900 opacity-60' : 'border-slate-800'
                    }`}
                  >
                    {/* Glow layer */}
                    {activeTask && (
                      <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl animate-pulse" />
                    )}

                    {/* Header */}
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <span className={`font-mono text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded border uppercase ${colorClasses}`}>
                          {workerName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {getWorkerStatusBadge(workerState)}
                          <button
                            onClick={() => handleTerminateWorker(workerName)}
                            className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-md transition"
                            title="Terminate Worker permanently"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress details */}
                    <div className="my-3">
                      {workerState === 'stopped' ? (
                        <div className="text-center py-3 border border-dashed border-slate-900 rounded-xl bg-slate-950/20 text-slate-500 text-xs">
                          Worker is paused.
                        </div>
                      ) : activeTask ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-start text-xs">
                            <div className="truncate max-w-[120px]">
                              <span className="text-[9px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded mr-1.5">
                                #{activeTask.displayId}
                              </span>
                              <span className="text-slate-200 font-medium">{activeTask.type}</span>
                            </div>
                            <span className="text-slate-400 font-mono text-[9px] shrink-0">
                              {elapsedSec}s / {activeTask.duration}s
                            </span>
                          </div>

                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-400 italic py-3 border border-dashed border-slate-900/60 rounded-xl bg-slate-950/20 px-3">
                          <span className="w-2 h-2 bg-slate-600 rounded-full animate-ping mr-1" />
                          Polling backlog...
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-mono text-[10px]">Worker loop:</span>
                      <button
                        onClick={() => onToggleWorker(workerName, workerState === 'active' ? 'stopped' : 'active')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold font-mono text-[10px] transition-all shadow-md active:scale-95 ${
                          workerState === 'active' 
                            ? 'border-rose-500/25 text-rose-400 hover:bg-rose-500/5' 
                            : 'border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/5'
                        }`}
                      >
                        {workerState === 'active' ? 'PAUSE' : 'RESUME'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* 2. Real-time Metric counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Backlog Metric */}
        <div className="glass-panel p-4.5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Layers size={16} />
            <h3 className="font-semibold text-[10px] uppercase tracking-wider text-slate-300">Backlog</h3>
          </div>
          <div className="flex justify-between items-baseline mt-1">
            <span className={`text-2xl font-black font-mono tracking-tight ${status && status.backlogSize > 0 ? 'text-indigo-400 animate-pulse' : 'text-slate-400'}`}>
              {status ? status.backlogSize : 0}
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Pending</span>
          </div>
        </div>

        {/* Retry Queue Metric */}
        <div className="glass-panel p-4.5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Clock size={16} />
            <h3 className="font-semibold text-[10px] uppercase tracking-wider text-slate-300">Retrying</h3>
          </div>
          <div className="flex justify-between items-baseline mt-1">
            <span className={`text-2xl font-black font-mono tracking-tight ${status && status.delayedSize > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {status ? status.delayedSize : 0}
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Backoff Delay</span>
          </div>
        </div>

        {/* Dead Letter Queue (DLQ) Drawer Button Card */}
        <button
          onClick={() => setIsDlqOpen(true)}
          className={`glass-panel p-4.5 rounded-2xl flex flex-col justify-between text-left transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/5 active:scale-95 group relative ${
            status && status.dlqSize > 0 ? 'border-red-500/20 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.06)]' : ''
          }`}
        >
          {status && status.dlqSize > 0 && (
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
          )}
          <div className={`flex items-center gap-2 mb-2 transition-colors ${status && status.dlqSize > 0 ? 'text-red-400' : 'text-slate-400 group-hover:text-red-400'}`}>
            <Flame size={16} />
            <h3 className="font-semibold text-[10px] uppercase tracking-wider text-slate-300">DLQ Backlog</h3>
          </div>
          <div className="flex justify-between items-baseline mt-1 w-full">
            <span className={`text-2xl font-black font-mono tracking-tight ${status && status.dlqSize > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {status ? status.dlqSize : 0}
            </span>
            <span className="text-[9px] text-slate-500 font-mono font-bold hover:underline">Click to Open</span>
          </div>
        </button>

        {/* Completed Metric */}
        <div className="glass-panel p-4.5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <CheckCircle size={16} />
            <h3 className="font-semibold text-[10px] uppercase tracking-wider text-slate-300">Completed</h3>
          </div>
          <div className="flex justify-between items-baseline mt-1">
            <span className="text-2xl font-black font-mono tracking-tight text-emerald-400">
              {status ? status.processedCount : 0}
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Success Finished</span>
          </div>
        </div>

        {/* Total Throughput */}
        <div className="glass-panel p-4.5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Activity size={16} />
            <h3 className="font-semibold text-[10px] uppercase tracking-wider text-slate-300">Throughput</h3>
          </div>
          <div className="flex justify-between items-baseline mt-1">
            <span className="text-2xl font-black font-mono tracking-tight text-cyan-400">
              {status ? (status.processedCount + status.failedCount) : 0}
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Total Runs</span>
          </div>
        </div>
      </div>

      {/* 3. Backlog & History Lists side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Pending Tasks Backlog */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 flex flex-col h-[400px]">
          <div className="flex items-center gap-2.5 mb-4 shrink-0">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Database size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-200">Active Queue Pipeline</h3>
              <p className="text-[10px] text-slate-500 font-mono">FIFO list • queue:tasks</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {/* Show delayed tasks first (if any) */}
            {status && status.delayedTasks.length > 0 && (
              <div className="space-y-2 border-b border-slate-900 pb-3">
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest font-mono">Delayed Retries:</span>
                {status.delayedTasks.map((task) => (
                  <div key={task.id} className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500" />
                    <div className="pl-1.5 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          #{task.displayId}
                        </span>
                        <span className="text-xs font-bold text-slate-300">{task.type}</span>
                      </div>
                      <p className="text-[9px] font-mono text-amber-500 flex items-center gap-1">
                        <Clock size={8} /> Exponential Backoff Retry (Attempt {task.retries}/3)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!status || (status.pendingTasks.length === 0 && status.delayedTasks.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6 border-2 border-dashed border-slate-900 rounded-xl">
                <Database size={24} className="text-slate-700 mb-2" />
                <p className="text-xs font-semibold text-slate-400">List is Empty</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                  Enqueue new tasks to watch them queue up in Redis in real-time.
                </p>
              </div>
            ) : (
              status.pendingTasks.map((task, index) => (
                <div 
                  key={task.id} 
                  className="bg-slate-950/60 border border-slate-900 p-3 rounded-xl flex justify-between items-center relative overflow-hidden group hover:border-slate-800 transition-colors"
                >
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500/50" />
                  <div className="pl-2 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        #{task.displayId}
                      </span>
                      <span className="text-xs font-bold text-slate-300">{task.type}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock size={9} /> Length: {task.duration}s | Enqueued: {formatTime(task.createdAt)}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md uppercase">
                    Pos #{status.pendingTasks.length - index}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Task Completion History */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <History size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-200">Recent Task History</h3>
                <p className="text-[10px] text-slate-500 font-mono">Displaying last 20 jobs</p>
              </div>
            </div>

            {status && status.history.length > 0 && (
              <button
                onClick={onClearQueue}
                className="text-[10px] font-mono text-rose-400 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/20 hover:border-rose-500/40 transition-all active:scale-95"
              >
                Flush Queue DB
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {!status || status.history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6 border-2 border-dashed border-slate-900 rounded-xl">
                <History size={24} className="text-slate-700 mb-2" />
                <p className="text-xs font-semibold text-slate-400">History is Empty</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[240px]">
                  Processed tasks will appear here in chronological order with their completion logs.
                </p>
              </div>
            ) : (
              status.history.map((task) => (
                <div 
                  key={task.id} 
                  className={`bg-slate-950/40 border p-3.5 rounded-xl flex flex-col gap-2 relative overflow-hidden group hover:bg-slate-950/60 transition-colors ${
                    task.status === 'completed' ? 'border-emerald-500/10' : 'border-rose-500/10'
                  }`}
                >
                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                    task.status === 'completed' ? 'bg-emerald-500/40' : 'bg-rose-500/40'
                  }`} />

                  <div className="flex justify-between items-start gap-4">
                    <div className="pl-1.5 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          #{task.displayId}
                        </span>
                        <span className="text-xs font-bold text-slate-200">{task.type}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        <span>Duration: <b className="text-indigo-400">{task.duration}s</b></span>
                        <span className="text-slate-600">|</span>
                        <span>Finished: {task.finishedAt ? formatTime(task.finishedAt) : ''}</span>
                        <span className="text-slate-600">|</span>
                        <span>Worker: <b className={getWorkerColorClasses(task.worker || '')}>{task.worker}</b></span>
                      </div>
                    </div>

                    <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border font-mono ${
                      task.status === 'completed' 
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' 
                        : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                    }`}>
                    {task.status === 'failed' ? 'perm failed' : task.status}
                    </span>
                  </div>

                  {task.error && (
                    <div className="text-[10px] text-rose-400/90 font-mono bg-rose-500/5 border border-rose-500/10 p-2 rounded-lg ml-1.5">
                      🚨 Error: {task.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ==========================================
          DEAD LETTER QUEUE (DLQ) DRAWER MODAL
          ========================================== */}
      {isDlqOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border border-red-500/15">
            {/* Header */}
            <div className="p-6 border-b border-slate-900 bg-red-950/10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/15 border border-red-500/20 rounded-xl text-red-400">
                  <Flame size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                    Dead Letter Queue (DLQ) Inspector
                  </h3>
                  <p className="text-xs text-slate-400">Inspect failed payloads representing permanent task crashes.</p>
                </div>
              </div>

              {dlqTasks.length > 0 && (
                <button
                  onClick={handlePurgeDlq}
                  className="flex items-center gap-1 text-[10px] font-mono text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40 transition active:scale-95"
                >
                  <Trash2 size={10} /> Purge DLQ
                </button>
              )}
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-[300px]">
              {isDlqLoading ? (
                <div className="h-full flex items-center justify-center py-20">
                  <RefreshCw size={24} className="text-red-400 animate-spin" />
                </div>
              ) : dlqTasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-slate-500 text-center gap-2 border-2 border-dashed border-slate-900 rounded-xl">
                  <LifeBuoy size={32} className="text-slate-700 animate-bounce" />
                  <h4 className="text-xs font-bold text-slate-300">Clean Slate — DLQ is Empty</h4>
                  <p className="text-[10px] text-slate-500 max-w-[250px] mx-auto mt-0.5">
                    No tasks have permanently crashed. Run failures in the Sandbox to trigger DLQ logging.
                  </p>
                </div>
              ) : (
                dlqTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="bg-slate-950 border border-red-500/10 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden hover:border-red-500/20 transition"
                  >
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-500" />
                    
                    <div className="pl-2.5 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                          #{task.displayId}
                        </span>
                        <span className="text-sm font-bold text-slate-200">{task.type}</span>
                      </div>
                      <div className="text-[9.5px] text-slate-400 font-mono space-x-3">
                        <span>Duration: <b>{task.duration}s</b></span>
                        <span>•</span>
                        <span>Retries: <b>{task.retries}/3</b></span>
                        <span>•</span>
                        <span>Crashed: {formatTime(task.finishedAt || Date.now())}</span>
                      </div>
                      <div className="text-[10px] text-red-400/90 bg-red-500/5 border border-red-500/10 p-2 rounded-lg font-mono mt-2">
                        🚨 Exception: {task.error}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRescueTask(task.id)}
                      className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 border border-emerald-400/20 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/10 active:scale-95"
                    >
                      <LifeBuoy size={12} className="animate-spin-slow" /> Rescue & Retry
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-900 bg-slate-950 shrink-0 text-right">
              <button
                onClick={() => setIsDlqOpen(false)}
                className="px-4 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 rounded-xl text-xs font-semibold text-slate-300 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueDashboard;
