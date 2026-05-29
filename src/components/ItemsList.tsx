import React from 'react';
import { Database, Calendar, Tag, ArrowRight, User } from 'lucide-react';

export interface SortedSetItem {
  score: number;
  data: {
    text: string;
    id: number;
    worker?: string;
  };
}

interface ItemsListProps {
  items: SortedSetItem[];
  onClearDb: () => void;
  isLoading: boolean;
}

const ItemsList: React.FC<ItemsListProps> = ({ items, onClearDb, isLoading }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getWorkerClass = (worker?: string) => {
    if (worker === 'Worker A') return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
    if (worker === 'Worker B') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Database size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-100">Redis Sorted Set</h3>
            <p className="text-xs text-slate-400 font-mono">Key: my_ordered_items</p>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={onClearDb}
            className="text-xs font-mono text-rose-400 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:border-rose-500/40 transition-all"
          >
            Flush Redis Set
          </button>
        )}
      </div>

      {/* Database Content Grid */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-3 border-2 border-dashed border-slate-900 rounded-xl p-8">
            <Database size={36} className="text-slate-700" />
            <div>
              <p className="font-medium text-slate-400">Redis Sorted Set is Empty</p>
              <p className="text-xs max-w-[280px] mx-auto mt-1">
                Trigger the worker competition or wait for the cron schedule to write new atomic records.
              </p>
            </div>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={`${item.score}-${index}`}
              className="glass-panel glass-panel-hover p-4 rounded-xl relative overflow-hidden flex flex-col gap-3 group"
            >
              {/* Decorative side accent based on Worker */}
              <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                item.data.worker === 'Worker A' ? 'bg-violet-500' : 
                item.data.worker === 'Worker B' ? 'bg-emerald-500' : 'bg-indigo-500'
              }`} />

              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-indigo-400 font-mono font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      #{index + 1}
                    </span>
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                      {item.data.text}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400 font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-500" />
                      {formatDate(item.score)}
                    </span>
                  </div>
                </div>

                {item.data.worker && (
                  <span className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getWorkerClass(item.data.worker)}`}>
                    <User size={10} />
                    {item.data.worker}
                  </span>
                )}
              </div>

              {/* Score breakdown bar */}
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 flex justify-between items-center text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Tag size={11} className="text-slate-500" />
                  Score (Timestamp)
                </span>
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  {item.score}
                  <ArrowRight size={10} className="text-indigo-400" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer stats */}
      {items.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-900 flex justify-between items-center text-xs text-slate-400 font-mono">
          <span>Total Records:</span>
          <span className="font-bold text-indigo-400">{items.length} items</span>
        </div>
      )}
    </div>
  );
};

export default ItemsList;
