import React, { useState, useMemo } from 'react';
import ScatterPlot from './ScatterPlot';
import mockData from '../mockData.json';
import { ToggleRight, ToggleLeft, AlertTriangle } from 'lucide-react';

const SupplierDashboard = ({ activeTime }) => {
  const [activeSupplierId, setActiveSupplierId] = useState(null);
  const [cbamEnabled, setCbamEnabled] = useState(false);

  // Calculate adjusted data based on CBAM Toggle
  const supplierData = useMemo(() => {
    const timeMultiplier = activeTime === '1W' ? 0.8 : activeTime === '1M' ? 1.0 : activeTime === '1Y' ? 1.4 : 2.0;
    
    return mockData.suppliers.map(sup => {
      let currentSpend = sup.spend * timeMultiplier;
      let currentEmissions = sup.emissions * timeMultiplier;
      let taxPenalty = 0;

      if (cbamEnabled) {
        // Multiply emissions by $50 -> Approx ₹4150 per ton
        taxPenalty = currentEmissions * 4150; 
        currentSpend += taxPenalty;
      }

      return {
        ...sup,
        emissions: currentEmissions,
        adjusted_spend: currentSpend,
        tax_applied: taxPenalty
      };
    });
  }, [cbamEnabled, activeTime]);

  // Color logic for Supplier matrix
  const supplierColorLogic = (item) => {
    // High Emissions, High Cost -> High Risk (Top Right)
    const maxEmissions = 35000;
    if (item.emissions > maxEmissions * 0.6) {
      return { fill: "#b91c1c", stroke: "#7f1d1d" }; // Liability - Vivid Red
    }
    // Low Emissions, Low Spend -> High Efficiency (Bottom Left)
    if (item.emissions < maxEmissions * 0.3) {
      return { fill: "#15803d", stroke: "#14532d" }; // Efficient - Vivid Green
    }
    return { fill: "#553a34", stroke: "#3a2824" }; // Default - Espresso
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#fcf9f4]">
      {/* Main Content */}
      <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col gap-10 relative">
        
        {/* Shadow P&L Header Controller - Tactical Alert Feel */}
        <div className={`editorial-card p-6 flex items-center justify-between transition-all duration-500 ${cbamEnabled ? 'border-[#b91c1c] border-opacity-40 bg-[#b91c1c]/5' : ''}`}>
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-md ${cbamEnabled ? 'bg-[#b91c1c] text-white' : 'bg-[#ebe8e3] text-[#553a34]'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-xl font-bold tracking-tight ${cbamEnabled ? 'text-[#b91c1c]' : 'text-[#553a34]'}`}>Shadow P&L Simulation</h2>
              <p className="text-xs text-[#877369] mt-1 font-medium italic">Inject $50/ton (~₹4,150) theoretical carbon tax penalty across value chain.</p>
            </div>
          </div>
          
          <button 
            onClick={() => setCbamEnabled(!cbamEnabled)}
            className="flex items-center gap-4 group px-6 py-3 bg-[#fcf9f4] border border-[#dac2b6] border-opacity-40 rounded-md hover:border-[#877369] transition-all"
          >
            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${cbamEnabled ? 'text-[#b91c1c]' : 'text-[#877369]'}`}>
              {cbamEnabled ? 'Tax Protocol Active' : 'Initialize Tax Simulation'}
            </span>
            {cbamEnabled ? (
              <ToggleRight className="w-8 h-8 text-[#b91c1c]" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-[#877369]" />
            )}
          </button>
        </div>

        {/* Main Graph Area */}
        <div className="editorial-card p-8 flex-1 min-h-[500px] flex flex-col">
          <div className="flex justify-between items-end mb-8 border-b border-[#dac2b6] border-opacity-20 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#553a34] tracking-tight">Supplier Risk Index Matrix</h2>
              <p className="text-xs text-[#877369] mt-2 font-medium">Watch nodes shift horizontally dynamically due to tax burden exposure.</p>
            </div>
            <div className="text-[10px] font-bold text-[#b91c1c] uppercase tracking-[0.2em] mb-2 px-3 py-1 bg-[#b91c1c]/10 rounded-full">
              Risk Assessment Live
            </div>
          </div>
          
          <div className="flex-1 w-full bg-[#fcf9f4] border border-[#dac2b6] border-opacity-30 rounded-md p-6 overflow-hidden">
            <ScatterPlot 
              data={supplierData}
              xKey="adjusted_spend"
              yKey="emissions"
              xAxisLabel="Financial Spend (₹) + Tax Liabilities"
              yAxisLabel="Scope 3 Emissions (Tons CO₂e)"
              colorLogic={supplierColorLogic}
              onNodeClick={(node) => setActiveSupplierId(node.id === activeSupplierId ? null : node.id)}
              activeNodeId={activeSupplierId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;

