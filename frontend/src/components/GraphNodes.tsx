import { Factory, Warehouse, AlertTriangle, Leaf } from 'lucide-react';
import { Handle, Position } from 'reactflow';

export const PlantNode = ({ data, selected }: any) => {
  return (
    <div className={`px-3 py-2 shadow-xl rounded-lg bg-slate-900 border-2 transition-all duration-300 w-44 cursor-pointer
      ${selected ? 'border-blue-400 ring-2 ring-blue-500/30' : 'border-blue-500/40 hover:border-blue-400/80'}`}
    >
      <div className="flex items-center gap-1.5">
        <div className="bg-blue-500/20 p-1 rounded shrink-0">
          <Factory size={12} className="text-blue-400" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-[11px] text-white truncate leading-tight">{data.label}</div>
          <div className="text-[9px] text-slate-400 truncate">{data.location}</div>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-blue-500 border-2 border-slate-900" />
    </div>
  );
};

export const SupplierNode = ({ data, selected }: any) => {
  const isHotspot = data.isHotspot;
  const isTaxed = data.isTaxed;
  const isSubsidized = data.isSubsidized;
  const isRecycled = data.recycled;

  let borderClass = selected
    ? 'border-blue-400 ring-2 ring-blue-500/20'
    : 'border-slate-700 hover:border-slate-500';
  if (data.isAlternativeNode) borderClass = 'border-dashed border-slate-500 opacity-60 hover:opacity-100 hover:border-slate-300';
  else if (isHotspot) borderClass = 'border-red-500 ring-2 ring-red-500/25';
  else if (isTaxed) borderClass = 'border-orange-500 ring-2 ring-orange-500/25';
  else if (isSubsidized) borderClass = 'border-emerald-500 ring-2 ring-emerald-500/25';

  const iconColor = isHotspot
    ? 'text-red-400'
    : isTaxed
      ? 'text-orange-400'
      : isSubsidized
        ? 'text-emerald-400'
        : 'text-slate-400';

  const tierColor = data.tier_level === 1
    ? 'bg-blue-500/10 text-blue-400'
    : data.tier_level === 2
      ? 'bg-purple-500/10 text-purple-400'
      : 'bg-slate-700/50 text-slate-400';

  return (
    <div className={`px-3 py-2 shadow-lg rounded-lg bg-slate-900 border-2 transition-all duration-300 w-40 cursor-pointer ${borderClass}`}>
      <div className="flex items-center gap-1.5">
        <Warehouse size={12} className={`${iconColor} shrink-0`} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[11px] text-white truncate leading-tight">{data.label}</div>
          <div className="text-[9px] text-slate-400 truncate">{data.location}</div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {isHotspot && <AlertTriangle size={9} className="text-red-500 animate-pulse" />}
          {!isHotspot && isRecycled && <Leaf size={9} className="text-emerald-500" />}
          <span className={`text-[8px] font-bold px-1 rounded ${tierColor}`}>T{data.tier_level}</span>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-slate-600 border-2 border-slate-900" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-slate-600 border-2 border-slate-900" />
    </div>
  );
};