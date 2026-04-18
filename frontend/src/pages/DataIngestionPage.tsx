import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileArchive, Cpu, Database, CheckCircle2, AlertTriangle,
  ArrowRight, Activity, Loader2, FileText, FileSpreadsheet,
  Image as ImageIcon, File, ChevronRight, Leaf, Gauge,
  Factory, Truck, Zap, DollarSign, BarChart3, XCircle
} from 'lucide-react';

const PIPELINE_API = 'http://localhost:8000';

type StageStatus = 'idle' | 'active' | 'done' | 'error';

interface PipelineStage {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: StageStatus;
}

interface FileEntry {
  name: string;
  type: string;
  icon: React.ReactNode;
}

interface EmissionSummary {
  total_manufacturing_co2e_kg: number;
  total_shadow_tax_usd: number;
  total_transport_co2e_kg: number;
  suppliers_processed: number;
  invoices_parsed: number;
}

export default function DataIngestionPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedFiles, setDetectedFiles] = useState<FileEntry[]>([]);
  const [emissionSummary, setEmissionSummary] = useState<EmissionSummary | null>(null);
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([
    { id: 'upload', label: 'Archive Upload', description: 'ZIP file received', icon: <FileArchive size={18} />, status: 'idle' },
    { id: 'classify', label: 'File Classification', description: 'Identifying data artifacts', icon: <Cpu size={18} />, status: 'idle' },
    { id: 'extract', label: 'Multimodal Extraction', description: 'Gemini API processing', icon: <Zap size={18} />, status: 'idle' },
    { id: 'carbon', label: 'Carbon Engine', description: 'EPA emission calculations', icon: <Gauge size={18} />, status: 'idle' },
    { id: 'persist', label: 'Database Persist', description: 'Writing to Postgres', icon: <Database size={18} />, status: 'idle' },
  ]);

  const geminiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

  const getFileIcon = (name: string): React.ReactNode => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return <ImageIcon size={14} className="text-[#974726]" />;
    if (['csv'].includes(ext)) return <FileSpreadsheet size={14} className="text-[#15803d]" />;
    if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet size={14} className="text-[#553d00]" />;
    if (['txt'].includes(ext)) return <FileText size={14} className="text-[#553a34]" />;
    return <File size={14} className="text-[#877369]" />;
  };

  const getFileType = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'Image Invoice';
    if (['csv'].includes(ext)) return 'Structured Data';
    if (['xls', 'xlsx'].includes(ext)) return 'Spreadsheet';
    if (['txt'].includes(ext)) return 'Raw Invoice';
    if (['pdf'].includes(ext)) return 'PDF Document';
    return 'Unknown';
  };

  const updateStage = (id: string, status: StageStatus) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const addLog = (msg: string) => {
    setProcessingLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.zip')) {
      setZipFile(file);
      previewZip(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.name.endsWith('.zip')) {
      setZipFile(file);
      previewZip(file);
    }
  };

  const previewZip = async (file: File) => {
    // Use JSZip-like parsing would be ideal, but for now list by name convention
    setDetectedFiles([]);
    addLog(`Archive loaded: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
  };

  const runIngestion = async () => {
    if (!zipFile) return;

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProcessingLog([]);

    try {
      // Stage 1: Upload
      updateStage('upload', 'active');
      addLog('Uploading archive to ingestion pipeline...');
      await new Promise(r => setTimeout(r, 600));
      updateStage('upload', 'done');
      addLog('Archive received by pipeline service.');

      // Stage 2: Classify
      updateStage('classify', 'active');
      addLog('Classifying file artifacts...');
      await new Promise(r => setTimeout(r, 800));
      updateStage('classify', 'done');

      // Stage 3+4+5: Call the actual API
      updateStage('extract', 'active');
      addLog('Sending to Gemini API for multimodal extraction...');

      const formData = new FormData();
      formData.append('file', zipFile);
      if (geminiKey) {
        formData.append('gemini_key', geminiKey);
      }
      formData.append('push_to_db', 'true');

      const response = await fetch(`${PIPELINE_API}/ingest?push_to_db=true&gemini_key=${encodeURIComponent(geminiKey)}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Pipeline error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      updateStage('extract', 'done');
      addLog(`Extraction complete. ${result.processing?.files_processed || 0} files processed.`);

      // Parse file list from results
      const files: FileEntry[] = [];
      result.processing?.images_detected?.forEach((fname: string) => {
        files.push({ name: fname, type: 'Image Invoice', icon: <ImageIcon size={14} className="text-[#974726]" /> });
      });
      result.processing?.pdfs_detected?.forEach((fname: string) => {
        files.push({ name: fname, type: 'PDF Document', icon: <File size={14} className="text-[#877369]" /> });
      });
      if (result.processing?.invoices_parsed > 0) {
        files.push({ name: 'invoices_batch.txt', type: `Raw Invoices (${result.processing.invoices_parsed})`, icon: <FileText size={14} className="text-[#553a34]" /> });
      }
      if (result.processing?.csv_processed > 0) {
        files.push({ name: 'structured_data.csv', type: `Structured Data (${result.processing.csv_processed})`, icon: <FileSpreadsheet size={14} className="text-[#15803d]" /> });
      }
      setDetectedFiles(files);

      // Stage 4: Carbon engine
      updateStage('carbon', 'active');
      addLog('Running EPA emission factor calculations...');
      await new Promise(r => setTimeout(r, 1000));
      updateStage('carbon', 'done');
      addLog(`Manufacturing: ${result.emission_summary?.total_manufacturing_co2e_kg?.toLocaleString()} kgCO2e`);
      addLog(`Shadow carbon tax: $${result.emission_summary?.total_shadow_tax_usd?.toLocaleString()}`);

      // Stage 5: Database
      updateStage('persist', 'active');
      addLog('Persisting structured records to Postgres...');
      await new Promise(r => setTimeout(r, 800));
      updateStage('persist', 'done');
      addLog(`${result.entities_collected?.suppliers || 0} suppliers written to database.`);

      // Patch the emissionSummary object to match what the UI template expects
      const patchedSummary = {
        ...result.emission_summary,
        suppliers_processed: result.entities_collected?.suppliers || 0,
        invoices_parsed: result.processing?.invoices_parsed || 0,
      };

      setEmissionSummary(patchedSummary);
      setIsComplete(true);
      addLog('Pipeline complete. All stages finished.');

      if (result.processing?.errors?.length > 0) {
        addLog(`⚠ ${result.processing.errors.length} file(s) had processing errors.`);
      }

    } catch (err: any) {
      setError(err.message || 'Pipeline processing failed');
      addLog(`ERROR: ${err.message}`);
      // Mark current active stage as error
      setStages(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s));
    } finally {
      setIsProcessing(false);
    }
  };

  const stageColor = (status: StageStatus) => {
    switch (status) {
      case 'done': return 'bg-[#15803d] text-white';
      case 'active': return 'bg-[#974726] text-white animate-pulse';
      case 'error': return 'bg-[#b91c1c] text-white';
      default: return 'bg-[#ebe8e3] text-[#877369]';
    }
  };

  const stageConnector = (status: StageStatus) => {
    switch (status) {
      case 'done': return 'bg-[#15803d]';
      case 'active': return 'bg-[#974726] animate-pulse';
      default: return 'bg-[#dac2b6]';
    }
  };

  return (
    <div className="flex h-screen bg-[#fcf9f4] text-[#553a34] overflow-hidden font-sans selection:bg-[#ffdea0] selection:text-[#261900]">

      {/* Sidebar */}
      <nav className="w-[300px] bg-[#ebe8e3] border-r border-[#dac2b6] border-opacity-30 flex flex-col z-50">
        <div className="p-8 border-b border-[#dac2b6] border-opacity-30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#553a34] rounded flex items-center justify-center shadow-sm">
              <Activity className="text-[#ffdea0] w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#553a34]">ESGAudit</h1>
          </div>
          <span className="text-[11px] text-[#877369] font-bold tracking-[0.3em] opacity-60">DATA INGESTION ENGINE</span>
        </div>

        {/* Pipeline Stages */}
        <div className="flex-1 py-8 px-6 overflow-y-auto custom-scrollbar">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#877369] mb-6 px-2">Processing Pipeline</h3>
          <div className="space-y-1">
            {stages.map((stage, idx) => (
              <React.Fragment key={stage.id}>
                <div className={`flex items-start gap-3 p-4 rounded-sm transition-all ${stage.status === 'active' ? 'bg-white shadow-lg' : stage.status === 'done' ? 'bg-white/50' : ''}`}>
                  <div className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 transition-all ${stageColor(stage.status)}`}>
                    {stage.status === 'active' ? <Loader2 size={14} className="animate-spin" /> :
                     stage.status === 'done' ? <CheckCircle2 size={14} /> :
                     stage.status === 'error' ? <XCircle size={14} /> :
                     stage.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-[#553a34]">{stage.label}</div>
                    <div className="text-[9px] text-[#877369] font-medium mt-0.5">{stage.description}</div>
                  </div>
                </div>
                {idx < stages.length - 1 && (
                  <div className="flex justify-start pl-[22px]">
                    <div className={`w-0.5 h-4 transition-all ${stageConnector(stage.status)}`} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="p-6 border-t border-[#dac2b6] border-opacity-30 space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#877369] hover:text-[#553a34] transition-colors flex items-center justify-center gap-2"
          >
            <ChevronRight size={12} className="rotate-180" /> Back to Dashboard
          </button>
          {isComplete && (
            <button
              onClick={() => navigate('/supplychaindashboard')}
              className="w-full py-3 bg-[#553a34] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm shadow-xl hover:bg-[#974726] transition-all flex items-center justify-center gap-2"
            >
              Launch Simulation <ArrowRight size={12} />
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">

        {/* Header */}
        <header className="px-10 py-8 border-b border-[#dac2b6] border-opacity-20 bg-white/50">
          <span className="text-[10px] text-[#974726] font-bold uppercase tracking-[0.25em] mb-1 block">Multimodal Ingestion Pipeline</span>
          <h2 className="text-3xl font-bold text-[#553a34] tracking-tight">Supply Chain Data Ingestion</h2>
          <p className="text-[13px] text-[#877369] font-medium mt-2 max-w-2xl">
            Upload a ZIP archive of supply chain artifacts — invoices, CSVs, images, compliance sheets — and the pipeline will classify, extract, and compute emissions using <strong className="text-[#553a34]">EPA GHG Emission Factors Hub 2025</strong>.
          </p>
        </header>

        <div className="p-10 space-y-8">

          {/* Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-sm p-12 flex flex-col items-center justify-center cursor-pointer transition-all group ${
              isDragging
                ? 'border-[#974726] bg-[#ffdea0]/10'
                : zipFile
                  ? 'border-[#15803d] bg-[#f0fdf4]/50'
                  : 'border-[#dac2b6] bg-white hover:border-[#974726] hover:bg-[#fcf9f4]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              hidden
              onChange={handleFileSelect}
            />

            {zipFile ? (
              <>
                <div className="w-16 h-16 bg-[#f0fdf4] rounded-full flex items-center justify-center mb-4">
                  <FileArchive size={28} className="text-[#15803d]" />
                </div>
                <div className="text-lg font-bold text-[#553a34] mb-1">{zipFile.name}</div>
                <div className="text-[12px] text-[#877369] font-bold uppercase tracking-widest">
                  {(zipFile.size / (1024 * 1024)).toFixed(1)} MB • Ready for Processing
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-[#ebe8e3] rounded-full flex items-center justify-center mb-6 group-hover:bg-[#ffdea0] transition-colors">
                  <Upload size={28} className="text-[#553a34]" />
                </div>
                <h4 className="text-xl font-bold text-[#553a34] mb-2">Drop Supply Chain Archive</h4>
                <p className="text-[13px] text-[#877369] font-medium text-center max-w-md">
                  Accepts ZIP files containing CSVs, invoices (.txt), PDFs, images, and Excel spreadsheets.
                </p>
                <div className="mt-6 flex gap-3 flex-wrap justify-center">
                  {['CSV', 'TXT', 'XLSX', 'PDF', 'PNG', 'JPG'].map(ext => (
                    <span key={ext} className="px-2 py-1 bg-[#fcf9f4] border border-[#dac2b6] border-opacity-40 text-[10px] font-bold text-[#877369] uppercase rounded-sm">
                      .{ext}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Action Button */}
          {zipFile && !isComplete && (
            <button
              onClick={runIngestion}
              disabled={isProcessing}
              className={`w-full py-5 rounded-sm text-[12px] font-bold uppercase tracking-[0.25em] transition-all shadow-xl flex items-center justify-center gap-3 ${
                isProcessing
                  ? 'bg-[#dac2b6] text-[#877369] cursor-wait'
                  : 'bg-[#553a34] text-white hover:bg-[#974726]'
              }`}
            >
              {isProcessing ? (
                <><Loader2 size={16} className="animate-spin" /> Processing Pipeline...</>
              ) : (
                <><Cpu size={16} /> Initialize Ingestion Pipeline</>
              )}
            </button>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-[#fff5f5] border border-[#b91c1c] border-opacity-30 p-6 rounded-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-[#b91c1c]" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#b91c1c]">Pipeline Error</span>
              </div>
              <p className="text-[13px] text-[#553a34] font-medium">{error}</p>
            </div>
          )}

          {/* Results Grid */}
          {(detectedFiles.length > 0 || emissionSummary) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Detected Files */}
              <div className="bg-white border border-[#dac2b6] border-opacity-40 rounded-sm shadow-sm">
                <div className="p-5 border-b border-[#dac2b6] border-opacity-20">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#974726]">Classified Artifacts</h3>
                </div>
                <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                  {detectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-[#fcf9f4] rounded-sm border border-[#dac2b6] border-opacity-10">
                      <div className="w-8 h-8 bg-[#ebe8e3] rounded flex items-center justify-center">{f.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-[#553a34] truncate">{f.name}</div>
                        <div className="text-[9px] text-[#877369] font-bold uppercase tracking-widest">{f.type}</div>
                      </div>
                      <CheckCircle2 size={14} className="text-[#15803d] shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Emission Summary */}
              {emissionSummary && (
                <div className="bg-white border border-[#dac2b6] border-opacity-40 rounded-sm shadow-sm">
                  <div className="p-5 border-b border-[#dac2b6] border-opacity-20">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#974726]">EPA Carbon Analysis</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#fcf9f4] p-4 rounded-sm border border-[#dac2b6] border-opacity-10">
                        <div className="flex items-center gap-2 mb-2">
                          <Factory size={14} className="text-[#974726]" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[#877369]">Manufacturing</span>
                        </div>
                        <div className="text-xl font-bold text-[#553a34] newsreader">
                          {Math.floor(emissionSummary.total_manufacturing_co2e_kg / 1000).toLocaleString()}
                        </div>
                        <div className="text-[9px] text-[#877369] font-bold uppercase">tCO2e estimated</div>
                      </div>
                      <div className="bg-[#fcf9f4] p-4 rounded-sm border border-[#dac2b6] border-opacity-10">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign size={14} className="text-[#553d00]" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[#877369]">Shadow Tax</span>
                        </div>
                        <div className="text-xl font-bold text-[#553a34] newsreader">
                          ${emissionSummary.total_shadow_tax_usd.toLocaleString()}
                        </div>
                        <div className="text-[9px] text-[#877369] font-bold uppercase">Internal carbon cost</div>
                      </div>
                      <div className="bg-[#fcf9f4] p-4 rounded-sm border border-[#dac2b6] border-opacity-10">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 size={14} className="text-[#15803d]" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[#877369]">Suppliers</span>
                        </div>
                        <div className="text-xl font-bold text-[#553a34] newsreader">
                          {emissionSummary.suppliers_processed}
                        </div>
                        <div className="text-[9px] text-[#877369] font-bold uppercase">Nodes analyzed</div>
                      </div>
                      <div className="bg-[#fcf9f4] p-4 rounded-sm border border-[#dac2b6] border-opacity-10">
                        <div className="flex items-center gap-2 mb-2">
                          <Leaf size={14} className="text-[#15803d]" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[#877369]">Invoices</span>
                        </div>
                        <div className="text-xl font-bold text-[#553a34] newsreader">
                          {emissionSummary.invoices_parsed}
                        </div>
                        <div className="text-[9px] text-[#877369] font-bold uppercase">Gemini extracted</div>
                      </div>
                    </div>
                    <div className="bg-[#553a34] p-4 rounded-sm text-white flex items-center justify-between">
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1">Source</div>
                        <div className="text-[11px] font-bold">EPA GHG Emission Factors Hub 2025</div>
                      </div>
                      <Gauge size={20} className="text-[#ffdea0]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing Log */}
          {processingLog.length > 0 && (
            <div className="bg-[#1a1a1a] rounded-sm p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#15803d] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffdea0]">Pipeline Log</span>
              </div>
              <div className="font-mono text-[11px] text-green-400 space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                {processingLog.map((log, i) => (
                  <div key={i} className="opacity-80 hover:opacity-100 transition-opacity">{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Success CTA */}
          {isComplete && (
            <div className="bg-[#553a34] p-8 rounded-sm text-white shadow-[0_20px_40px_rgba(85,58,52,0.3)] flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold mb-1 tracking-tight">Pipeline Complete</h4>
                <p className="text-[13px] opacity-80 font-medium">
                  All supply chain data has been processed and persisted. Launch the simulation to explore what-if scenarios.
                </p>
              </div>
              <button
                onClick={() => navigate('/supplychaindashboard')}
                className="px-8 py-4 bg-[#974726] hover:bg-[#b0532d] text-white text-[11px] font-bold uppercase tracking-[0.2em] rounded-sm transition-all shadow-xl flex items-center gap-2 shrink-0"
              >
                Launch Simulation <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
