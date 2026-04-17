import  { useState } from 'react';
// Regular imports for runtime components
import ReactFlow, { Background, Controls } from 'reactflow';
// Type-only imports
import type { Node, Edge,  } from 'reactflow';
import 'reactflow/dist/style.css';

import mockData from '../mock_data/supply.json';
import { PlantNode, SupplierNode } from './GraphNodes';

interface SupplyChainNodeData {
  label: string;
  score?: number;
  emissions?: number;
  tier?: number;
  cost?: number;
}

const nodeTypes = { plant: PlantNode, supplier: SupplierNode };

export default function SupplyChainDashboard() {
  // Use the 'Node' and 'Edge' types we just imported
  const [nodes, setNodes] = useState<Node<SupplyChainNodeData>[]>(mockData.nodes as Node<SupplyChainNodeData>[]);
  const [edges, setEdges] = useState<Edge[]>(mockData.edges as Edge[]);
  const [shadowPL, setShadowPL] = useState(245000);

  const handleSwap = () => {
    const newNodes: Node<SupplyChainNodeData>[] = nodes.map((node) => {
      if (node.id === 'S3') {
        return { 
          ...node, 
          data: { 
            ...node.data, 
            label: 'Green Mine AG', 
            score: 92 
          }, 
          style: { 
            border: '2px solid #10b981',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)' 
          } 
        };
      }
      return node;
    });

    const newEdges: Edge[] = edges.map((edge) => {
      if (edge.source === 'S3') {
        return { 
          ...edge, 
          style: { stroke: '#10b981', strokeWidth: 2 },
          animated: true 
        };
      }
      return edge;
    });

    setNodes(newNodes);
    setEdges(newEdges);
    setShadowPL(prev => prev - 45000); 
  };

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col font-sans">
      <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-white tracking-tighter italic">
            SYMBIOSIS <span className="text-blue-500 not-italic font-black">AI</span>
          </h1>
          <span className="text-[8px] text-slate-500 font-bold tracking-[0.2em] -mt-1 uppercase">Decision Support System</span>
        </div>

        <div className="flex gap-8 items-center">
          <div className="text-right bg-slate-800/40 px-3 py-1 rounded border border-white/5">
            <p className="text-[9px] text-slate-500 uppercase font-black">Projected Carbon Tax</p>
            <p className="text-lg font-mono text-red-400 font-bold">₹{shadowPL.toLocaleString()}</p>
          </div>
          <button 
            onClick={handleSwap} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded font-black text-[10px] tracking-widest transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            SIMULATE CIRCULAR SWAP
          </button>
        </div>
      </div>

      <div className="flex-grow">
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          nodeTypes={nodeTypes} 
          fitView
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="bg-slate-900 border-slate-700 fill-white shadow-2xl" />
        </ReactFlow>
      </div>

      <div className="absolute bottom-4 left-4 flex gap-4 bg-slate-900/80 p-3 rounded-lg border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Critical Hotspot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Optimized Path</span>
        </div>
      </div>
    </div>
  );
}