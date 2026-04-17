import React, { useState, useEffect } from 'react';

// These match the allowedModels in your backend crudRoutes.js
const DB_TABLES = [
  'user', 'plant', 'supplier', 'material', 'supplyLink', 
  'purchase', 'energyUsage', 'logistics', 'emission', 
  'action', 'supplierScore', 'dashboardSummary'
];

// Point this to your local backend API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function DatabaseExplorer() {
  const [activeTable, setActiveTable] = useState('supplier');
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data whenever the user clicks a different table in the sidebar
  useEffect(() => {
    fetchTableData(activeTable);
  }, [activeTable]);

  const fetchTableData = async (tableName: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/${tableName}`);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      const data = await response.json();
      setTableData(data);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Auto-extract column headers from the first row of data
  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  return (
    <div className="flex h-screen bg-[#fcf9f4] text-[#553a34] font-sans overflow-hidden selection:bg-[#ffdea0] selection:text-[#261900]">
      
      {/* SIDEBAR - Editorial Archive Aesthetic */}
      <div className="w-64 bg-[#ebe8e3] border-r border-[#dac2b6] border-opacity-40 flex flex-col">
        <div className="p-8 border-b border-[#dac2b6] border-opacity-30">
          <h2 className="text-xl font-bold tracking-tight text-[#553a34]">DB <span className="text-[#974726]">EXPLORER</span></h2>
          <span className="text-[9px] text-[#877369] font-bold tracking-widest uppercase mt-2 block">Level 1: System Access</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {DB_TABLES.map((table) => (
            <button
              key={table}
              onClick={() => setActiveTable(table)}
              className={`w-full text-left px-4 py-3 rounded-sm text-[11px] font-bold uppercase tracking-wider transition-all ${
                activeTable === table 
                  ? 'bg-[#553a34] text-white shadow-md' 
                  : 'hover:bg-[#dac2b6]/30 text-[#877369] hover:text-[#553a34]'
              }`}
            >
              {table}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT AREA - Parchment Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-10 py-8 border-b border-[#dac2b6] border-opacity-30 flex justify-between items-center bg-white shadow-sm z-10">
          <div>
            <span className="text-[10px] text-[#974726] font-bold uppercase tracking-[0.2em] mb-1 block">Active Data Environment</span>
            <h1 className="text-3xl font-bold newsreader tracking-tight text-[#553a34] capitalize">{activeTable} Records</h1>
          </div>
          <button 
            onClick={() => fetchTableData(activeTable)}
            className="px-6 py-3 bg-[#553a34] hover:bg-[#3a2824] text-white text-xs font-bold rounded-sm transition-all uppercase tracking-widest shadow-sm"
          >
            Refresh Records
          </button>
        </div>

        <div className="flex-1 overflow-auto p-10 bg-[#fcf9f4] space-y-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-[#877369] animate-pulse">
               <div className="w-8 h-8 border-2 border-[#974726] border-t-transparent rounded-full animate-spin mb-4" />
               <span className="text-xs font-bold uppercase tracking-widest">Querying Archival Engine...</span>
            </div>
          ) : error ? (
            <div className="p-6 bg-[#b91c1c]/5 border border-[#b91c1c]/20 text-[#b91c1c] rounded-sm text-sm font-medium italic">
              ERROR: {error}
            </div>
          ) : tableData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#877369] border-2 border-dashed border-[#dac2b6] border-opacity-30 rounded-sm">
              <span className="text-sm font-bold opacity-40">No records found for active filter.</span>
            </div>
          ) : (
            <div className="bg-white border border-[#dac2b6] border-opacity-40 rounded-sm overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#ebe8e3] text-[#553a34]">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-5 py-4 border-b border-[#dac2b6] border-opacity-30 font-bold uppercase tracking-wider newsreader">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dac2b6]/20">
                  {tableData.map((row, i) => (
                    <tr key={i} className="hover:bg-[#fcf9f4] transition-colors group">
                      {columns.map((col) => (
                        <td key={col} className="px-5 py-4 truncate max-w-[200px] text-[#553a34] font-medium leading-relaxed" title={String(row[col])}>
                          {row[col] === null ? (
                            <span className="text-[#877369] italic opacity-50">null</span>
                          ) : typeof row[col] === 'object' ? (
                            <span className="text-[#974726] font-bold">JSON</span>
                          ) : (
                            String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}