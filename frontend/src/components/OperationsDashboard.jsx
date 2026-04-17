import React, { useState } from 'react';
import KPICard from './KPICard';
import ScatterPlot from './ScatterPlot';
import mockData from '../mockData.json';
import { CalendarDays, Filter } from 'lucide-react';

const timeFilters = [
  { id: '1W', label: '1 Week Ago' },
  { id: '1M', label: '1 Month Ago' },
  { id: '1Y', label: '1 Year Ago' },
  { id: '5Y', label: '5 Years Ago' }
];

const OperationsDashboard = ({ activeTime, setActiveTime }) => {
  const [activeActionId, setActiveActionId] = useState(null);
  const [projectType, setProjectType] = useState('future');

  // MACC Equation: High Reduction (Y) & Low Cost (X) = Top Left Quadrant
  const actionColorLogic = (item) => {
    // Determine bounds
    const maxReduction = 25000;
    const maxCost = 22000000;

    const reductionScore = item.expected_emission_reduction / maxReduction;
    const costScore = item.expected_cost_impact / maxCost;

    if (reductionScore > 0.5 && costScore < 0.5) {
      return { fill: "#15803d", stroke: "#166534" }; // ROI Positive - Vivid Green
    } else if (costScore > 0.6) {
      return { fill: "#553d00", stroke: "#3a2a00" }; // Capital Intensive - Raw Sienna
    }
    return { fill: "#553a34", stroke: "#3a2824" }; // Default - Espresso
  };

  // 1. Time multiplier based on activeTime
  const timeMultiplier = activeTime === '1W' ? 0.8 : activeTime === '1M' ? 1.0 : activeTime === '1Y' ? 1.4 : 2.0;

  // 2. Filter & Scale Data
  const filteredData = mockData.actions.filter(a => projectType === 'future' ? a.status === 'Proposed' : a.status !== 'Proposed');
  const displayData = filteredData.map(a => ({
    ...a,
    expected_cost_impact: a.expected_cost_impact * timeMultiplier,
    expected_emission_reduction: a.expected_emission_reduction * timeMultiplier,
    current_emissions: a.current_emissions * timeMultiplier
  }));


  return (
    <div className="flex h-full w-full overflow-hidden bg-[#fcf9f4]">
      
      {/* Time-Control Sidebar - Editorial Style */}
      <aside className="w-64 bg-[#ebe8e3] border-r border-[#dac2b6] border-opacity-30 p-8 flex flex-col gap-8 relative z-10 hidden md:flex overflow-y-auto custom-scrollbar">
        <div>
          <h2 className="text-[10px] font-bold tracking-[0.2em] text-[#877369] uppercase mb-6 flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" /> Temporal Filter
          </h2>
          <div className="flex flex-col gap-3">
            {timeFilters.map(tf => (
              <button
                key={tf.id}
                onClick={() => setActiveTime(tf.id)}
                className={`text-xs font-bold py-3 px-4 rounded-md text-left transition-all border ${
                  activeTime === tf.id 
                  ? 'bg-[#553a34] border-[#553a34] text-white shadow-sm' 
                  : 'bg-white border-[#dac2b6] border-opacity-40 text-[#553a34] hover:border-[#877369]'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-[#dac2b6] opacity-30 my-2" />

        <div>
          <h2 className="text-[10px] font-bold tracking-[0.2em] text-[#877369] uppercase mb-6 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" /> Insight Log
          </h2>
          <div className="text-xs text-[#553a34] leading-relaxed space-y-4">
            <p className="font-medium opacity-80">Data shifting based on selected timeframe adjusts investment scaling dynamically.</p>
            <div className="p-4 bg-white border border-[#dac2b6] border-opacity-30 rounded-md">
              <span className="text-[#974726] font-bold block mb-1 text-[10px] uppercase tracking-wider">MACC Intelligence</span>
              <p className="text-[11px] font-medium leading-normal">Focus on top-left quadrant items for highest ROI carbon yield.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col gap-10 relative">
        
        {/* KPI Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <KPICard 
            title="Total Equivalent Reductions" 
            value="32,450" 
            subtext="Tons CO₂e"
            trend="up" 
            trendLabel="4.2% yield" 
            color="emerald" 
          />
          <KPICard 
            title="Emissions Demographics" 
            value="15 / 22 / 63" 
            subtext="% Split"
            color="blue" 
          />
          <KPICard 
            title="Total Capital Deployed" 
            value="₹45.6M" 
            subtext="INR"
            trend="down" 
            trendLabel="Under Budget" 
            color="amber" 
          />
        </div>

        {/* Main Graph Area */}
        <div className="editorial-card p-8 flex-1 min-h-[500px] flex flex-col relative z-10">
          <div className="flex justify-between items-end mb-8 border-b border-[#dac2b6] border-opacity-20 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#553a34] tracking-tight">Action vs. Impact Matrix</h2>
              <div className="flex items-center gap-3 mt-4">
                <button 
                  onClick={() => setProjectType('future')}
                  className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${projectType === 'future' ? 'bg-[#553a34] text-white' : 'bg-[#ebe8e3] text-[#877369] hover:bg-[#dac2b6]'}`}
                >
                  Future Projects
                </button>
                <button 
                  onClick={() => setProjectType('current')}
                  className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${projectType === 'current' ? 'bg-[#553a34] text-white' : 'bg-[#ebe8e3] text-[#877369] hover:bg-[#dac2b6]'}`}
                >
                  Current Projects
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-[#974726] uppercase tracking-[0.2em] mb-2 px-3 py-1 bg-[#ffdea0] text-[#261900] rounded-full">
              Live Analysis
            </div>
          </div>
          
          <div className="flex-1 w-full bg-[#fcf9f4] border border-[#dac2b6] border-opacity-30 rounded-md p-6">
            <ScatterPlot 
              data={displayData}
              xKey="expected_cost_impact"
              yKey={projectType === 'future' ? 'expected_emission_reduction' : 'current_emissions'}
              xAxisLabel="Financial Investment (₹)"
              yAxisLabel={projectType === 'future' ? 'Emission Reductions (Tons CO₂e)' : 'Current Emissions (Tons CO₂e)'}
              colorLogic={actionColorLogic}
              onNodeClick={(node) => setActiveActionId(node.id === activeActionId ? null : node.id)}
              activeNodeId={activeActionId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsDashboard;

