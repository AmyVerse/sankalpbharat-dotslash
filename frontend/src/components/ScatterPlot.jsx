import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const ScatterPlot = ({ data, xKey, yKey, xAxisLabel, yAxisLabel, onNodeClick, activeNodeId, colorLogic }) => {
  // Config parameters
  const padding = { top: 40, right: 40, bottom: 60, left: 80 };
  const width = 800; // Intrinsic viewBox width
  const height = 500; // Intrinsic viewBox height

  // Scale calculations based on dynamic data
  const { xScale, yScale, xTicks, yTicks } = useMemo(() => {
    if (!data || data.length === 0) return { xScale: () => 0, yScale: () => 0, xTicks: [], yTicks: [] };

    let maxX = Math.max(...data.map(d => d[xKey] || 0));
    let maxY = Math.max(...data.map(d => d[yKey] || 0));

    // Add 10% buffer
    maxX = maxX * 1.1 || 100;
    maxY = maxY * 1.1 || 100;

    const scaleX = (val) => padding.left + (val / maxX) * (width - padding.left - padding.right);
    const scaleY = (val) => height - padding.bottom - (val / maxY) * (height - padding.top - padding.bottom);

    const formatCurrency = (val) => `₹${(val / 1000000).toFixed(1)}M`;
    const formatNumber = (val) => `${(val / 1000).toFixed(1)}k`;

    // Generating roughly 5 ticks per axis
    const ticksX = Array.from({ length: 6 }).map((_, i) => ({
      value: (maxX / 5) * i,
      pos: scaleX((maxX / 5) * i),
      label: formatCurrency((maxX / 5) * i)
    }));

    const ticksY = Array.from({ length: 6 }).map((_, i) => ({
      value: (maxY / 5) * i,
      pos: scaleY((maxY / 5) * i),
      label: formatNumber((maxY / 5) * i)
    }));

    return { xScale: scaleX, yScale: scaleY, xTicks: ticksX, yTicks: ticksY, maxX, maxY };
  }, [data, xKey, yKey]);

  // Determine quadrant colors or apply custom color logic
  const getNodeStyle = (item) => {
    if (colorLogic) return colorLogic(item);

    // Default Color Logic if none provided - Editorial Espresso
    return { fill: "#553a34", stroke: "#3a2824" };
  };
  // Sort data for connecting lines
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => (a[xKey] || 0) - (b[xKey] || 0));
  }, [data, xKey]);

  // Generate path data
  const pathData = useMemo(() => {
    if (sortedData.length < 2) return "";
    return sortedData.map((d, i) => {
      const x = xScale(d[xKey]);
      const y = yScale(d[yKey]);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [sortedData, xScale, yScale]);

  return (
    <div className="w-full h-full min-h-[400px] relative font-sans text-[12px]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
        {/* Grid Lines - Subtle Tonal Shift */}
        {yTicks.map((tick, i) => (
          <line
            key={`grid-y-${i}`}
            x1={padding.left}
            x2={width - padding.right}
            y1={tick.pos}
            y2={tick.pos}
            stroke="#dac2b6"
            strokeWidth="1"
            strokeDasharray="1 4"
            opacity="0.5"
          />
        ))}

        {xTicks.map((tick, i) => (
          <line
            key={`grid-x-${i}`}
            x1={tick.pos}
            x2={tick.pos}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="#dac2b6"
            strokeWidth="1"
            strokeDasharray="1 4"
            opacity="0.5"
          />
        ))}

        {/* Connecting Line - Technical Tactical Style */}
        <motion.path
          d={pathData}
          fill="none"
          stroke="#553a34"
          strokeWidth="1.5"
          strokeDasharray="5 5"
          opacity="0.3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Axes - Bold Editorial Black/Espresso */}
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#553a34" strokeWidth="2" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#553a34" strokeWidth="2" />

        {/* Ticks and Labels - Precise Metadata Style */}
        {xTicks.map((tick, i) => (
          <g key={`tick-x-${i}`} transform={`translate(${tick.pos}, ${height - padding.bottom + 20})`}>
            <line x1="0" y1="-20" x2="0" y2="-10" stroke="#553a34" />
            <text textAnchor="middle" fill="#877369" className="font-bold tracking-tight uppercase text-[11px]">{tick.label}</text>
          </g>
        ))}

        {yTicks.map((tick, i) => (
          <g key={`tick-y-${i}`} transform={`translate(${padding.left - 15}, ${tick.pos})`}>
            <line x1="15" y1="0" x2="5" y2="0" stroke="#553a34" />
            <text textAnchor="end" alignmentBaseline="middle" fill="#877369" className="font-bold tracking-tight uppercase text-[11px]">{tick.label}</text>
          </g>
        ))}

        {/* Axis Titles - Editorial Captions */}
        <text x={(width - padding.left - padding.right) / 2 + padding.left} y={height - 5} textAnchor="middle" fill="#553a34" className="font-bold uppercase tracking-[0.2em] text-[13px]">
          {xAxisLabel}
        </text>
        <text transform={`rotate(-90) translate(${- (height - padding.top - padding.bottom) / 2 - padding.top}, 20)`} textAnchor="middle" fill="#553a34" className="font-bold uppercase tracking-[0.2em] text-[13px]">
          {yAxisLabel}
        </text>

        {/* Data Nodes */}
        {data.map((d, i) => {
          const cx = xScale(d[xKey]);
          const cy = yScale(d[yKey]);
          const style = getNodeStyle(d);
          const isActive = activeNodeId === d.id;

          return (
            <motion.g
              key={d.id}
              initial={false}
              animate={{ x: cx, y: cy }}
              transition={{ type: "spring", stiffness: 60, damping: 15 }}
              onClick={() => onNodeClick && onNodeClick(d)}
              className="cursor-pointer group"
            >
              {/* Tooltip Hover Area */}
              <circle r="20" fill="transparent" />

              {/* Dropdown line to X-Axis - Technical Notation */}
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={height - padding.bottom - cy}
                stroke={style.fill}
                strokeWidth="1.5"
                strokeDasharray="4 2"
                opacity="0.4"
                className="transition-all duration-300"
              />

              {/* Marker for Active Node */}
              {isActive && <circle r="15" fill="none" stroke={style.fill} strokeWidth="1" strokeDasharray="3 2" className="animate-spin-slow" />}

              {/* Main Node Node - Flat Tactile Feel */}
              <circle
                r={isActive ? 10 : 7}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={isActive ? 3 : 2}
                className="transition-all duration-300"
              />

              {/* Label - Archival Tag Style */}
              <text
                x="16"
                y="5"
                fill={isActive ? "#553a34" : "#877369"}
                className={`font-bold transition-opacity text-[12px] uppercase tracking-wide ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                {d.name || d.title}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
};

export default ScatterPlot;
