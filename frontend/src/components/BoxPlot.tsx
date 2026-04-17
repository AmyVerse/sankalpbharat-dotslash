import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ChartTooltip from './ChartTooltip';

const BoxPlot = ({ data, width = 600, height = 300 }) => {
  const [tooltip, setTooltip] = useState({ active: false, x: 0, y: 0, content: null });
  const padding = { top: 40, right: 30, bottom: 60, left: 80 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const allValues = data.flatMap(d => [d.min, d.max, d.q1, d.q3, d.median]);
  const maxValue = Math.max(...allValues, 10);
  const minValue = Math.min(...allValues, 0);
  const range = maxValue - minValue;

  const getY = (v) => height - padding.bottom - ((v - minValue) / range * graphHeight);
  const slotWidth = graphWidth / data.length;
  const boxWidth = slotWidth * 0.5;

  const handleMouseMove = (e, d) => {
    setTooltip({
      active: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#dac2b6] block mb-1">Statistical Box</span>
          <p className="text-sm font-bold text-white mb-2 underline decoration-[#974726]">{d.label}</p>
          <div className="grid grid-cols-2 gap-x-4 text-[11px] font-mono">
            <span className="text-[#877369]">MAX:</span> <span className="text-white">{d.max}</span>
            <span className="text-[#877369]">Q3:</span> <span className="text-white">{d.q3}</span>
            <span className="text-[#ffdea0]">MED:</span> <span className="text-[#ffdea0] font-bold">{d.median}</span>
            <span className="text-[#877369]">Q1:</span> <span className="text-white">{d.q1}</span>
            <span className="text-[#877369]">MIN:</span> <span className="text-white">{d.min}</span>
          </div>
        </div>
      )
    });
  };

  return (
    <div className="w-full relative group">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const val = minValue + (p * range);
          const ly = getY(val);
          return (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={ly} y2={ly} stroke="#dac2b6" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              <text x={padding.left - 15} y={ly} textAnchor="end" alignmentBaseline="middle" fill="#877369" className="text-[12px] font-bold tabular-nums">
                {Math.round(val).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#553a34" strokeWidth="2" />

        {data.map((d, i) => {
          const x = padding.left + (i * slotWidth) + (slotWidth / 2);

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={(e) => handleMouseMove(e, d)}
              onMouseMove={(e) => handleMouseMove(e, d)}
              onMouseLeave={() => setTooltip({ ...tooltip, active: false })}
            >
              {/* Whiskers */}
              <line x1={x} y1={getY(d.min)} x2={x} y2={getY(d.max)} stroke="#553a34" strokeWidth="1.5" />
              <line x1={x - 10} y1={getY(d.min)} x2={x + 10} y2={getY(d.min)} stroke="#553a34" strokeWidth="1.5" />
              <line x1={x - 10} y1={getY(d.max)} x2={x + 10} y2={getY(d.max)} stroke="#553a34" strokeWidth="1.5" />

              {/* Box */}
              <motion.rect
                x={x - boxWidth / 2}
                y={getY(d.q3)}
                width={boxWidth}
                height={Math.abs(getY(d.q3) - getY(d.q1))}
                fill="#ebe8e3"
                stroke="#553a34"
                strokeWidth="2"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                style={{ originY: 1 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ fill: "#ffdea0", stroke: "#974726" }}
              />

              {/* Median Line */}
              <line x1={x - boxWidth / 2} y1={getY(d.median)} x2={x + boxWidth / 2} y2={getY(d.median)} stroke="#974726" strokeWidth="3" />

              {/* Label */}
              <text
                x={x}
                y={height - padding.bottom + 30}
                textAnchor="middle"
                fill="#877369"
                className="text-[11px] font-bold uppercase tracking-widest"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip {...tooltip} />
    </div>
  );
};

export default BoxPlot;

