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
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data whenever the user clicks a different table in the sidebar
  useEffect(() => {
    fetchTableData(activeTable);
  }, [activeTable]);

  const fetchTableData = async (tableName) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/${tableName}`);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      const data = await response.json();
      setTableData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-extract column headers from the first row of data
  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-emerald-400">DB Explorer</h2>
          <p className="text-xs text-slate-500">Unprotected Hackathon Route</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {DB_TABLES.map((table) => (
            <button
              key={table}
              onClick={() => setActiveTable(table)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                activeTable === table 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              {table.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h1 className="text-2xl font-semibold capitalize">Table: {activeTable}</h1>
          <button 
            onClick={() => fetchTableData(activeTable)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium transition-colors"
          >
            Refresh Data
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500 animate-pulse">
              Loading database records...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded">
              {error}
            </div>
          ) : tableData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 border-2 border-dashed border-slate-800 rounded-lg">
              No records found in {activeTable}.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-3 border-b border-slate-800 font-medium truncate max-w-[150px]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {tableData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-3 truncate max-w-[200px]" title={String(row[col])}>
                          {row[col] === null ? (
                            <span className="text-slate-600 italic">null</span>
                          ) : typeof row[col] === 'object' ? (
                            <span className="text-emerald-500">{JSON.stringify(row[col])}</span>
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