import { Factory, Warehouse, AlertTriangle, Leaf } from 'lucide-react';
import { Handle, Position } from 'reactflow';

export const PlantNode = ({ data, selected }: any) => {
  return (
    <div className={`px-4 py-3 bg-white border border-[#dac2b6] border-opacity-60 shadow-[0_8px_16px_-4px_rgba(85,58,52,0.08)] transition-all duration-300 w-48 cursor-pointer rounded-sm
      ${selected ? 'ring-2 ring-[#974726]/40 border-[#974726]' : 'hover:border-[#974726]/60'}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-[#ebe8e3] p-1.5 rounded-sm shrink-0">
          <Factory size={14} className="text-[#553a34]" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-[#877369] font-bold uppercase tracking-widest leading-none mb-1">Assembly Plant</div>
          <div className="font-bold text-[12px] text-[#553a34] truncate leading-tight newsreader">{data.label}</div>
        </div>
      </div>
      <div className="text-[9px] text-[#877369] font-medium border-t border-[#dac2b6] border-opacity-30 pt-2 flex items-center justify-between">
        <span className="uppercase tracking-wider">{data.location}</span>
        <span className="newsreader font-bold text-[#553a34]">{Math.floor(data.accumulatedEmissions || 0).toLocaleString()} tCO2e</span>
      </div>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[#553a34] !border-none" />
    </div>
  );
};

export const SupplierNode = ({ data, selected }: any) => {
  const isHotspot = data.isHotspot;
  const isTaxed = data.isTaxed;
  const isSubsidized = data.isSubsidized;
  const isRecycled = data.recycled;

  let highlightClass = '';
  if (selected) highlightClass = 'ring-2 ring-[#974726]/40 border-[#974726]';
  else if (isHotspot) highlightClass = 'border-[#b91c1c] shadow-[0_4px_12px_rgba(185,28,28,0.1)]';
  else if (isTaxed) highlightClass = 'border-[#974726]';
  else if (isSubsidized) highlightClass = 'border-[#15803d]';

  const iconColor = isHotspot 
    ? 'text-[#b91c1c]' 
    : isTaxed 
      ? 'text-[#974726]' 
      : isSubsidized 
        ? 'text-[#15803d]' 
        : 'text-[#877369]';

  const tierBg = data.tier_level === 1 
    ? 'bg-[#ffdea0] text-[#261900]' 
    : data.tier_level === 2 
      ? 'bg-[#ebe8e3] text-[#553a34]' 
      : 'bg-white text-[#877369]';

  return (
    <div className={`px-4 py-3 bg-white border border-[#dac2b6] border-opacity-60 shadow-[0_4px_8px_-2px_rgba(85,58,52,0.06)] transition-all duration-300 w-44 cursor-pointer rounded-sm ${highlightClass}
      ${data.isAlternativeNode ? 'border-dashed opacity-70 hover:opacity-100' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <Warehouse size={14} className={`${iconColor} shrink-0`} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[11px] text-[#553a34] truncate leading-tight">{data.label}</div>
          <div className="text-[9px] text-[#877369] font-medium truncate">{data.location}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isHotspot && <AlertTriangle size={10} className="text-[#b91c1c]" />}
          {!isHotspot && isRecycled && <Leaf size={10} className="text-[#15803d]" />}
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${tierBg}`}>T{data.tier_level}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-[8px] font-bold uppercase tracking-wider border-t border-[#dac2b6] border-opacity-30 pt-2">
         <div className="flex flex-col">
            <span className="text-[#877369]">Material</span>
            <span className="text-[#553a34] newsreader text-[10px]">{data.materialIndex}x</span>
         </div>
         <div className="flex flex-col text-right">
            <span className="text-[#877369]">Risk</span>
            <span className={`newsreader text-[10px] ${data.score < 50 ? 'text-[#b91c1c]' : 'text-[#15803d]'}`}>{data.score}%</span>
         </div>
      </div>

      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[#877369] !border-none" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#877369] !border-none" />
    </div>
  );
};