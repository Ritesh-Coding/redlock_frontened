import React, { useState, useEffect } from 'react';
import { 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  Cpu, 
  Database, 
  History, 
  Activity, 
  Layers, 
  Power, 
  PowerOff,
  Clock,
  Sparkles,
  RefreshCw,
  Server
} from 'lucide-react';

interface QueueTask {
  id: string;
  displayId: string;
  type: string;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  forceFailure: boolean;
  worker: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  error?: string;
}

interface QueueStatus {
  backlogSize: number;
  processedCount: number;
  failedCount: number;
  workers: {
    'Queue Worker Alpha': 'active' | 'stopped';
    'Queue Worker Beta': 'active' | 'stopped';
  };
  pendingTasks: QueueTask[];
  processingTasks: QueueTask[];
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

  // Dynamic millisecond timer to drive smooth worker progress bars
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const handleEnqueueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onEnqueue(taskType, duration, forceFailure);
      // Reset failure toggle after enqueue
      setForceFailure(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWorkerClass = (workerName: string) => {
    if (workerName === 'Queue Worker Alpha') return 'text-violet-400 border-violet-500/20 bg-violet-500/5';
    return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
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
        <PowerOff size={10} />
        STOPPED
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
                  <p className="text-[10px] text-slate-500">Forces the worker to mark this job as failed</p>
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

        {/* Workers Arena & Dynamic Load Balancing */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Server size={14} className="text-slate-500" /> Active Redis Queue Workers
            </h3>
            <button 
              onClick={onRefresh}
              className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh queue state"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {status && Object.entries(status.workers).map(([workerName, workerState]) => {
              // Check if worker is processing a task
              const activeTask = status.processingTasks.find(t => t.worker === workerName);
              
              // Calculate smooth progress
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
                  className={`glass-panel p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[220px] ${
                    activeTask ? 'border-indigo-500/40 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.08)]' : 
                    workerState === 'stopped' ? 'border-slate-900 opacity-60' : 'border-slate-800'
                  }`}
                >
                  {/* Decorative background glow for active workers */}
                  {activeTask && (
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
                  )}

                  {/* Worker Header */}
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <span className="font-mono text-xs text-indigo-400/80 font-bold tracking-wider">
                        {workerName === 'Queue Worker Alpha' ? 'CORE_WORKER_01' : 'CORE_WORKER_02'}
                      </span>
                      {getWorkerStatusBadge(workerState)}
                    </div>

                    <h4 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                      <Cpu size={16} className={activeTask ? 'text-indigo-400 animate-spin' : 'text-slate-400'} />
                      {workerName}
                    </h4>
                  </div>

                  {/* Worker Processing Area */}
                  <div className="my-4">
                    {workerState === 'stopped' ? (
                      <div className="text-center py-4 border border-dashed border-slate-900 rounded-xl bg-slate-950/30 text-slate-500 text-xs">
                        Worker is Offline. Backlog items will wait.
                      </div>
                    ) : activeTask ? (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded mr-1.5">
                              #{activeTask.displayId}
                            </span>
                            <span className="text-slate-200 font-semibold">{activeTask.type}</span>
                          </div>
                          <span className="text-slate-400 font-mono text-[10px]">
                            {elapsedSec}s / {activeTask.duration}s
                          </span>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-400 italic py-4 border border-dashed border-slate-900/60 rounded-xl bg-slate-950/20 px-3">
                        <span className="w-2.5 h-2.5 bg-slate-600 rounded-full animate-ping mr-1" />
                        Waiting for enqueued tasks...
                      </div>
                    )}
                  </div>

                  {/* Worker Footer Toggle Switch */}
                  <div className="pt-3 border-t border-slate-900 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-mono">Control Switch:</span>
                    <button
                      onClick={() => onToggleWorker(workerName, workerState === 'active' ? 'stopped' : 'active')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold font-mono text-[11px] transition-all shadow-md active:scale-95 ${
                        workerState === 'active' 
                          ? 'border-rose-500/20 hover:border-rose-500/40 text-rose-400 hover:bg-rose-500/5' 
                          : 'border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/5'
                      }`}
                    >
                      {workerState === 'active' ? (
                        <>
                          <Power size={12} />
                          STOP WORKER
                        </>
                      ) : (
                        <>
                          <Power size={12} />
                          START WORKER
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 2. Real-time Metric counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Backlog Metric */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-2.5 text-indigo-400 mb-2">
            <Layers size={18} />
            <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-300">Queue Backlog</h3>
          </div>
          <div className="flex justify-between items-baseline mt-2">
            <span className={`text-3xl font-black font-mono tracking-tight ${status && status.backlogSize > 0 ? 'text-indigo-400 animate-pulse' : 'text-slate-400'}`}>
              {status ? status.backlogSize : 0}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Tasks Waiting</span>
          </div>
        </div>

        {/* Completed Metric */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-2.5 text-emerald-400 mb-2">
            <CheckCircle size={18} />
            <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-300">Completed Jobs</h3>
          </div>
          <div className="flex justify-between items-baseline mt-2">
            <span className="text-3xl font-black font-mono tracking-tight text-emerald-400">
              {status ? status.processedCount : 0}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Tasks Finished</span>
          </div>
        </div>

        {/* Failed Metric */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-2.5 text-rose-400 mb-2">
            <AlertTriangle size={18} />
            <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-300">Failed Jobs</h3>
          </div>
          <div className="flex justify-between items-baseline mt-2">
            <span className="text-3xl font-black font-mono tracking-tight text-rose-400">
              {status ? status.failedCount : 0}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Error Failures</span>
          </div>
        </div>

        {/* Total Throughput */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-2.5 text-cyan-400 mb-2">
            <Activity size={18} />
            <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-300">Queue Throughput</h3>
          </div>
          <div className="flex justify-between items-baseline mt-2">
            <span className="text-3xl font-black font-mono tracking-tight text-cyan-400">
              {status ? (status.processedCount + status.failedCount) : 0}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Total Processed</span>
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
              <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-200">Redis List (FIFO Queue)</h3>
              <p className="text-[10px] text-slate-500 font-mono">Key: queue:tasks</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {!status || status.pendingTasks.length === 0 ? (
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
                    Queue Position #{status.pendingTasks.length - index}
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

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
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
                  {/* Decorative side accent */}
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
                        <span>Worker: <b className={getWorkerClass(task.worker || '')}>{task.worker}</b></span>
                      </div>
                    </div>

                    <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border font-mono ${
                      task.status === 'completed' 
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' 
                        : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                    }`}>
                      {task.status}
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
    </div>
  );
};

export default QueueDashboard;
