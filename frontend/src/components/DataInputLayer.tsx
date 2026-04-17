import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, FileSpreadsheet, Database, Image as ImageIcon, Trash2, X } from 'lucide-react';

const DEPARTMENTS = [
  { id: 'logistics', name: 'Logistics & Distribution', icon: <FileText size={14} /> },
  { id: 'manufacturing', name: 'Manufacturing Operations', icon: <FileText size={14} /> },
  { id: 'procurement', name: 'Global Procurement', icon: <FileText size={14} /> },
  { id: 'esg', name: 'ESG Compliance', icon: <FileText size={14} /> },
];

interface ArchivalFile {
  name: string;
  status: 'pending' | 'verified';
  size: string;
  type?: string;
}

export const DataInputLayer = () => {
  const [activeDept, setActiveDept] = useState('logistics');
  const [uploadedFiles, setUploadedFiles] = useState<ArchivalFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);

    // Simulate real ingestion lag for drama
    setTimeout(() => {
      const newFiles: ArchivalFile[] = files.map(file => ({
        name: file.name,
        status: 'pending',
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        type: file.type
      }));
      setUploadedFiles(prev => [...newFiles, ...prev]);
      setIsUploading(false);
    }, 1500);
  };

  const discardFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setUploadedFiles([]);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return <ImageIcon size={18} className="text-[#974726]" />;
    if (ext && ['csv', 'xlsx', 'xls'].includes(ext)) return <FileSpreadsheet size={18} className="text-[#166534]" />;
    return <FileText size={18} className="text-[#553a34]" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#fcf9f4] overflow-hidden">
      <input
        type="file"
        multiple
        hidden
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,.pdf,.csv,.xlsx,.xls,.doc,.docx"
      />

      {/* Horizontal Tabs for Departments */}
      <nav className="px-10 py-6 bg-white border-b border-[#dac2b6] border-opacity-30 flex items-center justify-between z-10 shadow-sm">
        <div className="flex gap-8">
          {DEPARTMENTS.map(dept => (
            <button
              key={dept.id}
              onClick={() => setActiveDept(dept.id)}
              className={`pb-4 px-1 text-[12px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 flex items-center gap-3 ${activeDept === dept.id
                ? 'border-[#974726] text-[#553a34]'
                : 'border-transparent text-[#877369] hover:text-[#553a34]'
                }`}
            >
              <span className={activeDept === dept.id ? 'text-[#974726]' : 'text-[#877369]'}>{dept.icon}</span>
              {dept.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ebe8e3] rounded-sm">
          <span className="text-[11px] font-bold text-[#877369] uppercase tabular-nums tracking-widest leading-none">Status: {isUploading ? 'Ingesting...' : 'Ready'}</span>
          <div className={`w-1.5 h-1.5 rounded-full ${isUploading ? 'bg-amber-500 animate-pulse' : 'bg-[#15803d]'}`} />
        </div>
      </nav>

      {/* Main Content / Upload Zone */}
      <main className="flex-1 p-10 flex flex-col gap-10 overflow-y-auto custom-scrollbar">
        <header>
          <span className="text-[12px] text-[#974726] font-bold uppercase tracking-[0.2em] mb-1 block">Inbound Registry Node</span>
          <h2 className="text-4xl font-bold text-[#553a34] tracking-tight">{DEPARTMENTS.find(d => d.id === activeDept)?.name} Management</h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            onClick={triggerUpload}
            className="editorial-card p-10 bg-white flex flex-col items-center justify-center border-dashed border-2 border-[#dac2b6] hover:border-[#974726] transition-all cursor-pointer group relative overflow-hidden"
          >
            {isUploading && (
              <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-[#974726] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[12px] font-bold text-[#974726] uppercase tracking-widest">Reading Artifacts...</span>
                </div>
              </div>
            )}
            <div className="w-20 h-20 bg-[#ebe8e3] rounded-full flex items-center justify-center mb-6 group-hover:bg-[#ffdea0] transition-colors">
              <Upload className="text-[#553a34]" size={28} />
            </div>
            <h4 className="text-xl font-bold text-[#553a34] mb-3 uppercase tracking-tighter">Ingest Operational Data</h4>
            <p className="text-[13px] text-[#877369] font-medium text-center max-w-xs leading-relaxed">
              Upload audit reports, registry PNGs, CSV logs, or procurement sheets for automated validation.
            </p>
            <div className="mt-8 flex gap-3">
              <span className="px-2 py-1 bg-[#fcf9f4] border border-[#dac2b6] border-opacity-40 text-[11px] font-bold text-[#877369] uppercase rounded-sm">ARTIFACTS</span>
              <span className="px-2 py-1 bg-[#fcf9f4] border border-[#dac2b6] border-opacity-40 text-[11px] font-bold text-[#877369] uppercase rounded-sm">LEDGERS</span>
              <span className="px-2 py-1 bg-[#fcf9f4] border border-[#dac2b6] border-opacity-40 text-[11px] font-bold text-[#877369] uppercase rounded-sm">VISUALS</span>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="editorial-card p-6 bg-white min-h-[300px] flex flex-col">
              <div className="flex justify-between items-center mb-6 border-b border-[#dac2b6] border-opacity-20 pb-4">
                <h4 className="text-[12px] font-bold uppercase tracking-widest text-[#974726]">Departmental Registry Ledger</h4>
                {uploadedFiles.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-[11px] font-bold text-[#877369] hover:text-red-600 uppercase tracking-widest flex items-center gap-2 transition-colors"
                  >
                    <Trash2 size={12} /> Clear Registry
                  </button>
                )}
              </div>

              <div className="space-y-4 flex-1">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-[#fcf9f4] rounded-sm border border-[#dac2b6] border-opacity-10 hover:border-opacity-100 transition-all group/item">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#ebe8e3] rounded flex items-center justify-center">
                        {getFileIcon(file.name)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-[#553a34] truncate max-w-[150px]">{file.name}</span>
                        <span className="text-[11px] text-[#877369] font-bold uppercase tracking-widest">{file.size} • {file.status === 'verified' ? 'Immutable' : 'Verifying'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'verified' ? <CheckCircle size={16} className="text-[#15803d]" /> : <AlertCircle size={16} className="text-[#974726] animate-pulse" />}
                      <button
                        onClick={() => discardFile(idx)}
                        className="p-1 hover:bg-red-100 rounded-sm text-red-500 opacity-0 group-hover/item:opacity-100 transition-all"
                        title="Discard Artifact"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {uploadedFiles.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 py-10">
                    <Database size={32} className="mb-4 text-[#877369]" />
                    <span className="text-[12px] font-bold uppercase tracking-widest">No Documents Found</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#553a34] p-8 rounded-sm text-white shadow-[0_20px_40px_rgba(85,58,52,0.3)]">
              <h4 className="text-xl font-bold mb-2 tracking-tight uppercase tracking-tighter">Topology Sync Protocol</h4>
              <p className="text-[13px] leading-relaxed opacity-80 font-medium mb-6">
                All data entering the ESGAudit engine is subjected to automated material index verification and archival anchoring.
              </p>
              <button className="w-full py-4 bg-[#974726] hover:bg-[#b0532d] text-white text-[12px] font-bold uppercase tracking-[0.25em] rounded-sm transition-all shadow-xl">
                Anchor to Global Ledger
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
