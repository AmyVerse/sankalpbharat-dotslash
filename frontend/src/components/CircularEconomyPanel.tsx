import React, { useMemo, useState } from 'react';
import { Recycle, ArrowRight, TrendingDown, Truck, Factory, ChevronDown, ChevronUp } from 'lucide-react';
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

const WASTE_CONSUMERS: Record<string, { consumer_label: string; savings_pct: number; emission_reduction_kg: number }> = {
  'lithium_scrap':    { consumer_label: 'Gujarat Li-Ion Cells (S5)', savings_pct: 22, emission_reduction_kg: 340 },
  'steel_scrap':      { consumer_label: 'Bharat Forge (S3) / Chennai Stamping (P2)', savings_pct: 18, emission_reduction_kg: 210 },
  'electrolyte_waste': { consumer_label: 'GJ Electrolyte Chem (S12)', savings_pct: 30, emission_reduction_kg: 180 },
  'cathode_dust':     { consumer_label: 'Exide EV Batteries (S1)', savings_pct: 15, emission_reduction_kg: 420 },
  'copper_offcut':    { consumer_label: 'Motherson Wiring (S2)', savings_pct: 25, emission_reduction_kg: 95 },
  'casting_slag':     { consumer_label: 'Bharat Forge (S3)', savings_pct: 12, emission_reduction_kg: 130 },
};

interface CircularEconomyPanelProps {
  nodes: Node[];
  edges: Edge[];
}

interface Opportunity {
  sourceId: string;
  sourceLabel: string;
  wasteType: string;
  wasteLabel: string;
  consumerLabel: string;
  savingsPct: number;
  emissionReductionKg: number;
  transportCostEstimate: number;
  freshProcurementCost: number;
  netSaving: number;
}

