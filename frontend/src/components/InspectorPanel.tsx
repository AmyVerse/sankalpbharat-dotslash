import React from 'react';
import { X, Replace, TrendingDown, TrendingUp } from 'lucide-react';
import type { Node, Edge } from 'reactflow';

interface InspectorPanelProps {
  selectedNode: Node | null;
  currentEdge: Edge | null;
  alternatives: any[];
  onClose: () => void;
  onSwap: (targetNodeId: string, alternative: any) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedNode,
  currentEdge,
  alternatives,
  onClose,
  onSwap
}) => {
  if (!selectedNode) return null;

  return (
    <div className="absolute bottom-24 left-10 w-80 max-h-[calc(100vh-200px)] bg-white border border-[#dac2b6] border-opacity-40 rounded-md p-0 shadow-2xl z-30 text-[#553a34] font-sans overflow-hidden flex flex-col animate-in slide-in-from-left-4 fade-in duration-300">
      <div className="flex items-center justify-between bg-[#ebe8e3] p-5 border-b border-[#dac2b6] border-opacity-30">
        <div>
          <span className="text-[10px] text-[#877369] font-bold uppercase tracking-[0.2em] block mb-1">
            {selectedNode.type === 'plant' ? 'Assembly Node' : 'Archived Supplier'}
          </span>
          <h2 className="font-bold text-xl leading-tight newsreader">{selectedNode.data.label}</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-[#dac2b6] rounded-full transition-colors text-[#877369]">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
        {/* Node Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-[#fcf9f4] p-3 border border-[#dac2b6] border-opacity-40 rounded-sm">
            <div className="text-[9px] text-[#877369] font-bold uppercase mb-1">Impact</div>
            <div className="font-bold newsreader">{selectedNode.data.materialIndex || 0}x</div>
          </div>
          <div className="bg-[#fcf9f4] p-3 border border-[#dac2b6] border-opacity-40 rounded-sm">
            <div className="text-[9px] text-[#877369] font-bold uppercase mb-1">Tier</div>
            <div className="font-bold">T{selectedNode.data.tier_level}</div>
          </div>
          <div className="bg-[#fcf9f4] p-3 border border-[#dac2b6] border-opacity-40 rounded-sm">
            <div className="text-[9px] text-[#877369] font-bold uppercase mb-1">Origin</div>
            <div className="font-bold text-[#974726]">{selectedNode.data.country_code || 'NA'}</div>
          </div>
        </div>

        {/* Alternative Splice Section */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Replace size={14} className="text-[#974726]" />
            <h3 className="text-[10px] font-bold text-[#553a34] uppercase tracking-[0.1em]">Verification Alternatives</h3>
          </div>
          
          <div className="space-y-4">
            {(!alternatives || alternatives.length === 0) ? (
              <div className="text-[10px] text-[#877369] italic p-4 border border-[#dac2b6] border-opacity-30 border-dashed rounded-sm text-center">
                Search resulted in zero local alternatives.
              </div>
            ) : (
              alternatives.map((alt) => {
                // Calculate exact deltas
                const currCost = (selectedNode.data.base_cost || 0) + (currentEdge?.data?.logistics?.cost || 0);
                const altCost = (alt.data.base_cost || 0) + (alt.edgeData?.logistics?.cost || 0);
                const costDelta = altCost - currCost;

                const isGreener = alt.data.materialIndex < selectedNode.data.materialIndex;
                const isCostlier = costDelta > 0;
                
                return (
                  <div key={alt.id} className="bg-white border border-[#dac2b6] border-opacity-40 hover:border-[#974726] rounded-md p-4 transition-all group shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-bold text-sm newsreader text-[#553a34]">{alt.data.label}</div>
                      <div className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${isGreener ? 'bg-[#15803d]/10 text-[#15803d]' : 'bg-[#974726]/10 text-[#974726]'}`}>
                        {alt.data.country_code} Score: {alt.data.score}
                      </div>
                    </div>
                    
                    <div className="flex gap-6 text-[11px] mt-4 bg-[#fcf9f4] p-3 rounded-sm">
                      <div className="flex items-center gap-2 w-1/2">
                        {isCostlier ? <TrendingUp size={14} className="text-[#b91c1c]"/> : <TrendingDown size={14} className="text-[#15803d]"/>}
                        <div className="flex flex-col leading-tight">
                          <span className="text-[9px] text-[#877369] font-bold uppercase tracking-tighter">Cost Δ</span>
                          <span className={`font-bold newsreader ${isCostlier ? 'text-[#b91c1c]' : 'text-[#15803d]'}`}>
                            {costDelta > 0 ? '+' : ''}${costDelta}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-1/2 border-l border-[#dac2b6] border-opacity-40 pl-4">
                        {isGreener ? <TrendingDown size={14} className="text-[#15803d]"/> : <TrendingUp size={14} className="text-[#b91c1c]"/>}
                        <div className="flex flex-col leading-tight">
                          <span className="text-[9px] text-[#877369] font-bold uppercase tracking-tighter">CO2 Idx</span>
                          <span className="text-[#553a34] font-bold newsreader">{alt.data.materialIndex}x</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => onSwap(selectedNode.id, alt)}
                      className="w-full mt-4 bg-[#553a34] hover:bg-[#3a2824] text-white py-2.5 rounded-sm text-[10px] font-bold transition-all uppercase tracking-[0.15em]"
                    >
                      Execute Swap Directive
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
