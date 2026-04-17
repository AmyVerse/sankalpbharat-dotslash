import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import ChartTooltip from './ChartTooltip';

const LineChart = ({ data, width = 600, height = 300 }) => {
  const [tooltip, setTooltip] = useState({ active: false, x: 0, y: 0, content: null });

  const padding = { top: 40, right: 60, bottom: 50, left: 80 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Sampling Logic: Show max 8 labels/points to prevent crowding
  const sampledData = useMemo(() => {
    if (data.length <= 8) return data;
    const step = Math.ceil(data.length / 8);
    return data.filter((_, i) => i % step === 0);
  }, [data]);

  const maxValue = Math.max(...data.map(d => d.value), 10);

  const getX = (i, length) => padding.left + (i * (graphWidth / (length - 1)));
  const getY = (v) => height - padding.bottom - (v / maxValue * graphHeight);

  const fullPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, data.length)} ${getY(d.value)}`).join(' ');

  const handleMouseMove = (e, d, i) => {
    setTooltip({
      active: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div>
          <span className="text-[10px] uppercase font-bold text-[#dac2b6] block mb-1">Temporal Registry</span>
          <p className="text-sm font-bold text-white mb-1">{d.label}</p>
          <p className="text-sm font-mono text-[#ffdea0]">{d.value.toLocaleString()} Tons</p>
        </div>
      )
    });
  };

  return (
    <div className="w-full relative group">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const ly = height - padding.bottom - (p * graphHeight);
          return (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={ly} y2={ly} stroke="#dac2b6" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              <text x={padding.left - 15} y={ly} textAnchor="end" alignmentBaseline="middle" fill="#877369" className="text-[12px] font-bold tabular-nums">
                {Math.round(p * maxValue).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Tactical Line */}
        <motion.path
          d={fullPath}
          fill="none"
          stroke="#974726"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />

        {/* Data Interaction Points (Drawn from full data for accuracy) */}
        {data.map((d, i) => (
          <g
            key={i}
            onMouseEnter={(e) => handleMouseMove(e, d, i)}
            onMouseMove={(e) => handleMouseMove(e, d, i)}
            onMouseLeave={() => setTooltip({ ...tooltip, active: false })}
            className="cursor-crosshair"
          >
            <circle
              cx={getX(i, data.length)}
              cy={getY(d.value)}
              r="12"
              fill="transparent"
            />
            <motion.circle
              cx={getX(i, data.length)}
              cy={getY(d.value)}
              r="4"
              fill={tooltip.active && tooltip.content?.props.children[1].props.children === d.label ? "#974726" : "#553a34"}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + (i * 0.05) }}
            />
          </g>
        ))}

        {/* X Axis Sampled Labels */}
        {sampledData.map((d, i) => {
          // Direct mapping to ensure label aligns with correct point
          const originalIndex = data.findIndex(item => item.label === d.label);
          return (
            <text
              key={i}
              x={getX(originalIndex, data.length)}
              y={height - padding.bottom + 25}
              textAnchor="middle"
              fill="#877369"
              className="text-[11px] font-bold uppercase tracking-tighter"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
      <ChartTooltip {...tooltip} />
    </div>
  );
};

export default LineChart;

