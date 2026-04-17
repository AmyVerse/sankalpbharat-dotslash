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
    <div className="absolute bottom-24 left-4 w-80 max-h-[calc(100vh-200px)] bg-slate-900/95 border border-slate-700/50 backdrop-blur-md rounded-xl p-0 shadow-2xl z-30 text-white font-sans overflow-hidden flex flex-col">
      <div className="flex items-center justify-between bg-slate-800/80 p-4 border-b border-slate-700">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">
            {selectedNode.type === 'plant' ? 'Assembly Plant' : 'Supplier Node'}
          </span>
          <h2 className="font-bold text-lg leading-tight">{selectedNode.data.label}</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Node Stats */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Index</div>
            <div className="font-mono">{selectedNode.data.materialIndex || 0}x</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Tier/Crit</div>
            <div>T{selectedNode.data.tier_level}/{selectedNode.data.criticality_level ? selectedNode.data.criticality_level.charAt(0) : 'L'}</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Region</div>
            <div className="font-bold text-orange-200">{selectedNode.data.country_code || 'NA'}</div>
          </div>
        </div>

        {/* Alternative Splice Section */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Replace size={14} className="text-blue-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Available Alternatives (Simulate)</h3>
          </div>
          
          <div className="space-y-3">
            {(!alternatives || alternatives.length === 0) ? (
              <div className="text-xs text-slate-500 italic p-3 border border-slate-700/50 border-dashed rounded-lg text-center">
                No verified alternatives found in the database.
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
                  <div key={alt.id} className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-3 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm text-blue-100">{alt.data.label}</div>
                      <div className={`text-xs px-2 py-0.5 rounded-full font-bold ${isGreener ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {alt.data.country_code} Score: {alt.data.score}
                      </div>
                    </div>
                    
                    <div className="flex gap-4 text-[11px] mt-2 bg-slate-900/50 p-2 rounded">
                      <div className="flex items-center gap-1.5 w-1/2">
                        {isCostlier ? <TrendingUp size={12} className="text-red-400"/> : <TrendingDown size={12} className="text-emerald-400"/>}
                        <div className="flex flex-col leading-tight">
                          <span className="text-slate-500">Net Cost</span>
                          <span className={isCostlier ? 'text-red-300 font-mono font-bold' : 'text-emerald-300 font-mono font-bold'}>
                            {costDelta > 0 ? '+' : ''}${costDelta}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 w-1/2 border-l border-slate-700 pl-3">
                        {isGreener ? <TrendingDown size={12} className="text-emerald-400"/> : <TrendingUp size={12} className="text-red-400"/>}
                        <div className="flex flex-col leading-tight">
                          <span className="text-slate-500">Material Idx</span>
                          <span className="text-slate-300 font-mono">{alt.data.materialIndex}x</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => onSwap(selectedNode.id, alt)}
                      className="w-full mt-3 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/50 py-1.5 rounded text-[11px] font-bold transition-all uppercase tracking-wider"
                    >
                      Swap Supplier & Simulate
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
