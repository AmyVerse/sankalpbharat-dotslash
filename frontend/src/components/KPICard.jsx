import React from 'react';

const KPICard = ({ title, value, subtext, trend, trendLabel, color = "emerald" }) => {
  const isPositive = trend === 'up';
  
  // Custom color classes for different KPI semantics - mapping to Editorial Tactical
  const colorMap = {
    emerald: "text-success",
    amber: "text-tertiary",
    red: "text-error",
    blue: "text-primary"
  };

  const borderMap = {
    emerald: "border-success/30",
    amber: "border-tertiary/30",
    red: "border-error/30",
    blue: "border-primary/30"
  };

  const bgMap = {
    emerald: "bg-success/5",
    amber: "bg-tertiary/5",
    red: "bg-error/5",
    blue: "bg-primary/5"
  };

  const selectedColor = colorMap[color] || colorMap.blue;
  const selectedBg = bgMap[color] || bgMap.blue;
  const selectedBorder = borderMap[color] || borderMap.blue;

  return (
    <div className="editorial-card p-6 flex flex-col gap-3 relative overflow-hidden group transition-all hover:bg-white/50">
      {/* Archival Label Feel */}
      <h3 className="text-[12px] font-bold text-secondary uppercase tracking-widest">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-primary tracking-tight leading-none">{value}</span>
        {subtext && <span className="text-[13px] text-[#877369] font-bold uppercase tracking-tight">{subtext}</span>}
      </div>
      
      {trend && (
        <div className="flex items-center gap-2 mt-auto pt-2">
          <div className={`flex items-center text-[11px] font-bold px-3 py-1.5 rounded-full border ${selectedBorder} ${selectedBg} ${selectedColor} uppercase tracking-tight`}>
            {isPositive ? '↑' : '↓'} {trendLabel}
          </div>
        </div>
      )}
    </div>
  );
};

export default KPICard;

