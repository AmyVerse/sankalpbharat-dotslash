import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ChartTooltip from './ChartTooltip';

const RadarChart = ({ data, size = 300 }) => {
  const [tooltip, setTooltip] = useState({ active: false, x: 0, y: 0, content: null });
  const radius = (size / 2) - 40;
  const centerX = size / 2;
  const centerY = size / 2;

  const angleStep = (Math.PI * 2) / data.length;

  const getPoints = (values, scale = 1) => {
    return values.map((val, i) => {
      const angle = (i * angleStep) - (Math.PI / 2);
      const x = centerX + Math.cos(angle) * (radius * (val / 100) * scale);
      const y = centerY + Math.sin(angle) * (radius * (val / 100) * scale);
      return { x, y };
    });
  };

  const points = getPoints(data.map(d => d.value));
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  const handleMouseMove = (e, d) => {
    setTooltip({
      active: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div>
          <span className="text-[10px] uppercase font-bold text-[#dac2b6] block mb-1">Archetype Vector</span>
          <p className="text-sm font-bold text-white mb-1">{d.label}</p>
          <p className="text-sm font-mono text-[#ffdea0]">{d.value.toLocaleString()} Score</p>
        </div>
      )
    });
  };

  return (
    <div className="flex flex-col items-center relative group">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Web Grid */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => {
          const gridPoints = getPoints(data.map(() => 100), scale);
          const gridPath = gridPoints.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
          return (
            <path
              key={i}
              d={gridPath}
              fill="none"
              stroke="#dac2b6"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity="0.5"
            />
          );
        })}

        {/* Axis Lines */}
        {data.map((_, i) => {
          const angle = (i * angleStep) - (Math.PI / 2);
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={x}
              y2={y}
              stroke="#dac2b6"
              strokeWidth="1"
              opacity="0.3"
            />
          );
        })}

        {/* Data Path */}
        <motion.path
          d={pathData}
          fill="#974726"
          fillOpacity="0.2"
          stroke="#974726"
          strokeWidth="3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Interaction Points */}
        {points.map((p, i) => (
          <g
            key={i}
            onMouseEnter={(e) => handleMouseMove(e, data[i])}
            onMouseMove={(e) => handleMouseMove(e, data[i])}
            onMouseLeave={() => setTooltip({ ...tooltip, active: false })}
            className="cursor-crosshair"
          >
            <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r="5"
              fill="#553a34"
              className="group-hover:fill-[#974726] transition-colors"
            />
          </g>
        ))}

        {/* Labels */}
        {data.map((d, i) => {
          const angle = (i * angleStep) - (Math.PI / 2);
          const x = centerX + Math.cos(angle) * (radius + 25);
          const y = centerY + Math.sin(angle) * (radius + 15);
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              fill="#553a34"
              className="text-[11px] font-bold uppercase tracking-tight"
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

export default RadarChart;

