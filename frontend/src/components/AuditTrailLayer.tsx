import React from 'react';
import { Search, Download, Filter, UserCheck, UserX, UserMinus } from 'lucide-react';

const AUDIT_LOGS = [
  { id: 'TX-9901', auditor: 'Amulya A.', role: 'Chief ESG Auditor', action: 'Approved Supplier Swap', status: 'Approved', timestamp: '2026-04-18 00:12:44' },
  { id: 'TX-9902', auditor: 'Sarah K.', role: 'Logistics Manager', action: 'Modified Tariff Multiplier', status: 'Approved', timestamp: '2026-04-17 23:45:12' },
  { id: 'TX-9903', auditor: 'David L.', role: 'Compliance Officer', action: 'Flagged China Hotspot', status: 'Flagged', timestamp: '2026-04-17 22:10:05' },
  { id: 'TX-9904', auditor: 'Amulya A.', role: 'Chief ESG Auditor', action: 'Emergency Policy Override', status: 'Approved', timestamp: '2026-04-17 21:05:33' },
  { id: 'TX-9905', auditor: 'Robert B.', role: 'Procurement Lead', action: 'Added New Supplier ID-221', status: 'Pending', timestamp: '2026-04-17 19:30:11' },
  { id: 'TX-9906', auditor: 'Sarah K.', role: 'Logistics Manager', action: 'Rejected Route Change', status: 'Rejected', timestamp: '2026-04-17 18:15:00' },
];

export const AuditTrailLayer = () => {
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
              <th className="px-6 py-5 text-[12px] font-bold uppercase tracking-widest text-[#553a34]">Auditor / Role</th>
              <th className="px-6 py-5 text-[12px] font-bold uppercase tracking-widest text-[#553a34]">Archival Action</th>
              <th className="px-6 py-5 text-[12px] font-bold uppercase tracking-widest text-[#553a34]">Status</th>
              <th className="px-6 py-5 text-[12px] font-bold uppercase tracking-widest text-[#553a34]">Time Recorded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dac2b6]/20">
            {AUDIT_LOGS.map(log => (
              <tr key={log.id} className="hover:bg-[#fcf9f4] transition-all group">
                <td className="px-6 py-6 text-[13px] font-bold text-[#974726] newsreader">{log.id}</td>
                <td className="px-6 py-6">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#ebe8e3] flex items-center justify-center text-[12px] font-bold text-[#553a34]">
                         {log.auditor.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[13px] font-bold text-[#553a34]">{log.auditor}</span>
                         <span className="text-[11px] text-[#877369] font-bold uppercase tracking-tighter">{log.role}</span>
                      </div>
                   </div>
                </td>
                <td className="px-6 py-6 text-[13px] font-medium text-[#553a34] italic">{log.action}</td>
                <td className="px-6 py-6">
                   <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-tighter ${
                     log.status === 'Approved' ? 'bg-[#15803d]/10 text-[#15803d]' : 
                     log.status === 'Rejected' ? 'bg-[#b91c1c]/10 text-[#b91c1c]' : 
                     'bg-[#553d00]/10 text-[#553d00]'
                   }`}>
                      {log.status === 'Approved' ? <UserCheck size={12} /> : log.status === 'Rejected' ? <UserX size={12} /> : <UserMinus size={12} />}
                      {log.status}
                   </div>
                </td>
                <td className="px-6 py-6 text-[12px] font-bold text-[#877369] uppercase tabular-nums">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
