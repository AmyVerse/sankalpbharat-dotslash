import React, { useMemo, useState } from 'react';
import { Recycle, ArrowRight, TrendingDown, Truck, Factory, X, CheckCircle, Package } from 'lucide-react';
import type { Node, Edge } from 'reactflow';

// Material category mappings — what waste a supplier tier produces and who can consume it
const MATERIAL_FLOWS: Record<string, { produces_waste: string; waste_label: string }> = {
  'S1':  { produces_waste: 'lithium_scrap', waste_label: 'Battery Assembly Scrap (Li-Ion)' },
  'S3':  { produces_waste: 'steel_scrap', waste_label: 'Forging Scrap (Hi-Tensile Steel)' },
  'S5':  { produces_waste: 'electrolyte_waste', waste_label: 'Spent Electrolyte Residue' },
  'S6':  { produces_waste: 'cathode_dust', waste_label: 'NMC Cathode Dust' },
  'S7':  { produces_waste: 'copper_offcut', waste_label: 'Copper Wire Offcuts' },
  'S8':  { produces_waste: 'steel_scrap', waste_label: 'Steel Stamping Offcuts' },
  'S9':  { produces_waste: 'casting_slag', waste_label: 'Casting Slag (Aluminium/Iron)' },
  'S10': { produces_waste: 'lithium_scrap', waste_label: 'Lithium Refinery Tailings' },
  'S12': { produces_waste: 'electrolyte_waste', waste_label: 'Chemical Electrolyte Byproduct' },
};

const WASTE_CONSUMERS: Record<string, { consumer_id: string; consumer_label: string; savings_pct: number; emission_reduction_kg: number }> = {
  'lithium_scrap':    { consumer_id: 'S5', consumer_label: 'Gujarat Li-Ion Cells (S5)', savings_pct: 22, emission_reduction_kg: 340 },
  'steel_scrap':      { consumer_id: 'S3', consumer_label: 'Bharat Forge (S3)', savings_pct: 18, emission_reduction_kg: 210 },
  'electrolyte_waste': { consumer_id: 'S12', consumer_label: 'GJ Electrolyte Chem (S12)', savings_pct: 30, emission_reduction_kg: 180 },
  'cathode_dust':     { consumer_id: 'S1', consumer_label: 'Exide EV Batteries (S1)', savings_pct: 15, emission_reduction_kg: 420 },
  'copper_offcut':    { consumer_id: 'S2', consumer_label: 'Motherson Wiring (S2)', savings_pct: 25, emission_reduction_kg: 95 },
  'casting_slag':     { consumer_id: 'S3', consumer_label: 'Bharat Forge (S3)', savings_pct: 12, emission_reduction_kg: 130 },
};

const INVENTORY_EXCESS = [
  { sourceId: 'P1', excess_item: 'OBC Transistors', targetId: 'P2', transportDist: 1100, freshCostAtDest: 45000, disposalCostAtSrc: 12000, eFactor: 0.00012, wgt: 4 },
  { sourceId: 'S2', excess_item: 'Connector Clips', targetId: 'S4', transportDist: 1400, freshCostAtDest: 18000, disposalCostAtSrc: 4000, eFactor: 0.00012, wgt: 2 }
];

export interface CircularOpportunity {
  type: 'waste_repurpose' | 'inventory_balance';
  id: string;
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  itemLabel: string;
  transportCostEstimate: number;
  freshProcurementCost: number;
  netSaving: number;
  emissionReductionKg: number;
  description: string;
  adopted: boolean;
}

interface CircularEconomyPanelProps {
  nodes: Node[];
  edges: Edge[];
  isOpen: boolean;
  onClose: () => void;
  onAdopt: (opp: CircularOpportunity) => void;
}

