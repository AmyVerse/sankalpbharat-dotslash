import React, { useState } from 'react';
import {
  LayoutDashboard,
  Database,
  Activity,
  Workflow,
  History,
  Share2,
  Bell,
  Settings,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OperationsDashboard from '../components/OperationsDashboard';
import SupplierDashboard from '../components/SupplierDashboard';
import { DataInputLayer } from '../components/DataInputLayer';
import { WorkflowLayer } from '../components/WorkflowLayer';
import { AuditTrailLayer } from '../components/AuditTrailLayer';

type LayerId = 'input' | 'simulation' | 'dependency' | 'workflow' | 'audit';

const timeFilters = [
  { id: '1W', label: '1 Week' },
  { id: '1M', label: '1 Month' },
  { id: '1Y', label: '1 Year' },
  { id: '5Y', label: '5 Years' }
];

export default function Dashboard() {
  const [activeLayer, setActiveLayer] = useState<LayerId>('input');
  const [simulationView, setSimulationView] = useState<'operations' | 'suppliers'>('operations');
  const [activeTime, setActiveTime] = useState('1M');
  const navigate = useNavigate();

  const menuItems = [
    { id: 'input', label: 'Data Input Layer', icon: <Database size={18} />, description: 'Departmental Data Ingestion' },
    { id: 'simulation', label: 'Simulation Layer', icon: <Activity size={18} />, description: 'ROI & Risk Analytics' },
    { id: 'dependency', label: 'Dependency Layer', icon: <Share2 size={18} />, description: 'Supply Topology Engine' },
    { id: 'workflow', label: 'Workflow Layer', icon: <Workflow size={18} />, description: 'Approvals & Collaboration' },
    { id: 'audit', label: 'Audit Trail Layer', icon: <History size={18} />, description: 'Immutable Governance Log' },
  ];

  const handleLayerClick = (id: string) => {
    if (id === 'dependency') {
      navigate('/supplychaindashboard');
    } else {
      setActiveLayer(id as LayerId);
    }
  };

  return (
    <div className="flex h-screen bg-[#fcf9f4] text-[#553a34] overflow-hidden font-sans selection:bg-[#ffdea0] selection:text-[#261900]">

      {/* Sidebar Navigation - Expanded Menu Style */}
      <nav className="w-[320px] bg-[#ebe8e3] border-r border-[#dac2b6] border-opacity-30 flex flex-col z-50 relative">
        <div className="p-10 border-b border-[#dac2b6] border-opacity-30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#553a34] rounded flex items-center justify-center shadow-sm">
              <Activity className="text-[#ffdea0] w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#553a34]">ESGAudit</h1>
          </div>
          <span className="text-[12px] text-[#877369] font-bold tracking-[0.3em] opacity-60">Enterprise Console</span>
        </div>

        <div className="flex-1 py-10 px-6 space-y-3 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleLayerClick(item.id)}
              className={`w-full group flex items-start gap-4 p-5 rounded-sm transition-all text-left ${activeLayer === item.id
                ? 'bg-[#553a34] text-white shadow-xl translate-x-1'
                : 'text-[#877369] hover:bg-[#dac2b6]/40 hover:text-[#553a34]'
                }`}
            >
              <div className={`mt-0.5 ${activeLayer === item.id ? 'text-[#ffdea0]' : 'text-[#974726]'}`}>
                {item.icon}
              </div>
              <div className="flex flex-col flex-1 pl-1">
                <span className="text-sm font-bold uppercase tracking-widest leading-none mb-2">{item.label}</span>
                <span className={`text-[11px] font-semibold leading-tight opacity-70 group-hover:opacity-100 italic`}>{item.description}</span>
              </div>
              {activeLayer === item.id && <ChevronRight size={14} className="mt-1" />}
            </button>
          ))}
        </div>

        <div className="p-8 border-t border-[#dac2b6] border-opacity-30 flex flex-col gap-4">
          <div className="flex items-center gap-4 px-4 py-2 hover:bg-[#dac2b6]/30 rounded-sm cursor-pointer transition-all">
            <div className="w-8 h-8 rounded-full bg-[#fcf9f4] border border-[#dac2b6]/40 flex items-center justify-center text-[11px] font-bold text-[#553a34]">AM</div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-[#553a34]">Amulya Audits</span>
              <span className="text-[#877369] text-[11px] font-bold uppercase">Root Admin</span>
            </div>
          </div>
          <div className="flex justify-between items-center px-4">
            <div className="flex gap-4">
              <Bell className="w-4 h-4 text-[#877369] hover:text-[#974726] cursor-pointer transition-colors" />
              <Settings className="w-4 h-4 text-[#877369] hover:text-[#553a34] cursor-pointer transition-colors" />
            </div>
            <button onClick={() => navigate('/')} className="text-[#b91c1c] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-70">
              <LogOut size={12} /> Leave
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* Sub-Header for Active Layer */}
        {activeLayer === 'simulation' && (
          <header className="h-16 flex items-center px-10 border-b border-[#dac2b6] border-opacity-20 bg-white/50 z-40 justify-between">
            <div className="flex gap-8">
              <button
                onClick={() => setSimulationView('operations')}
                className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all pb-1 border-b-2 ${simulationView === 'operations' ? 'border-[#974726] text-[#553a34]' : 'border-transparent text-[#877369] hover:text-[#553a34]'}`}
              >
                Operations & ROI
              </button>
              <button
                onClick={() => setSimulationView('suppliers')}
                className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all pb-1 border-b-2 ${simulationView === 'suppliers' ? 'border-[#974726] text-[#553a34]' : 'border-transparent text-[#877369] hover:text-[#553a34]'}`}
              >
                Supplier Risk Matrix
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[12px] font-bold text-[#877369] uppercase tracking-widest">Time Scope:</span>
              <div className="flex bg-[#ebe8e3] p-1 rounded-sm gap-1">
                {timeFilters.map(tf => (
                  <button
                    key={tf.id}
                    onClick={() => setActiveTime(tf.id)}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-all rounded-sm ${activeTime === tf.id ? 'bg-[#553a34] text-white shadow-sm' : 'text-[#877369] hover:text-[#553a34]'}`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </header>
        )}

        {/* Dynamic Layer Injection */}
        <div className="flex-1 overflow-hidden">
          {activeLayer === 'input' && <DataInputLayer />}

          {activeLayer === 'simulation' && (
            simulationView === 'operations' ? (
              <OperationsDashboard activeTime={activeTime} setActiveTime={setActiveTime} />
            ) : (
              <SupplierDashboard activeTime={activeTime} />
            )
          )}

          {activeLayer === 'workflow' && <WorkflowLayer />}

          {activeLayer === 'audit' && <AuditTrailLayer />}
        </div>
      </main>

    </div>
  );
}
