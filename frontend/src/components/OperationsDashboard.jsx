import React, { useState, useEffect, useMemo } from 'react';
import KPICard from './KPICard';
import ScatterPlot from './ScatterPlot';
import { CalendarDays, Filter, Database, TrendingUp, AlertCircle } from 'lucide-react';

import BarChart from './BarChart';
import PieChart from './PieChart';
import RadarChart from './RadarChart';
import LineChart from './LineChart';
import BoxPlot from './BoxPlot';

const OperationsDashboard = ({ activeTime, setActiveTime }) => {
  const [activeActionId, setActiveActionId] = useState(null);
  const [projectType, setProjectType] = useState('future');
  const [backendData, setBackendData] = useState({
    actions: [],
    summary: [],
    scores: [],
    emissions: []
  });
  const [loading, setLoading] = useState(true);

  // REAL DATA FETCHING
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const [resActions, resSummary, resScores] = await Promise.all([
          fetch(`${baseUrl}/api/action`).then(r => r.json()),
          fetch(`${baseUrl}/api/dashboardSummary`).then(r => r.json()),
          fetch(`${baseUrl}/api/supplierScore`).then(r => r.json())
        ]);

        setBackendData({
          actions: resActions || [],
          summary: resSummary || [],
          scores: resScores || [],
          emissions: [] 
        });
      } catch (err) {
        console.error("Dashboard Ingestion Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // MACC Equation logic
  const actionColorLogic = (item) => {
    const reduction = parseFloat(item.expected_emission_reduction) || 0;
    const cost = parseFloat(item.expected_cost_impact) || 0;
    if (reduction > 10 && cost < 5) return { fill: "#15803d", stroke: "#166534" }; 
    if (cost > 10) return { fill: "#553d00", stroke: "#3a2a00" };
    return { fill: "#553a34", stroke: "#3a2824" };
  };

  const timeMultiplier = activeTime === '1W' ? 0.8 : activeTime === '1M' ? 1.0 : activeTime === '1Y' ? 1.4 : 2.0;

  const displayData = useMemo(() => {
    const filtered = backendData.actions.filter(a => projectType === 'future' ? a.status === 'open' : a.status !== 'open');
    return filtered.map(a => ({
      ...a,
      expected_cost_impact: (parseFloat(a.expected_cost_impact) || 0) * timeMultiplier,
      expected_emission_reduction: (parseFloat(a.expected_emission_reduction) || 0) * timeMultiplier,
    }));
  }, [backendData.actions, projectType, timeMultiplier]);

  const trendLineData = useMemo(() => {
    return backendData.summary.slice(-12).map(s => ({
      label: s.period,
      value: parseFloat(s.total_emissions)
    }));
  }, [backendData.summary]);

  const supplierRadarData = [
    { label: 'Risk', value: 85 },
    { label: 'Cost', value: 65 },
    { label: 'ESG', value: 92 },
    { label: 'Tier', value: 45 },
    { label: 'Volume', value: 78 }
  ];

  const varianceData = [
    { label: 'LGT', min: 10, q1: 25, median: 45, q3: 75, max: 120 },
    { label: 'MFG', min: 20, q1: 40, median: 70, q3: 110, max: 160 },
    { label: 'PRO', min: 5, q1: 15, median: 30, q3: 50, max: 90 }
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#fcf9f4]">
       <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-[#553a34] border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] font-bold text-[#553a34] uppercase tracking-[0.3em]">Connecting to Registry</span>
       </div>
    </div>
  );

  // Mock ESG/GHG Data
  const ghgTypeData = [
    { label: 'CO2', value: 75, color: '#553a34' },
    { label: 'CH4', value: 15, color: '#974726' },
    { label: 'N2O', value: 10, color: '#553d00' }
  ];

  const sourceEmissionData = [
    { label: 'Energy', value: 12400, color: '#553a34' },
    { label: 'Logistics', value: 8900, color: '#974726' },
    { label: 'Process', value: 6500, color: '#553d00' },
    { label: 'Waste', value: 3200, color: '#dac2b6' }
  ];


  return (
    <div className="flex h-full w-full overflow-hidden bg-[#fcf9f4]">
      {/* Main Content */}
      <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col gap-10 relative">
        
        {/* KPI Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <KPICard 
            title="Total Equivalent Reductions" 
            value={(displayData.reduce((acc, curr) => acc + curr.expected_emission_reduction, 0)).toLocaleString(undefined, {maximumFractionDigits: 0})} 
            subtext="Tons CO₂e"
            trend="up" 
            trendLabel="Active Yield" 
            color="emerald" 
          />
          <KPICard 
            title="Registry Nodes" 
            value={backendData.actions.length} 
            subtext="Count"
            color="blue" 
          />
          <KPICard 
            title="Total Strategic Capital" 
            value={`₹${(displayData.reduce((acc, curr) => acc + curr.expected_cost_impact, 0) / 10).toFixed(1)}M`} 
            subtext="INR"
            trend="down" 
            trendLabel="Optimized" 
            color="amber" 
          />
        </div>

        {/* Main Graph Area */}
        <div className="editorial-card p-8 flex flex-col relative z-10">
          <div className="flex justify-between items-end mb-8 border-b border-[#dac2b6] border-opacity-20 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#553a34] tracking-tight">Action vs. Impact Matrix</h2>
              <div className="flex items-center gap-3 mt-4">
                <button 
                  onClick={() => setProjectType('future')}
                  className={`px-4 py-2 rounded-md text-[12px] font-bold uppercase tracking-wider transition-all ${projectType === 'future' ? 'bg-[#553a34] text-white' : 'bg-[#ebe8e3] text-[#877369] hover:bg-[#dac2b6]'}`}
                >
                  Future Projects
                </button>
                <button 
                  onClick={() => setProjectType('current')}
                  className={`px-4 py-2 rounded-md text-[12px] font-bold uppercase tracking-wider transition-all ${projectType === 'current' ? 'bg-[#553a34] text-white' : 'bg-[#ebe8e3] text-[#877369] hover:bg-[#dac2b6]'}`}
                >
                  Current Projects
                </button>
              </div>
            </div>
            <div className="text-[12px] font-bold text-[#974726] uppercase tracking-[0.2em] mb-2 px-4 py-1.5 bg-[#ffdea0] text-[#261900] rounded-full">
              Live Analysis
            </div>
          </div>
          
          <div className="w-full bg-[#fcf9f4] border border-[#dac2b6] border-opacity-30 rounded-md p-6 h-[500px]">
            <ScatterPlot 
              data={displayData}
              xKey="expected_cost_impact"
              yKey="expected_emission_reduction"
              xAxisLabel="Financial Investment"
              yAxisLabel="Reduction Potential"
              colorLogic={actionColorLogic}
              onNodeClick={(node) => setActiveActionId(node.id === activeActionId ? null : node.id)}
              activeNodeId={activeActionId}
            />
          </div>
        </div>

        {/* NEW DYNAMIC CHARTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-20 items-stretch">
          <div className="editorial-card p-10 flex flex-col min-h-[550px]">
             <header className="mb-10">
                <span className="text-[12px] text-[#974726] font-bold uppercase tracking-[0.2em] mb-1 block">Historical Record</span>
                <h3 className="text-xl font-bold text-[#553a34]">Emission Profile Trends</h3>
             </header>
             <div className="flex-1 flex items-center">
                <LineChart data={trendLineData} />
             </div>
          </div>

          <div className="editorial-card p-10 flex flex-col min-h-[550px]">
             <header className="mb-10">
                <span className="text-[12px] text-[#974726] font-bold uppercase tracking-[0.2em] mb-1 block">Supplier Archetype</span>
                <h3 className="text-xl font-bold text-[#553a34]">Performance Multi-Axis</h3>
             </header>
             <div className="flex-1 flex items-center justify-center">
                <RadarChart data={supplierRadarData} />
             </div>
          </div>

          <div className="editorial-card p-10 flex flex-col min-h-[550px]">
             <header className="mb-10">
                <span className="text-[12px] text-[#974726] font-bold uppercase tracking-[0.2em] mb-1 block">Capital Distribution</span>
                <h3 className="text-xl font-bold text-[#553a34]">Strategic Cost Variance</h3>
             </header>
             <div className="flex-1 flex items-center">
                <BoxPlot data={varianceData} />
             </div>
          </div>

          <div className="editorial-card p-10 flex flex-col min-h-[550px]">
             <header className="mb-10">
                <span className="text-[12px] text-[#974726] font-bold uppercase tracking-[0.2em] mb-1 block">Resource Intensity</span>
                <h3 className="text-xl font-bold text-[#553a34]">By Departmental Activity</h3>
             </header>
             <div className="flex-1 flex items-center">
                <BarChart data={displayData.slice(0, 6).map(d => ({ label: d.title.split(' ')[1], value: d.expected_emission_reduction }))} />
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OperationsDashboard;

