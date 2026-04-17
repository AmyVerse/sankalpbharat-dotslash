import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ChartTooltip from './ChartTooltip';

const BarChart = ({ data, title }) => {
  const [tooltip, setTooltip] = useState({ active: false, x: 0, y: 0, content: null });
  
  const width = 600;
  const height = 350;
  const padding = { top: 40, right: 30, bottom: 60, left: 80 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const { minValue, maxValue, range } = React.useMemo(() => {
    const values = data.map(d => d.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 10);
    return { minValue: min, maxValue: max, range: max - min };
  }, [data]);

  const axisY = height - padding.bottom;
  const getY = (v) => height - padding.bottom - ((v - minValue) / range * graphHeight);
  const zeroLineY = getY(0);

  const handleMouseMove = (e, d) => {
    setTooltip({
      active: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div>
          <span className="text-[10px] uppercase font-bold text-[#dac2b6] block mb-1">Operational Node</span>
          <p className="text-sm font-bold text-white mb-1">{d.label}</p>
          <p className="text-sm font-mono text-[#ffdea0]">{d.value.toLocaleString()} Units</p>
        </div>
      )
    });
  };

  return (
    <div className="flex flex-col w-full h-full justify-center relative group">
      {title && <h4 className="text-[14px] font-bold text-[#553a34] mb-8 uppercase tracking-widest border-l-4 border-[#974726] pl-3">{title}</h4>}
      
      <div className="w-full relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines - Horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const ly = height - padding.bottom - (p * graphHeight);
            const val = minValue + (p * range);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={ly}
                  y2={ly}
                  stroke="#dac2b6"
                  strokeDasharray="4 4"
                  strokeWidth="0.5"
                  opacity="0.4"
                />
                <text
                  x={padding.left - 15}
                  y={ly}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  fill="#877369"
                  className="text-[12px] font-bold tabular-nums"
                >
                  {Math.round(val).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#553a34" strokeWidth="1.5" />
          <line x1={padding.left} y1={zeroLineY} x2={width - padding.right} y2={zeroLineY} stroke="#553a34" strokeWidth="1.5" />

          {/* Dynamic Bars */}
          {data.map((d, i) => {
            const barCount = data.length;
            const slotWidth = graphWidth / barCount;
            const barWidth = slotWidth * 0.6;
            const x = padding.left + (i * slotWidth) + (slotWidth - barWidth) / 2;
            
            const barHeight = (Math.abs(d.value) / range) * graphHeight;
            const y = d.value >= 0 ? zeroLineY - barHeight : zeroLineY;

            return (
              <g
                key={i}
                className="group cursor-pointer"
                onMouseEnter={(e) => handleMouseMove(e, d)}
                onMouseMove={(e) => handleMouseMove(e, d)}
                onMouseLeave={() => setTooltip({ ...tooltip, active: false })}
              >
                {/* Background Shadow Slot */}
                <rect x={x} y={padding.top} width={barWidth} height={graphHeight} fill="#ebe8e3" opacity="0.1" />

                <motion.rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={d.color || "#553a34"}
                  className="hover:fill-[#974726] transition-colors"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  style={{ originY: d.value >= 0 ? 1 : 0 }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: [0.33, 1, 0.68, 1] }}
                />

                {/* Value Label */}
                <motion.text
                  x={x + barWidth / 2}
                  y={d.value >= 0 ? y - 12 : y + barHeight + 20}
                  textAnchor="middle"
                  fill="#553a34"
                  className="text-[13px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {d.value.toLocaleString()}
                </motion.text>

                {/* Category Label */}
                <text
                  x={x + barWidth / 2}
                  y={height - padding.bottom + 30}
                  textAnchor="middle"
                  fill="#877369"
                  className="text-[12px] font-bold uppercase tracking-widest"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ChartTooltip {...tooltip} />
    </div>
  );
};

export default BarChart;
