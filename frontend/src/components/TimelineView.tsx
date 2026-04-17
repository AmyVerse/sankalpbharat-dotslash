import React from 'react';
import { History, GitCommit, GitMerge } from 'lucide-react';

export interface Snapshot {
  timestamp: string;
  description: string;
  nodes: any[];
  edges: any[];
  countryMultipliers: Record<string, number>;
  aiResponse?: string;
  aiRecommendations?: any[];
  impactSummary?: any;
  changeSummary?: string | null;
}

interface TimelineViewProps {
  timeline: Snapshot[];
  currentIndex: number;
  onRestore: (index: number) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ timeline, currentIndex, onRestore }) => {
  return (
    <div className="absolute top-20 left-4 w-60 max-h-[80vh] overflow-y-auto bg-slate-900/90 border border-slate-700/50 backdrop-blur-md rounded-xl shadow-2xl z-20 text-white font-sans p-3">
      <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
         <History size={14} className="text-blue-500" />
         <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Simulation Timeline</h3>
      </div>
      
      <div className="space-y-0.5 relative">
         <div className="absolute left-3 top-2 bottom-4 w-px bg-slate-700/50 z-0"></div>
         {timeline.map((snap, idx) => {
            const isActive = idx === currentIndex;
            const isFuture = idx > currentIndex;
            
            return (
              <button 
                key={idx}
                onClick={() => onRestore(idx)}
                className={`w-full text-left relative z-10 flex items-start gap-3 p-2 rounded-lg transition-all group
                  ${isActive ? 'bg-blue-600/20 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.5)]' : 'hover:bg-slate-800/50'}
                  ${isFuture ? 'opacity-40 grayscale' : ''}
                `}
              >
                <div className="mt-0.5 shrink-0 bg-slate-900 p-0.5">
                   {isActive ? (
                     <GitMerge size={12} className="text-blue-400" />
                   ) : (
                     <GitCommit size={12} className={isFuture ? 'text-slate-600' : 'text-slate-400 group-hover:text-blue-400'} />
                   )}
                </div>
                <div className="leading-tight">
                  <div className={`text-[11px] font-bold ${isActive ? 'text-blue-300' : isFuture ? 'text-slate-500' : 'text-slate-300'}`}>
                    {snap.description}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">{snap.timestamp}</div>
                </div>
              </button>
            )
         })}
      </div>
    </div>
  );
};
