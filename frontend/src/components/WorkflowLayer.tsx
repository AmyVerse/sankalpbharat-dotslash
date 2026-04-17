import React from 'react';
import { Users, CheckCircle, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

const WORKFLOW_ITEMS = [
  { id: 1, type: 'Mitigation Approval', dept: 'Procurement', status: 'Pending', priority: 'High', description: 'Swap supplier CN-882 for TW-102 (5% tax reduction)' },
  { id: 2, type: 'Audit Verification', dept: 'Logistics', status: 'Completed', priority: 'Medium', description: 'Review Q1 carbon intensity report for APAC routes' },
  { id: 3, type: 'Policy Override', dept: 'ESG Compliance', status: 'Pending', priority: 'Critical', description: 'Emergency subsidy for sustainable aviation fuel' },
];

export const WorkflowLayer = () => {
  return (
    <div className="h-full bg-[#fcf9f4] p-10 flex flex-col gap-10 overflow-y-auto custom-scrollbar">
      <header className="flex justify-between items-end">
        <div>
          <span className="text-[10px] text-[#974726] font-bold  tracking-[0.2em] mb-1 block">Collaborative Workspace</span>
          <h2 className="text-3xl font-bold newsreader text-[#553a34]">Internal Directive Workflow</h2>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-3 bg-white border border-[#dac2b6] text-[10px] font-bold  tracking-wider text-[#553a34] rounded-sm hover:bg-[#ebe8e3] transition-all">
            Invite Auditors
          </button>
          <button className="px-6 py-3 bg-[#553a34] text-white text-[10px] font-bold  tracking-wider rounded-sm hover:bg-[#3a2824] transition-all">
            New Action Request
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#877369]  border-b border-[#dac2b6] border-opacity-30 pb-4">Active Tasks</h3>
          <div className="space-y-4">
            {WORKFLOW_ITEMS.map(item => (
              <div key={item.id} className="editorial-card bg-white p-6 flex items-center justify-between group hover:border-[#974726] transition-all">
                <div className="flex items-center gap-6">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.status === 'Completed' ? 'bg-[#15803d]/10 text-[#15803d]' : 'bg-[#974726]/10 text-[#974726]'}`}>
                    {item.status === 'Completed' ? <CheckCircle size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-[#877369]  tracking-wider">{item.dept} // {item.type}</span>
                    <h4 className="text-sm font-bold text-[#553a34] newsreader">{item.description}</h4>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold  text-[#877369]">Priority</span>
                    <span className={`text-[10px] font-bold ${item.priority === 'Critical' ? 'text-[#b91c1c]' : 'text-[#553a34]'}`}>{item.priority}</span>
                  </div>
                  <button className="p-2 border border-[#dac2b6] border-opacity-40 rounded-sm text-[#877369] group-hover:bg-[#553a34] group-hover:text-white group-hover:border-[#553a34] transition-all">
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="bg-[#ebe8e3] p-8 border border-[#dac2b6] border-opacity-40 rounded-sm">
            <h4 className="text-[10px] font-bold tracking-widest text-[#553a34] mb-6">Departmental Health</h4>
            <div className="space-y-6">
              {[
                { label: 'Procurement', val: 88, color: '#15803d' },
                { label: 'Logistics', val: 72, color: '#974726' },
                { label: 'ESGAudit', val: 94, color: '#553a34' },
              ].map(dept => (
                <div key={dept.label} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold  text-[#877369]">
                    <span>{dept.label}</span>
                    <span>{dept.val}% Approval Rate</span>
                  </div>
                  <div className="w-full h-1 bg-white rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-1000" style={{ width: `${dept.val}%`, backgroundColor: dept.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="editorial-card p-8 bg-white border-l-4 border-[#974726]">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="text-[#974726]" size={20} />
              <h4 className="text-sm font-bold text-[#553a34]  tracking-wider">Compliance Warning</h4>
            </div>
            <p className="text-xs leading-relaxed text-[#877369] font-medium">
              The current swap request for vendor "CN-882" is missing primary validation from the Central Risk Committee. Proceed with caution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
