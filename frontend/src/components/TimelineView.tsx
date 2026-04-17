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
    <div className="absolute top-24 left-10 w-64 max-h-[70vh] overflow-y-auto bg-white border border-[#dac2b6] border-opacity-40 rounded-md shadow-2xl z-20 text-[#553a34] font-sans p-6">
      <div className="flex items-center gap-3 mb-6 border-b border-[#dac2b6] border-opacity-30 pb-4">
         <History size={16} className="text-[#974726]" />
         <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#877369]">Archival Log</h3>
      </div>
      
      <div className="space-y-2 relative">
         <div className="absolute left-[11px] top-2 bottom-6 w-px bg-[#dac2b6] z-0 opacity-40"></div>
         {timeline.map((snap, idx) => {
            const isActive = idx === currentIndex;
            const isFuture = idx > currentIndex;
            
            return (
              <button 
                key={idx}
                onClick={() => onRestore(idx)}
                className={`w-full text-left relative z-10 flex items-start gap-4 p-3 rounded-md transition-all group
                  ${isActive ? 'bg-[#553a34] text-white shadow-md' : 'hover:bg-[#fcf9f4]'}
                  ${isFuture ? 'opacity-30' : ''}
                `}
              >
                <div className={`mt-0.5 shrink-0 p-0.5 rounded-full ${isActive ? 'bg-[#553a34]' : 'bg-white'}`}>
                   {isActive ? (
                     <GitMerge size={12} className="text-white" />
                   ) : (
                     <GitCommit size={12} className={isFuture ? 'text-[#dac2b6]' : 'text-[#877369] group-hover:text-[#553a34]'} />
                   )}
                </div>
                <div className="leading-tight">
                  <div className={`text-[11px] font-bold tracking-tight ${isActive ? 'text-white' : isFuture ? 'text-[#877369]' : 'text-[#553a34]'}`}>
                    {snap.description}
                  </div>
                  <div className={`text-[9px] font-bold mt-1 uppercase tracking-widest ${isActive ? 'text-white/60' : 'text-[#877369]'}`}>{snap.timestamp}</div>
                </div>
              </button>
            )
         })}
      </div>
    </div>
  );
};