export const CircularEconomyPanel: React.FC<CircularEconomyPanelProps> = ({ nodes, edges }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const opportunities = useMemo<Opportunity[]>(() => {
    const results: Opportunity[] = [];
    const supplierNodes = nodes.filter(n => n.type === 'supplier');

    supplierNodes.forEach(node => {
      const flow = MATERIAL_FLOWS[node.id];
      if (!flow) return;

      const consumer = WASTE_CONSUMERS[flow.produces_waste];
      if (!consumer) return;

      if (consumer.consumer_label.includes(node.id)) return;

      const nodeEdge = edges.find(e => e.source === node.id);
      const baseDistance = nodeEdge?.data?.logistics?.distance_km || 500;
      const baseCost = node.data.base_cost || 2000;

      const transportCost = Math.round(baseDistance * 0.08 * 12);
      const freshCost = Math.round(baseCost * (consumer.savings_pct / 100) * 10);
      const netSaving = freshCost - transportCost;

      if (netSaving > 0) {
        results.push({
          sourceId: node.id,
          sourceLabel: node.data.label,
          wasteType: flow.produces_waste,
          wasteLabel: flow.waste_label,
          consumerLabel: consumer.consumer_label,
          savingsPct: consumer.savings_pct,
          emissionReductionKg: consumer.emission_reduction_kg,
          transportCostEstimate: transportCost,
          freshProcurementCost: freshCost,
          netSaving
        });
      }
    });

    return results.sort((a, b) => b.netSaving - a.netSaving);
  }, [nodes, edges]);

  const totalSavings = opportunities.reduce((sum, o) => sum + o.netSaving, 0);
  const totalEmissionReduction = opportunities.reduce((sum, o) => sum + o.emissionReductionKg, 0);

  if (opportunities.length === 0) return null;

  return (
    <div
      className="absolute bottom-4 right-4 z-20 overflow-hidden"
      style={{
        width: '320px',
        background: '#fcf9f4',
        border: '1px solid rgba(218, 194, 182, 0.4)',
        borderRadius: '6px',
        fontFamily: "'Trebuchet MS', 'Cera Pro', sans-serif",
        boxShadow: '0 8px 30px rgba(85, 58, 52, 0.04), 0 2px 8px rgba(85, 58, 52, 0.08)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#ebe8e3',
          border: 'none',
          borderBottom: '1px solid rgba(218, 194, 182, 0.3)',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Recycle size={14} style={{ color: '#553d00' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#553a34', letterSpacing: '0.02em' }}>
            Circular Economy
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              background: '#ffdea0',
              color: '#261900',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 700,
            }}
          >
            {opportunities.length}
          </span>
        </div>
        {isOpen
          ? <ChevronDown size={12} style={{ color: '#877369' }} />
          : <ChevronUp size={12} style={{ color: '#877369' }} />
        }
      </button>

      {isOpen && (
        <>
          {/* Summary Strip */}
          <div style={{ display: 'flex', gap: '8px', padding: '12px 14px', borderBottom: '1px solid rgba(218, 194, 182, 0.25)' }}>
            <div
              style={{
                flex: 1,
                background: '#ffffff',
                border: '1px solid rgba(218, 194, 182, 0.3)',
                borderRadius: '6px',
                padding: '10px 8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#877369', letterSpacing: '0.03em' }}>Est. Savings</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#553d00', fontFamily: "'Georgia', serif", marginTop: '2px' }}>
                ₹{totalSavings.toLocaleString()}
              </div>
            </div>
            <div
              style={{
                flex: 1,
                background: '#ffffff',
                border: '1px solid rgba(218, 194, 182, 0.3)',
                borderRadius: '6px',
                padding: '10px 8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#877369', letterSpacing: '0.03em' }}>CO₂ Avoided</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#974726', fontFamily: "'Georgia', serif", marginTop: '2px' }}>
                {totalEmissionReduction.toLocaleString()} kg
              </div>
            </div>
          </div>

          {/* Opportunity Cards */}
          <div style={{ maxHeight: '260px', overflowY: 'auto', padding: '10px 12px' }}>
            {opportunities.map((opp, idx) => {
              const isExpanded = expandedIdx === idx;
              return (
                <div
                  key={idx}
                  style={{
                    background: idx % 2 === 0 ? '#ffffff' : '#fcf9f4',
                    border: '1px solid rgba(218, 194, 182, 0.25)',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#ffdea0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Recycle size={12} style={{ color: '#553d00' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.7rem', color: '#553a34', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opp.wasteLabel}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#877369', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <Factory size={8} /> {opp.sourceLabel} <ArrowRight size={8} /> {opp.consumerLabel}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#553d00', fontFamily: "'Georgia', serif", flexShrink: 0 }}>
                      ₹{opp.netSaving.toLocaleString()}
                    </span>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(218, 194, 182, 0.2)', background: '#ebe8e3' }}>
                      <p style={{ fontSize: '0.68rem', color: '#553a34', fontStyle: 'italic', margin: '10px 0', lineHeight: 1.6 }}>
                        Reusing {opp.wasteLabel.toLowerCase()} from {opp.sourceLabel} eliminates fresh procurement for {opp.consumerLabel}, saving {opp.savingsPct}% on material costs.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                        <div style={{ background: '#fcf9f4', border: '1px solid rgba(218, 194, 182, 0.3)', borderRadius: '4px', padding: '8px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#877369' }}>Transport</div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#553d00', fontFamily: "'Georgia', serif", marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                            <Truck size={9} />₹{opp.transportCostEstimate.toLocaleString()}
                          </div>
                        </div>
                        <div style={{ background: '#fcf9f4', border: '1px solid rgba(218, 194, 182, 0.3)', borderRadius: '4px', padding: '8px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#877369' }}>Fresh Cost</div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#974726', fontFamily: "'Georgia', serif", marginTop: '4px', textDecoration: 'line-through' }}>
                            ₹{opp.freshProcurementCost.toLocaleString()}
                          </div>
                        </div>
                        <div style={{ background: '#fcf9f4', border: '1px solid rgba(218, 194, 182, 0.3)', borderRadius: '4px', padding: '8px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#877369' }}>CO₂ Saved</div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#553d00', fontFamily: "'Georgia', serif", marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                            <TrendingDown size={9} />{opp.emissionReductionKg} kg
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
