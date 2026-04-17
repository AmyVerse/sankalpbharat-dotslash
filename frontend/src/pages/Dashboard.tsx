import React, { useState } from 'react';
import { LayoutDashboard, Truck, Activity, Settings, Bell } from 'lucide-react';
import OperationsDashboard from '../components/OperationsDashboard';
import SupplierDashboard from '../components/SupplierDashboard';

export default function Dashboard() {
  const [activeView, setActiveView] = useState('operations');
  const [activeTime, setActiveTime] = useState('1M'); // Lifted from OperationsDashboard

  return (
    <div className="flex h-screen bg-[#fcf9f4] text-[#553a34] overflow-hidden font-sans selection:bg-[#ffdea0] selection:text-[#261900]">
      
      {/* Sidebar Navigation */}
      <nav className="w-20 bg-[#ebe8e3] border-r border-[#dac2b6] border-opacity-30 flex flex-col items-center py-6 gap-8 z-50 relative">
        <div className="w-12 h-12 bg-[#553a34] rounded-xl flex items-center justify-center shadow-sm">
          <Activity className="text-[#ffdea0] w-7 h-7" />
        </div>

        <div className="flex flex-col gap-4 mt-4 w-full px-3">
          <button 
            onClick={() => setActiveView('operations')}
            className={`p-3 rounded-lg flex items-center justify-center transition-all ${activeView === 'operations' ? 'bg-[#553a34] text-white shadow-md' : 'text-[#877369] hover:bg-[#dac2b6] hover:bg-opacity-50'}`}
            title="Operations & ROI"
          >
            <LayoutDashboard className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveView('suppliers')}
            className={`p-3 rounded-lg flex items-center justify-center transition-all ${activeView === 'suppliers' ? 'bg-[#553a34] text-white shadow-md' : 'text-[#877369] hover:bg-[#dac2b6] hover:bg-opacity-50'}`}
            title="Supplier Risk & Procurement"
          >
            <Truck className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <button className="p-3 text-[#877369] hover:text-[#553a34] transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-3 text-[#877369] hover:text-[#553a34] transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* Top Header */}
        <header className="h-16 flex items-center px-8 border-b border-[#dac2b6] border-opacity-30 bg-[#fcf9f4] bg-opacity-90 backdrop-blur-md z-40">
          <h1 className="text-xl font-bold tracking-tight text-[#553a34]">
            {activeView === 'operations' ? 'Operations & ROI Console' : 'Supplier Risk Matrix'}
          </h1>
          <div className="ml-auto flex items-center gap-4 text-sm text-[#877369] font-medium">
            <span>Standard Region: APAC</span>
            <div className="w-8 h-8 rounded-full bg-[#ebe8e3] border border-[#dac2b6] flex items-center justify-center">
              <span className="text-xs font-bold text-[#553a34]">CM</span>
            </div>
          </div>
        </header>

        {/* Dynamic View Injection */}
        {activeView === 'operations' ? (
          <OperationsDashboard activeTime={activeTime} setActiveTime={setActiveTime} />
        ) : (
          <SupplierDashboard activeTime={activeTime} />
        )}
      </main>
      
    </div>
  );
}