export const CircularEconomyPanel: React.FC<CircularEconomyPanelProps> = ({ nodes, edges, isOpen, onClose, onAdopt }) => {
  const [expandedIdx, setExpandedIdx] = useState<string | null>(null);

  const opportunities = useMemo<CircularOpportunity[]>(() => {
    const results: CircularOpportunity[] = [];
    const sourceMap = new Map(nodes.map(n => [n.id, n]));

    // 1. Waste Repurposing Defaults
    const supplierNodes = nodes.filter(n => n.type === 'supplier');
    supplierNodes.forEach(node => {
      const flow = MATERIAL_FLOWS[node.id];
      if (!flow) return;

      const consumer = WASTE_CONSUMERS[flow.produces_waste];
      if (!consumer) return;

      if (node.id === consumer.consumer_id) return; // Can't self-consume

      const consumerNode = sourceMap.get(consumer.consumer_id);
      if (!consumerNode) return; // Consumer must be active on map

      // Check if edge already exists to prevent duplicate adoption
      const edgeAlreadyAdopted = edges.some(e => e.source === node.id && e.target === consumer.consumer_id && e.id.includes('circular'));

      const nodeEdge = edges.find(e => e.source === node.id);
      const baseDistance = nodeEdge?.data?.logistics?.distance_km || 500;
      const baseCost = node.data.base_cost || 2000;

      const transportCost = Math.round(baseDistance * 0.08 * 12);
      const freshCost = Math.round(baseCost * (consumer.savings_pct / 100) * 10);
      const netSaving = freshCost - transportCost;

      if (netSaving > 0) {
        results.push({
          type: 'waste_repurpose',
          id: `waste-${node.id}-${consumer.consumer_id}`,
          sourceId: node.id,
          sourceLabel: node.data.label,
          targetId: consumer.consumer_id,
          targetLabel: consumer.consumer_label.split('(')[0].trim(),
          itemLabel: flow.waste_label,
          transportCostEstimate: transportCost,
          freshProcurementCost: freshCost,
          netSaving,
          emissionReductionKg: consumer.emission_reduction_kg,
          description: `Reusing ${flow.waste_label.toLowerCase()} from ${node.data.label} eliminates fresh procurement for ${consumer.consumer_label}, saving on raw material mining.`,
          adopted: edgeAlreadyAdopted
        });
      }
    });

    // 2. Inventory Balancing Defaults
    INVENTORY_EXCESS.forEach(exc => {
      const srcNode = sourceMap.get(exc.sourceId);
      const tgtNode = sourceMap.get(exc.targetId);
      if (srcNode && tgtNode) {
        const edgeAlreadyAdopted = edges.some(e => e.source === exc.sourceId && e.target === exc.targetId && e.id.includes('circular'));
        
        const transportCost = Math.round(exc.transportDist * 15 * exc.wgt); 
        const freshTotal = exc.freshCostAtDest + exc.disposalCostAtSrc;
        const netSaving = freshTotal - transportCost;
        
        // Em savings estimation based on avoided fresh + disposal
        const transportEms = Math.round(exc.transportDist * exc.wgt * exc.eFactor * 1000);
        const avoidedEms = Math.round((exc.freshCostAtDest / 100) + (exc.disposalCostAtSrc / 200)); 
        const emissionReductionKg = avoidedEms - transportEms;

        results.push({
          type: 'inventory_balance',
          id: `inv-${exc.sourceId}-${exc.targetId}`,
          sourceId: exc.sourceId,
          sourceLabel: srcNode.data.label,
          targetId: exc.targetId,
          targetLabel: tgtNode.data.label,
          itemLabel: exc.excess_item,
          transportCostEstimate: transportCost,
          freshProcurementCost: freshTotal, // (Fresh Dest + Disposal Src)
          netSaving: netSaving,
          emissionReductionKg: emissionReductionKg > 0 ? emissionReductionKg : 55,
          description: `Redistributing surplus ${exc.excess_item} from ${srcNode.data.label} to ${tgtNode.data.label} offsets both disposal costs and fresh ordering delays.`,
          adopted: edgeAlreadyAdopted
        });
      }
    });

    return results.sort((a, b) => b.netSaving - a.netSaving);
  }, [nodes, edges]);

  const totalInsightsActive = opportunities.length;

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-20 bottom-0 w-96 bg-[#fcf9f4] border-l border-[#dac2b6] border-opacity-40 z-30 shadow-2xl flex flex-col font-sans transition-transform duration-300 transform translate-x-0">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#dac2b6] border-opacity-30 bg-white flex justify-between items-center shrink-0">
        <div className="flex gap-3 items-center">
          <div className="w-8 h-8 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981]">
            <Recycle size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#553a34] uppercase tracking-wider">Circular Action Engine</h2>
            <p className="text-[10px] text-[#877369] font-medium tracking-widest uppercase">
              {totalInsightsActive} active opportunities
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[#ebe8e3] rounded-full transition-colors text-[#877369]">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {opportunities.length === 0 ? (
          <div className="text-center py-10 text-[#877369] text-sm italic">
            No circular opportunities found in the current supply graph.
          </div>
        ) : null}

        {opportunities.map((opp) => {
          const isExpanded = expandedIdx === opp.id;
          const isAdopted = opp.adopted;
          return (
            <div
              key={opp.id}
              className={`border border-[#dac2b6] border-opacity-40 rounded-xl overflow-hidden transition-all duration-200 ${isAdopted ? 'bg-[#10b981]/5 border-[#10b981]/30 opacity-70' : 'bg-white shadow-sm hover:shadow-md'}`}
            >
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : opp.id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 bg-transparent cursor-pointer"
              >
                <div className={`mt-1 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${opp.type === 'inventory_balance' ? 'bg-[#3b82f6]/10 text-[#3b82f6]' : 'bg-[#f59e0b]/10 text-[#d97706]'}`}>
                  {isAdopted ? <CheckCircle size={14} /> : (opp.type === 'inventory_balance' ? <Package size={14}/> : <Recycle size={14} />)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-[#553a34] truncate pr-2">{opp.itemLabel}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0 ${isAdopted ? 'bg-[#10b981] text-white' : 'bg-[#e5e7eb] text-[#4b5563]'}`}>
                      {isAdopted ? 'Adopted' : (opp.type === 'inventory_balance' ? 'Inv. Balance' : 'Waste Loop')}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#877369] flex items-center gap-1.5 mt-1 font-medium">
                    <span className="truncate">{opp.sourceLabel}</span> 
                    <ArrowRight size={10} className="shrink-0" /> 
                    <span className="truncate">{opp.targetLabel}</span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 bg-[#fcf9f4] border-t border-[#dac2b6] border-opacity-20 flex flex-col gap-3">
                  <p className="text-[11px] text-[#553a34] leading-relaxed italic border-l-2 border-[#dac2b6] pl-3">
                    {opp.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-2">
                     <div className="bg-white border border-[#dac2b6] border-opacity-30 rounded-lg p-2 text-center">
                        <div className="text-[9px] font-bold text-[#877369] uppercase tracking-wider mb-1">Cost vs Fresh</div>
                        <div className="text-xs font-bold text-[#10b981] flex justify-center items-center gap-1">
                          ₹{opp.netSaving.toLocaleString()}
                        </div>
                     </div>
                     <div className="bg-white border border-[#dac2b6] border-opacity-30 rounded-lg p-2 text-center">
                        <div className="text-[9px] font-bold text-[#877369] uppercase tracking-wider mb-1">Transport</div>
                        <div className="text-xs font-bold text-[#f59e0b] -mt-0.5">
                          ₹{opp.transportCostEstimate.toLocaleString()}
                        </div>
                     </div>
                     <div className="bg-white border border-[#dac2b6] border-opacity-30 rounded-lg p-2 text-center">
                        <div className="text-[9px] font-bold text-[#877369] uppercase tracking-wider mb-1">CO₂ Delta</div>
                        <div className="text-xs font-bold text-[#10b981] flex justify-center items-center gap-1">
                          <TrendingDown size={10} />{opp.emissionReductionKg}kg
                        </div>
                     </div>
                  </div>

                  {!isAdopted && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAdopt(opp); }}
                      className="mt-2 w-full py-2 bg-[#553a34] text-[#fcf9f4] text-[11px] font-bold uppercase tracking-widest rounded-md hover:bg-[#3d2925] transition-colors"
                    >
                      Authorize Transaction 
                    </button>
                  )}
                  {isAdopted && (
                    <div className="mt-2 text-center text-[10px] text-[#10b981] font-bold uppercase tracking-wider bg-[#10b981]/10 py-1.5 rounded-md">
                      Transaction Active in Graph
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

