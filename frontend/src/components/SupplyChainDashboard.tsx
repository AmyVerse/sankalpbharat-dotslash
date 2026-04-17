import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { GoogleGenAI, Type } from '@google/genai';

import supplyData from '../mock_data/supply.json';
import alternativesData from '../mock_data/alternatives.json';
import { PlantNode, SupplierNode } from './GraphNodes';
import { PolicyManager } from './PolicyManager';
import { InspectorPanel } from './InspectorPanel';
import { AICommandBar } from './AICommandBar';
import type { AICommandResult, AIRecommendation } from './AICommandBar';
import { TimelineView, type Snapshot } from './TimelineView';
import { AIInsightPanel, type ImpactSummary } from './AIInsightPanel';
import { CircularEconomyPanel } from './CircularEconomyPanel';

const PROACTIVE_SUGGESTION_CACHE = new Map<string, AIRecommendation[]>();

const nodeTypes = { plant: PlantNode, supplier: SupplierNode };

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Helper to auto-layout the graph
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Estimating node dimensions based on our custom node UI width
    dagreGraph.setNode(node.id, { width: 220, height: 120 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - 110,
      y: nodeWithPosition.y - 60,
    };
    return node;
  });

  return { nodes, edges };
};

// Pure helper: recalculates total liability for any given state (no React deps)
const computeLiability = (
  edges: any[],
  nodes: any[],
  multipliers: Record<string, number>,
  taxRate: number
): number => {
  let total = 0;
  edges.forEach(edge => {
    const logistics = edge.data?.logistics;
    const sourceNode = nodes.find((n: any) => n.id === edge.source);
    if (logistics && sourceNode) {
      const edgeEmission =
        (logistics.weight_ton * sourceNode.data.materialIndex) +
        (logistics.weight_ton * logistics.distance_km * logistics.emission_factor);
      const country = sourceNode.data.country_code || 'NA';
      const mult = multipliers[country] ?? 1.0;
      total += edgeEmission * taxRate * mult;
    }
  });
  return Math.floor(total);
};

