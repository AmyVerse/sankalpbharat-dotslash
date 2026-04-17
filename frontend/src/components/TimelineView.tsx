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

export interface Scenario {
  id: string;
  name: string;
  timeline: Snapshot[];
  currentIndex: number;
}

interface TimelineViewProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  onRestore: (index: number) => void;
  onBranch: (name: string) => void;
  onSwitchScenario: (id: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ scenarios, activeScenarioId, onRestore, onBranch, onSwitchScenario }) => {
  const [isBranching, setIsBranching] = React.useState(false);
  const [newBranchName, setNewBranchName] = React.useState('');

  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];
  const timeline = activeScenario?.timeline || [];
  const currentIndex = activeScenario?.currentIndex ?? -1;

  const handleBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBranchName.trim()) {
      onBranch(newBranchName.trim());
      setNewBranchName('');
      setIsBranching(false);
    }
  };
  return (
    <div className="absolute top-24 left-10 w-72 max-h-[70vh] flex flex-col overflow-hidden bg-white border border-[#dac2b6] border-opacity-40 rounded-md shadow-2xl z-20 text-[#553a34] font-sans">
      
      <div className="p-4 bg-[#ebe8e3] border-b border-[#dac2b6] border-opacity-30 shrink-0">
        <div className="flex items-center justify-between mb-2">
           <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#877369]">Scenario Manager</h3>
           <button onClick={() => setIsBranching(!isBranching)} className="text-[9px] font-bold text-[#974726] tracking-widest uppercase hover:underline">
             + Branch
           </button>
        </div>
        
        {isBranching ? (
          <form onSubmit={handleBranchSubmit} className="flex gap-2">
            <input 
              autoFocus
              type="text" 
              placeholder="e.g. Subsidy Route B..." 
              value={newBranchName}
              onChange={e => setNewBranchName(e.target.value)}
              className="flex-1 px-2 py-1.5 text-[10px] bg-white border border-[#dac2b6] border-opacity-50 rounded-sm focus:outline-none placeholder:text-[#877369]/50 font-bold"
            />
            <button type="submit" className="bg-[#974726] text-white px-3 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-wider hover:bg-[#7a391e]">Save</button>
          </form>
        ) : (
          <select 
            value={activeScenarioId} 
            onChange={(e) => onSwitchScenario(e.target.value)}
            className="w-full bg-white border border-[#dac2b6] border-opacity-50 text-[10px] font-bold uppercase tracking-widest text-[#553a34] px-2 py-1.5 rounded-sm focus:outline-none cursor-pointer"
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-2 relative">
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

