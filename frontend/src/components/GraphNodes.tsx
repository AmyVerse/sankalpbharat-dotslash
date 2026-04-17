// components/GraphNodes.tsx
import { Factory, Warehouse, AlertTriangle } from 'lucide-react';
import { Handle, Position } from 'reactflow';

export const PlantNode = ({ data }: any) => (
  <div className="px-4 py-2 shadow-xl rounded-lg bg-slate-900 border-2 border-blue-500 text-white w-48">
    <div className="flex items-center gap-2 border-b border-slate-700 pb-1 mb-2">
      <Factory size={18} className="text-blue-400" />
      <span className="font-bold text-sm uppercase tracking-wider">{data.label}</span>
    </div>
    <div className="text-xs text-slate-400">Daily Flux: <span className="text-white">{data.emissions}t CO2e</span></div>
    <Handle type="target" position={Position.Left} className="w-2 h-2 bg-blue-500" />
  </div>
);

export const SupplierNode = ({ data }: any) => {
  const isHotspot = data.score < 30;
  return (
    <div className={`px-4 py-2 shadow-xl rounded-lg bg-slate-900 border-2 ${isHotspot ? 'border-red-500 animate-pulse' : 'border-slate-700'} text-white w-44`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Warehouse size={16} className={isHotspot ? 'text-red-500' : 'text-slate-400'} />
          <span className="font-medium text-xs">{data.label}</span>
        </div>
        {isHotspot && <AlertTriangle size={14} className="text-red-500" />}
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${isHotspot ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${data.score}%` }} />
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
};