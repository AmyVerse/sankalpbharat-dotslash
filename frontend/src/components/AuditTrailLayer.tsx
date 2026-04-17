import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, UserCheck, UserX, UserMinus } from 'lucide-react';

export const AuditTrailLayer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/auditLog`);
        const data = await response.json();
        setLogs(data || []);
      } catch (err) {
        console.error("Audit Trail Sync Failure:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#fcf9f4]">
       <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-[#553a34] border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] font-bold text-[#553a34] uppercase tracking-[0.3em]">Deciphering Archival Ledger</span>
       </div>
    </div>
  );

  return (
    <div className="h-full bg-[#fcf9f4] p-10 flex flex-col gap-8 overflow-hidden">
      <header className="flex justify-between items-end">
        <div>
          <span className="text-[12px] text-[#974726] font-bold uppercase tracking-[0.25em] mb-2 block">Immutable Record Storage</span>
          <h2 className="text-4xl font-bold text-[#553a34] tracking-tighter uppercase">Governance Audit Trail</h2>
        </div>
        <button className="flex items-center gap-3 px-8 py-4 bg-[#ebe8e3] text-[13px] font-bold uppercase tracking-wider text-[#553a34] rounded-sm hover:bg-[#dac2b6]/40 transition-all border border-[#dac2b6] border-opacity-30">
          <Download size={16} /> Export Archival Ledger (CSV)
        </button>
      </header>

      {/* Filter Bar */}
      <div className="flex gap-4 items-center bg-white border border-[#dac2b6] border-opacity-30 p-4 rounded-sm">
        <div className="flex-1 flex items-center gap-3 bg-[#fcf9f4] px-4 py-3 border border-[#dac2b6] border-opacity-20 rounded-sm">
           <Search size={18} className="text-[#877369]" />
           <input type="text" placeholder="Search by Auditor ID or Action Hash..." className="bg-transparent border-none text-[13px] w-full focus:ring-0 placeholder-[#877369] text-[#553a34] font-medium" />
         </div>
         <button className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-[#877369] hover:text-[#553a34] px-4">
            <Filter size={14} /> Refine Results
         </button>
      </div>

      <div className="flex-1 overflow-auto editorial-card bg-white rounded-sm custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#ebe8e3] z-10">
            <tr className="border-b border-[#dac2b6] border-opacity-40">
              <th className="px-6 py-5 text-[12px] font-bold uppercase tracking-widest text-[#553a34]">Ref ID</th>
              <th className="px-6 py-5 text-[12px] font-bold uppercase tracking-widest text-[#553a34]">Entity</th>
              <th className="px-6 py-5 text-[12px] font-bold uppercase tracking-widest text-[#553a34]">Archival Action</th>
              <th className="px-6 py-5 text-[12px] font-bold uppercase tracking-widest text-[#553a34]">Status</th>
              <th className="px-6 py-5 text-[12px] font-bold uppercase tracking-widest text-[#553a34]">Time Recorded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dac2b6]/20">
            {logs.length > 0 ? logs.map(log => (
              <tr key={log.id} className="hover:bg-[#fcf9f4] transition-all group">
                <td className="px-6 py-6 text-[13px] font-bold text-[#974726] newsreader">{log.id.slice(0, 8)}</td>
                <td className="px-6 py-6">
                   <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#553a34]">{log.entity_type}</span>
                      <span className="text-[11px] text-[#877369] font-bold uppercase tracking-tighter">{log.entity_id.slice(0, 12)}...</span>
                   </div>
                </td>
                <td className="px-6 py-6 text-[13px] font-medium text-[#553a34] italic">{log.action}</td>
                <td className="px-6 py-6">
                   <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-tighter bg-[#ebe8e3] text-[#553a34]`}>
                      <UserCheck size={12} />
                      Recorded
                   </div>
                </td>
                <td className="px-6 py-6 text-[12px] font-bold text-[#877369] uppercase tabular-nums">
                  {new Date(log.created_at).toLocaleString()}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-[#877369] font-bold uppercase tracking-[0.2em] text-[12px]">
                  No archival entries found in global ledger.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
