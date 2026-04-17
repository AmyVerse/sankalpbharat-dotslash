import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ChartTooltip from './ChartTooltip';

const PieChart = ({ data }) => {
  const [tooltip, setTooltip] = useState({ active: false, x: 0, y: 0, content: null });
  const size = 300;
  const radius = 100;
  const centerX = size / 2;
  const centerY = size / 2;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = 0;

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const handleMouseMove = (e, d, percentage) => {
    setTooltip({
      active: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div>
          <span className="text-[10px] uppercase font-bold text-[#dac2b6] block mb-1">Sector Analysis</span>
          <p className="text-sm font-bold text-white mb-1">{d.label}</p>
          <div className="flex justify-between gap-4">
             <span className="text-sm font-mono text-[#ffdea0]">{d.value.toLocaleString()} Units</span>
             <span className="text-sm font-bold text-[#dac2b6]">{Math.round(percentage * 100)}%</span>
          </div>
        </div>
      )
    });
  };

  return (
    <div className="flex flex-col items-center w-full h-full justify-center relative group">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <g transform={`translate(${centerX}, ${centerY})`}>
          {data.map((d, i) => {
            const startAngle = currentAngle;
            const percentage = d.value / total;
            currentAngle += percentage;

            const [startX, startY] = getCoordinatesForPercent(startAngle);
            const [endX, endY] = getCoordinatesForPercent(currentAngle);

            const largeArcFlag = percentage > 0.5 ? 1 : 0;

            const pathData = [
              `M ${startX * radius} ${startY * radius}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX * radius} ${endY * radius}`,
              `L 0 0`,
            ].join(' ');

            const midAngle = 2 * Math.PI * (startAngle + percentage / 2);
            const labelX = Math.cos(midAngle) * (radius + 35);
            const labelY = Math.sin(midAngle) * (radius + 35);

            return (
              <g 
                key={i}
                onMouseEnter={(e) => handleMouseMove(e, d, percentage)}
                onMouseMove={(e) => handleMouseMove(e, d, percentage)}
                onMouseLeave={() => setTooltip({ ...tooltip, active: false })}
                className="cursor-pointer"
              >
                <motion.path
                  d={pathData}
                  fill={d.color || '#553a34'}
                  stroke="#fcf9f4"
                  strokeWidth="2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={labelX > 0 ? 'start' : 'end'}
                  fill="#553a34"
                  className="text-[11px] font-bold uppercase tracking-tighter"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <ChartTooltip {...tooltip} />
    </div>
  );
};

export default PieChart;
