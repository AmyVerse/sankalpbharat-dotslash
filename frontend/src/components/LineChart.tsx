import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import ChartTooltip from './ChartTooltip';

const LineChart = ({ data, width = 600, height = 300 }) => {
  const [tooltip, setTooltip] = useState({ active: false, x: 0, y: 0, content: null });

  const padding = { top: 40, right: 60, bottom: 60, left: 100 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // AGGRESSIVE SAMPLING: Limit to exactly 6-8 points
  const sampledData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (data.length <= 8) return data;
    const skip = Math.floor(data.length / 8);
    const sampled = [];
    for (let i = 0; i < data.length; i += skip) {
      if (sampled.length < 8) sampled.push(data[i]);
    }
    // Ensure the last point is present
    if (sampled[sampled.length - 1].label !== data[data.length - 1].label) {
      sampled[sampled.length - 1] = data[data.length - 1];
    }
    return sampled;
  }, [data]);

  const { minValue, maxValue, range } = useMemo(() => {
    const values = sampledData.map(d => d.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 10);
    return { minValue: min, maxValue: max, range: max - min };
  }, [sampledData]);
  
  const getX = (i) => padding.left + (i * (graphWidth / (sampledData.length - 1)));
  const getY = (v) => height - padding.bottom - ((v - minValue) / range * graphHeight);

  const zeroLineY = getY(0);

  const fullPath = sampledData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(' ');

  const handleMouseMove = (e, d) => {
    setTooltip({
      active: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div>
          <span className="text-[10px] uppercase font-bold text-[#dac2b6] block mb-1">Temporal Audit</span>
          <p className="text-sm font-bold text-white mb-1">{d.label}</p>
          <p className="text-sm font-mono text-[#ffdea0]">{d.value.toLocaleString()} Tons</p>
        </div>
      )
    });
  };

  return (
    <div className="w-full relative group h-full flex items-center justify-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" preserveAspectRatio="xMidYMid meet">
        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const ly = height - padding.bottom - (p * graphHeight);
          const val = minValue + (p * range);
          return (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={ly} y2={ly} stroke="#dac2b6" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
              <text x={padding.left - 15} y={ly} textAnchor="end" alignmentBaseline="middle" fill="#877369" className="text-[12px] font-bold tabular-nums">
                {Math.round(val).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Zero Baseline - High Priority Visual */}
        {minValue < 0 && (
          <line 
            x1={padding.left} 
            x2={width - padding.right} 
            y1={zeroLineY} 
            y2={zeroLineY} 
            stroke="#553a34" 
            strokeWidth="1.5" 
            opacity="0.6" 
          />
        )}

        {/* Tactical Profile Path */}
        <motion.path
          d={fullPath}
          fill="none"
          stroke="#974726"
          strokeWidth="2.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />

        {/* Interaction Points */}
        {sampledData.map((d, i) => (
          <g
            key={i}
            onMouseEnter={(e) => handleMouseMove(e, d)}
            onMouseMove={(e) => handleMouseMove(e, d)}
            onMouseLeave={() => setTooltip({ ...tooltip, active: false })}
            className="cursor-crosshair"
          >
            <circle cx={getX(i)} cy={getY(d.value)} r="15" fill="transparent" />
            <motion.circle
              cx={getX(i)}
              cy={getY(d.value)}
              r="4"
              fill="#553a34"
              stroke="#fcf9f4"
              strokeWidth="1.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + (i * 0.05) }}
            />
          </g>
        ))}

        {/* Temporal X-Axis Labels */}
        {sampledData.map((d, i) => (
          <text
            key={i}
            x={getX(i)}
            y={height - padding.bottom + 35}
            textAnchor="middle"
            fill="#877369"
            className="text-[11px] font-bold uppercase tracking-tight"
          >
            {d.label}
          </text>
        ))}
      </svg>
      <ChartTooltip {...tooltip} />
    </div>
  );
};

export default LineChart;