export default function SupplyChainDashboard() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const [carbonTaxRate] = useState(1500);
  const [countryMultipliers, setCountryMultipliers] = useState<Record<string, number>>({
    // International
    'CN': 1.0, 'KR': 1.0, 'EU': 1.0, 'US': 1.0, 'AU': 1.0,
    // Indian States (for GST/interstate simulation)
    'IN-MH': 1.0, 'IN-UP': 1.0, 'IN-GJ': 1.0, 'IN-MP': 1.0,
    'IN-TN': 1.0, 'IN-RJ': 1.0, 'IN-KA': 1.0, 'IN-JH': 1.0,
    'IN-AP': 1.0, 'IN-HR': 1.0,
  });

  // AI suggestions & impact state
  const [aiResponse, setAiResponse] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [impactSummary, setImpactSummary] = useState<ImpactSummary | null>(null);
  const [changeSummary, setChangeSummary] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [autoRunCommand, setAutoRunCommand] = useState<string>("");
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Timeline States
  const [timeline, setTimeline] = useState<Snapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const fetchSuggestions = async () => {
    if (isSuggesting || nodes.length === 0) return;
    setIsSuggesting(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey === "INSERT_YOUR_GEMINI_API_KEY_HERE") return;

      const activeSuppliers = nodes.filter((n: any) => n.type === 'supplier').map((n: any) => `{id: "${n.id}", label: "${n.data.label}", emis: ${n.data.materialIndex}, cost: ${n.data.base_cost}}`).join(' | ');

      if (PROACTIVE_SUGGESTION_CACHE.has(activeSuppliers)) {
        const cached = PROACTIVE_SUGGESTION_CACHE.get(activeSuppliers)!;
        setAiRecommendations(cached);
        setIsSuggesting(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      const condensedAlts = Object.entries(alternativesData).map(([target, alts]: any) =>
        `Alternatives for ${target} -> [${alts.map((a: any) => `{id: "${a.id}", label: "${a.data.label}", emis: ${a.data.materialIndex}, dist_km: ${a.edgeData?.logistics?.distance_km}, cost: ${a.data.base_cost}}`).join(', ')}]`
      ).join('; ');

      const prompt = `Based on these active suppliers: ${activeSuppliers}, and the Available Alternatives mapping: ${condensedAlts}, suggest 2 supplier swaps I should make. Just return a JSON array of objects. IMPORTANT RULES:
      1. Each object must have an 'action' string (strictly formatted, e.g. "Swap [Active Supplier] for [Alternative]"). DO NOT suggest tariffs.
      2. The 'reasoning' string MUST explicitly highlight the green tradeoff: if upfront Base Cost is higher but emissions are lower, clearly explain that 'Although the raw material premium increases base costs by X, the massive drop in Carbon Tax liability leads to an overall Net Total Cost reduction.'
      3. Instead of quoting figures in the reasoning, extract exactly 3 hard metrics into the 'metrics' array: one for "Est. Tax Savings", one for "Upfront Premium" (the base cost increase), and one for "Net Total Cost". Use 'label', 'value', and 'trend' (use 'up' for increase, 'down' for decrease). Make sure you calculate the exact difference.`;

      const responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            metrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                  trend: { type: Type.STRING }
                }
              }
            }
          }
        }
      };

      let response: any;
      let retries = 3;

      while (retries >= 0) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: responseSchema
            }
          });
          break;
        } catch (err: any) {
          if (retries === 0 || !err.message?.includes('503')) {
            console.warn('Gemini suggestion failed:', err.message);
            break;
          }
          console.warn(`Gemini 503. Retrying in 1s... (${retries} left)`);
          await new Promise(r => setTimeout(r, 1000));
          retries--;
        }
      }

      if (response?.text) {
        const recs = JSON.parse(response.text);

        // Cache the recommendations
        PROACTIVE_SUGGESTION_CACHE.set(activeSuppliers, recs);

        setAiRecommendations(recs);

        setTimeline(prev => {
          const newTimeline = [...prev];
          if (newTimeline[currentIndex]) {
            newTimeline[currentIndex] = {
              ...newTimeline[currentIndex],
              aiRecommendations: recs
            };
          }
          return newTimeline;
        });
      }
    } catch (e) {
      console.error("Auto-suggest error:", e);
    } finally {
      setIsSuggesting(false);
    }
  };

  useEffect(() => {
    if (nodes.length > 0 && timeline.length > 0) {
      if (aiRecommendations.length === 0) {
        fetchSuggestions();
      }
    }
  }, [currentIndex, nodes.length, timeline.length, aiRecommendations.length]);

  const pushToTimeline = (
    desc: string,
    currentNodes: Node[],
    currentEdges: Edge[],
    currentMults: Record<string, number>,
    extra?: {
      aiResponse?: string;
      aiRecommendations?: any[];
      impactSummary?: ImpactSummary | null;
      changeSummary?: string | null;
    }
  ) => {
    const snapshot: Snapshot = {
      timestamp: new Date().toLocaleTimeString(),
      description: desc,
      nodes: JSON.parse(JSON.stringify(currentNodes)),
      edges: JSON.parse(JSON.stringify(currentEdges)),
      countryMultipliers: { ...currentMults },
      ...(extra || {})
    };

    setTimeline(prev => {
      const activeStack = currentIndex === -1 ? prev : prev.slice(0, currentIndex + 1);
      const nextStack = [...activeStack, snapshot];
      setCurrentIndex(nextStack.length - 1);
      return nextStack;
    });
  };

  const restoreSnapshot = (idx: number) => {
    const snap = timeline[idx];
    if (snap) {
      setNodes(JSON.parse(JSON.stringify(snap.nodes)));
      setEdges(JSON.parse(JSON.stringify(snap.edges)));
      setCountryMultipliers({ ...snap.countryMultipliers });
      setAiResponse(snap.aiResponse || '');
      setAiRecommendations(snap.aiRecommendations || []);
      setImpactSummary(snap.impactSummary || null);
      setChangeSummary(snap.changeSummary || null);
      setCurrentIndex(idx);
    }
  };

  const handleAICommand = (result: AICommandResult) => {
    if (result.revert_timeline) {
      if (currentIndex > 0) {
        restoreSnapshot(currentIndex - 1);
      }
      return;
    }

    if (result.node_swap && result.node_swap.target_node_id && result.node_swap.alternative_node_id) {
      const targetId = result.node_swap.target_node_id;
      const altId = result.node_swap.alternative_node_id;
      const alternativeList = (alternativesData as any)[targetId] || [];
      const alternative = alternativeList.find((a: any) => a.id === altId);

      if (alternative) {
        handleSwap(targetId, alternative, result.ai_response, result.prompt);
        return;
      }
    }

    const beforeLiability = computeLiability(edges, nodes, countryMultipliers, carbonTaxRate);

    const nextMults = { ...countryMultipliers };
    result.tax_updates?.forEach(update => {
      if (nextMults[update.country_code] !== undefined) {
        nextMults[update.country_code] = update.multiplier;
      }
    });

    const afterLiability = computeLiability(edges, nodes, nextMults, carbonTaxRate);
    const delta = afterLiability - beforeLiability;

    // Find affected supplier nodes
    const changedCountries = result.tax_updates?.map(u => u.country_code) ?? [];
    const affectedNodes = nodes
      .filter(n => changedCountries.includes(n.data?.country_code))
      .map(n => n.data.label);

    const bullets: string[] = [
      ...(result.tax_updates?.map(u => {
        const pct = ((Math.abs(u.multiplier - 1)) * 100).toFixed(0);
        return u.multiplier > 1.0
          ? `${pct}% import tariff applied on ${u.country_code} origin nodes`
          : `${pct}% subsidy applied to ${u.country_code} routes`;
      }) ?? []),
      affectedNodes.length > 0
        ? `${affectedNodes.length} supplier(s) affected: ${affectedNodes.slice(0, 3).join(', ')}${affectedNodes.length > 3 ? ` +${affectedNodes.length - 3} more` : ''}`
        : 'No matching supplier nodes found in active graph.',
      `Policy liability changed by ₹${Math.abs(delta).toLocaleString()} (${delta >= 0 ? '↑ increase' : '↓ decrease'})`,
    ];

    setCountryMultipliers(nextMults);
    setAiResponse(result.ai_response || '');
    setAiRecommendations(result.recommended_actions || []);
    setImpactSummary({ bullets, delta, before: beforeLiability, after: afterLiability });
    setChangeSummary(result.ai_response || null);
    pushToTimeline(result.prompt || 'AI Policy Execution', nodes, edges, nextMults, {
      aiResponse: result.ai_response || '',
      aiRecommendations: result.recommended_actions || [],
      impactSummary: { bullets, delta, before: beforeLiability, after: afterLiability },
      changeSummary: result.ai_response || null
    });
  };

  // Initialize Layout
  useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      supplyData.nodes as Node[],
      supplyData.edges as Edge[]
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    if (timeline.length === 0) {
      setCurrentIndex(0);
      setTimeline([{
        timestamp: new Date().toLocaleTimeString(),
        description: "Initial Baseline State",
        nodes: JSON.parse(JSON.stringify(layoutedNodes)),
        edges: JSON.parse(JSON.stringify(layoutedEdges)),
        countryMultipliers: {
          'CN': 1.0, 'KR': 1.0, 'EU': 1.0, 'US': 1.0, 'AU': 1.0,
          'IN-MH': 1.0, 'IN-UP': 1.0, 'IN-GJ': 1.0, 'IN-MP': 1.0,
          'IN-TN': 1.0, 'IN-RJ': 1.0, 'IN-KA': 1.0, 'IN-JH': 1.0,
          'IN-AP': 1.0, 'IN-HR': 1.0,
        },
        aiResponse: '',
        aiRecommendations: [],
        impactSummary: null,
        changeSummary: null
      }]);
    }
  }, []);

  // Compute accumulated emissions (Schema logic: recursively walk edges to Plants)
  // And dynamic hotspot calculation
  const { updatedNodes, totalNetworkEmissions, dynamicShadowPL } = useMemo(() => {
    if (nodes.length === 0) return { updatedNodes: [], totalNetworkEmissions: 0, dynamicShadowPL: 0 };
    // IMPORTANT: deep-copy .data so mutations below don't bleed into the original nodes
    // state reference (which would make the useEffect JSON comparison see no diff)
    const newNodes = [...nodes].map(n => ({ ...n, data: { ...n.data } }));

    let totalEms = 0;
    let totalTaxLiability = 0;

    const nodeAccumulations: Record<string, number> = {};
    const nodeHotspotChecks: Record<string, boolean> = {};

    edges.forEach(edge => {
      const logistics = edge.data?.logistics;
      const sourceNode = newNodes.find(n => n.id === edge.source);
      if (logistics && sourceNode) {
        const qty = logistics.weight_ton;
        const matIndex = sourceNode.data.materialIndex;
        const transitEms = logistics.weight_ton * logistics.distance_km * logistics.emission_factor;

        const edgeEmission = (qty * matIndex) + transitEms;
        totalEms += edgeEmission;

        nodeAccumulations[edge.target] = (nodeAccumulations[edge.target] || 0) + edgeEmission;

        if (edgeEmission > 5000) {
          nodeHotspotChecks[edge.source] = true;
        }

        // --- Dynamic Tax & Policy Logic per Edge ---
        let edgeTaxMultiplier = 1.0;
        const sourceCountry = sourceNode.data.country_code || 'NA';

        if (countryMultipliers[sourceCountry]) {
          edgeTaxMultiplier *= countryMultipliers[sourceCountry];
        }

        totalTaxLiability += (edgeEmission * carbonTaxRate) * edgeTaxMultiplier;
      }
    });

    newNodes.forEach(node => {
      if (node.type === 'plant') {
        node.data.accumulatedEmissions = nodeAccumulations[node.id] || 0;
      }
      if (node.type === 'supplier') {
        const isHotspot = nodeHotspotChecks[node.id] || node.data.score < 30;
        node.data.isHotspot = isHotspot;

        const countryCode = node.data.country_code || 'NA';
        node.data.isTaxed = countryMultipliers[countryCode] > 1.0;
        node.data.isSubsidized = countryMultipliers[countryCode] < 1.0;
      }
    });

    return { updatedNodes: newNodes, totalNetworkEmissions: totalEms, dynamicShadowPL: Math.floor(totalTaxLiability) };
  }, [nodes, edges, carbonTaxRate, countryMultipliers]);


  // Update the actual node state visually with the computed hotspots
  useEffect(() => {
    if (updatedNodes.length > 0 && JSON.stringify(updatedNodes) !== JSON.stringify(nodes)) {
      setNodes(updatedNodes);
    }
  }, [updatedNodes]);

  const { visibleNodes, visibleEdges } = useMemo(() => {
    let outNodes = [...nodes];
    let outEdges = [...edges];

    if (showAlternatives) {
      nodes.forEach(n => {
        const alts = (alternativesData as any)[n.id];
        if (alts && alts.length > 0) {
          alts.forEach((alt: any, i: number) => {
            outNodes.push({
              id: alt.id,
              type: 'supplier',
              position: { x: n.position.x + 60, y: n.position.y + 140 * (i + 1) },
              data: { ...alt.data, isAlternativeNode: true },
              width: 220,
              height: 120,
              zIndex: -1,
              draggable: false
            });
            const parentEdge = edges.find(e => e.source === n.id);
            if (parentEdge) {
              outEdges.push({
                id: `edge-${alt.id}-${parentEdge.target}`,
                source: alt.id,
                target: parentEdge.target,
                animated: true,
                style: { strokeDasharray: '5,5', stroke: '#cbd5e1', opacity: 0.3 }
              });
            }
          });
        }
      });
    }
    return { visibleNodes: outNodes, visibleEdges: outEdges };
  }, [nodes, edges, showAlternatives]);

  // Use the new dynamic property
  const shadowPL = dynamicShadowPL;

  // Find the edge originating from the currently selected node
  const currentEdge = useMemo(() => {
    return edges.find(e => e.source === selectedNode?.id) || null;
  }, [edges, selectedNode]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleSwap = (targetNodeId: string, alternative: any, customAiResponse?: string, customTimelineDesc?: string) => {
    const targetNode = nodes.find(n => n.id === targetNodeId);
    const beforeLiability = computeLiability(edges, nodes, countryMultipliers, carbonTaxRate);

    let swappedNodes = nodes.map(n => {
      if (n.id === targetNodeId) {
        return { ...n, id: alternative.id, data: { ...n.data, ...alternative.data } };
      }
      return n;
    });

    // Color edge based on whether it's actually an improvement
    const isImprovement = (alternative.data.materialIndex || 0) < (targetNode?.data.materialIndex || 0)
      || (alternative.data.score || 0) > (targetNode?.data.score || 0);
    const edgeColor = isImprovement ? '#10b981' : '#f97316'; // green if better, orange if worse

    let swappedEdges = edges.map(e => {
      if (e.source === targetNodeId) {
        return {
          ...e,
          source: alternative.id,
          data: alternative.edgeData,
          style: { stroke: edgeColor, strokeWidth: 2 }
        };
      }
      return e;
    });

    const afterLiability = computeLiability(swappedEdges, swappedNodes, countryMultipliers, carbonTaxRate);
    const delta = afterLiability - beforeLiability;

    const currCost = (targetNode?.data.base_cost || 0);
    const altCost = (alternative.data.base_cost || 0);
    const costDelta = altCost - currCost;
    const emDelta = (alternative.data.materialIndex || 0) - (targetNode?.data.materialIndex || 0);

    const swapBullets: string[] = [
      `Replaced ${targetNode?.data.label || targetNodeId} (${targetNode?.data.country_code || '?'}) with ${alternative.data.label} (${alternative.data.country_code || '?'})`,
      `Supplier cost delta: ${costDelta >= 0 ? '+' : ''}$${costDelta}/unit`,
      `Emission index delta: ${emDelta >= 0 ? '+' : ''}${emDelta}x material index`,
      `Policy liability changed by ₹${Math.abs(delta).toLocaleString()} (${delta >= 0 ? '↑ increase' : '↓ decrease'})`,
    ];

    setAiResponse(customAiResponse || `Swapped to ${alternative.data.label}`);
    setAiRecommendations([]);
    setImpactSummary({ bullets: swapBullets, delta, before: beforeLiability, after: afterLiability });
    setChangeSummary(`Supplier swapped: ${targetNode?.data.label} → ${alternative.data.label}`);

    const layouted = getLayoutedElements(swappedNodes, swappedEdges);
    pushToTimeline(customTimelineDesc || customAiResponse || `Swapped ${targetNode?.data.label} → ${alternative.data.label}`, layouted.nodes, layouted.edges, countryMultipliers, {
      aiResponse: customAiResponse || `Swapped to ${alternative.data.label}`,
      aiRecommendations: [],
      impactSummary: { bullets: swapBullets, delta, before: beforeLiability, after: afterLiability },
      changeSummary: `Supplier swapped: ${targetNode?.data.label} → ${alternative.data.label}`
    });

    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    setSelectedNode(null);
  };


  return (
    <div className="h-screen w-full bg-[#fcf9f4] flex flex-col font-sans overflow-hidden text-[#553a34] selection:bg-[#ffdea0] selection:text-[#261900]">
      <div className="h-20 border-b border-[#dac2b6] border-opacity-30 flex items-center justify-between px-10 bg-white z-20 shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-[#553a34] tracking-tight">
            SYMBIOSIS <span className="text-[#974726] font-black italic">AI</span>
          </h1>
          <span className="text-[9px] text-[#877369] font-bold tracking-[0.3em] uppercase">Supply Topology Engine</span>
        </div>

        <div className="flex gap-6 items-center">
          {/* Toggle for Alternatives */}
          <div className="flex items-center gap-2 mr-2 bg-[#ebe8e3] px-3 py-1.5 rounded-md border border-[#dac2b6] border-opacity-30">
            <span className="text-[9px] text-[#877369] font-bold uppercase tracking-wider">Show Alternatives</span>
            <button
              onClick={() => setShowAlternatives(!showAlternatives)}
              className={`w-8 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${showAlternatives ? 'bg-[#974726]' : 'bg-[#dac2b6]'}`}
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-all ${showAlternatives ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Change Summary Box - Editorial Style */}
          {changeSummary && (
            <div className="max-w-xs bg-[#ebe8e3] border border-[#dac2b6] border-opacity-40 px-4 py-2 rounded-md">
              <p className="text-[9px] text-[#974726] uppercase font-bold mb-1 tracking-wider">Active Analysis Update</p>
              <p className="text-[11px] text-[#553a34] leading-snug line-clamp-2 font-medium italic">{changeSummary}</p>
            </div>
          )}
          <div className="text-right bg-[#fcf9f4] px-5 py-2 rounded-md border border-[#dac2b6] border-opacity-40">
            <p className="text-[9px] text-[#877369] uppercase font-bold tracking-widest mb-1">Network Accumulation</p>
            <p className="text-md font-bold text-[#553a34] tracking-tight">{totalNetworkEmissions.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px] text-[#877369] font-medium uppercase">tons CO2e</span></p>
          </div>
          <div className="text-right bg-[#b91c1c]/5 px-6 py-2 rounded-md border border-[#b91c1c]/20">
            <p className="text-[9px] text-[#b91c1c] uppercase font-bold tracking-widest mb-1">Projected Policy Liability</p>
            <p className="text-2xl font-bold text-[#b91c1c] tracking-tight newsreader">₹{shadowPL.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex-grow relative">
        <TimelineView
          timeline={timeline}
          currentIndex={currentIndex}
          onRestore={restoreSnapshot}
        />
        <AIInsightPanel
          aiResponse={aiResponse}
          impactSummary={impactSummary}
          recommendations={aiRecommendations}
          isSuggesting={isSuggesting}
          onSuggestionClick={setAutoRunCommand}
        />

        <CircularEconomyPanel nodes={nodes} edges={edges} />

        <InspectorPanel
          selectedNode={selectedNode}
          currentEdge={currentEdge}
          alternatives={selectedNode ? (alternativesData as any)[selectedNode.id] : []}
          onClose={() => setSelectedNode(null)}
          onSwap={handleSwap}
        />

        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          className="react-flow-container"
        >
          <Background color="#dac2b6" gap={30} size={1} />
          <Controls className="react-flow-controls-editorial !bg-white !border-[#dac2b6] !border-opacity-40 !shadow-md !fill-[#553a34]" />
        </ReactFlow>

        {/* The NLP AI Co-Pilot Input */}
        <AICommandBar
          onCommand={handleAICommand}
          contextNodes={nodes}
          contextAlternatives={alternativesData}
          autoRunPrompt={autoRunCommand}
          onAutoRunClear={() => setAutoRunCommand("")}
        />

      </div>
    </div>
  );
}