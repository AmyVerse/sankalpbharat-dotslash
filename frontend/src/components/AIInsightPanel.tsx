import React, { useState } from 'react';
import { Sparkles, Lightbulb, TrendingUp, TrendingDown, AlertCircle, Zap, Loader2 } from 'lucide-react';
import type { AIRecommendation } from './AICommandBar';

export interface ImpactSummary {
  bullets: string[];
  delta: number;
  before: number;
  after: number;
}

interface AIInsightPanelProps {
  aiResponse: string;
  impactSummary: ImpactSummary | null;
  recommendations: AIRecommendation[];
  isSuggesting?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
}

export const AIInsightPanel: React.FC<AIInsightPanelProps> = ({
  aiResponse,
  impactSummary,
  recommendations,
  isSuggesting,
  onSuggestionClick
}) => {
  const [expandedRecIndex, setExpandedRecIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'impact' | 'suggestions'>(impactSummary ? 'impact' : 'suggestions');

  React.useEffect(() => {
    if (impactSummary) {
      setActiveTab('impact');
    } else {
      setActiveTab('suggestions');
    }
  }, [impactSummary]);

  if (!aiResponse && !impactSummary && recommendations.length === 0 && !isSuggesting) return null;

  const isPositiveDelta = impactSummary && impactSummary.delta > 0;

  return (
    <div className="absolute top-0 right-10 bottom-0 w-80 bg-white border border-[#dac2b6] border-opacity-40 rounded-t-md shadow-2xl z-20 text-[#553a34] font-sans flex flex-col animate-in slide-in-from-right-4 fade-in duration-300">

      {/* Global AI Response Header */}
      {aiResponse && (
        <div className="p-4 bg-[#ebe8e3] border-b border-[#dac2b6] border-opacity-40 flex gap-3 items-start shrink-0">
          <p className="text-[11px] text-[#553a34] font-bold leading-relaxed italic">{aiResponse}</p>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex border-b border-[#dac2b6] border-opacity-30 bg-[#fcf9f4] shrink-0">
         {impactSummary && (
           <button onClick={() => setActiveTab('impact')} className={`flex-1 py-3 px-2 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors ${activeTab === 'impact' ? 'bg-white text-[#974726] border-b-[3px] border-[#974726]' : 'text-[#877369] hover:bg-[#dac2b6]/20 border-b-[3px] border-transparent'}`}>
             Impact Assessment
           </button>
         )}
         <button onClick={() => setActiveTab('suggestions')} className={`flex-1 flex gap-2 justify-center items-center py-3 px-2 text-[9px] font-bold uppercase tracking-[0.15em] transition-colors ${activeTab === 'suggestions' ? 'bg-white text-[#974726] border-b-[3px] border-[#974726]' : 'text-[#877369] hover:bg-[#dac2b6]/20 border-b-[3px] border-transparent'}`}>
           Recommendations
           {isSuggesting && <Loader2 size={12} className="animate-spin text-[#974726]" />}
         </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        
        {/* IMPACT TAB SECTION */}
        {activeTab === 'impact' && impactSummary && (
          <div className="animate-in fade-in duration-200">
            <div className="p-5 bg-white">
              {/* Cost Delta Bar - Vivid Success/Error */}
                <div className={`flex items-center justify-between p-4 rounded-md mb-5 border-2 transition-all ${isPositiveDelta
                  ? 'bg-[#b91c1c]/5 border-[#b91c1c]/30'
                  : 'bg-[#15803d]/5 border-[#15803d]/30'
                  }`}>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#877369] uppercase font-bold tracking-widest mb-1">Estimated Policy Impact</span>
                    <span className={`text-xl font-bold newsreader ${isPositiveDelta ? 'text-[#b91c1c]' : 'text-[#15803d]'}`}>
                      {impactSummary.delta >= 0 ? '+' : ''}₹{impactSummary.delta.toLocaleString()}
                    </span>
                  </div>
                  {isPositiveDelta
                    ? <TrendingUp size={28} className="text-[#b91c1c] opacity-40" />
                    : <TrendingDown size={28} className="text-[#15803d] opacity-40" />
                  }
                </div>

                {/* Before/After - Technical Comparison */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 bg-[#fcf9f4] border border-[#dac2b6] border-opacity-40 rounded-sm p-3 text-center">
                    <div className="text-[8px] text-[#877369] uppercase font-bold mb-1 tracking-wider">Baseline</div>
                    <div className="text-[12px] font-bold text-[#877369] newsreader">₹{impactSummary.before.toLocaleString()}</div>
                  </div>
                  <div className="text-[#dac2b6] font-bold">»</div>
                  <div className="flex-1 bg-[#fcf9f4] border border-[#dac2b6] border-opacity-40 rounded-sm p-3 text-center">
                    <div className="text-[8px] text-[#877369] uppercase font-bold mb-1 tracking-wider">Simulated</div>
                    <div className={`text-[12px] font-bold newsreader ${isPositiveDelta ? 'text-[#b91c1c]' : 'text-[#15803d]'}`}>
                      ₹{impactSummary.after.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Bullet Points - Tactical Notations */}
                <div className="space-y-4 pt-4 border-t border-[#dac2b6] border-opacity-20">
                  <p className="text-[9px] uppercase font-bold text-[#877369] tracking-widest mb-2">Tactical Readout</p>
                  {impactSummary.bullets.map((bullet, i) => (
                    <div key={i} className="flex gap-3 items-start text-[11px] text-[#553a34] leading-relaxed font-medium">
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
          </div>
        )}

        {/* SUGGESTIONS TAB SECTION */}
        {activeTab === 'suggestions' && (
          <div className="bg-[#fcf9f4] min-h-full animate-in fade-in duration-200">
            {/* Proactive Suggestion Loader */}
            {isSuggesting && recommendations.length === 0 && (
              <div className="p-10 flex flex-col items-center justify-center text-center">
                <Loader2 size={24} className="text-[#974726] animate-spin mb-4" />
                <p className="text-[10px] text-[#877369] font-bold uppercase tracking-widest">Searching for verified alternatives...</p>
              </div>
            )}

            {/* Suggested Actions - High Trust Labels */}
            {(recommendations.length > 0 || (isSuggesting && recommendations.length > 0)) && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[9px] uppercase font-bold text-[#877369] tracking-[0.15em]">Available Intelligence</span>
                </div>
                <div className="space-y-4">
                  {recommendations.map((rec, i) => (
                    <div 
                      key={i} 
                      className={`flex flex-col gap-2 bg-white border border-[#dac2b6] border-opacity-40 rounded-sm p-4 text-[#553a34] transition-all cursor-pointer hover:border-[#974726] group shadow-sm ${expandedRecIndex === i ? 'ring-1 ring-[#974726]/30 shadow-md' : ''}`}
                      onClick={() => {
                        setExpandedRecIndex(expandedRecIndex === i ? null : i);
                      }}
                    >
                      <div className="flex gap-3 items-start">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 transition-colors ${expandedRecIndex === i ? 'bg-[#974726]' : 'bg-[#dac2b6]'}`} />
                        <div className="text-[12px] font-bold leading-snug newsreader">{rec.action}</div>
                      </div>

                      {expandedRecIndex === i && (
                        <div className="mt-3 pl-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          <p className="text-[10px] text-[#877369] leading-relaxed italic pr-2">{rec.reasoning}</p>
                          
                          {rec.metrics && rec.metrics.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {rec.metrics.map((m, mi) => (
                                <div key={mi} className="bg-[#fcf9f4] border border-[#dac2b6] border-opacity-50 px-3 py-2 rounded-sm flex flex-col justify-center text-center">
                                  <span className="text-[8px] text-[#877369] font-bold uppercase tracking-wider block mb-1">{m.label}</span>
                                  <span className={`text-[13px] font-bold tracking-tight newsreader block ${m.trend === 'down' ? 'text-[#15803d]' : m.trend === 'up' ? 'text-[#b91c1c]' : 'text-[#553a34]'}`}>
                                    {m.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <button 
                            onClick={(e) => {
                               e.stopPropagation();
                               if (onSuggestionClick) onSuggestionClick(rec.action);
                            }}
                            className="mt-2 w-full py-2.5 bg-[#974726] text-white hover:bg-[#7a391e] transition-colors rounded-sm text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 shadow-sm"
                          >
                            Execute Action
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STATIC COMPLIANCE / TAX POLICIES */}
            <div className="p-5 border-t border-[#dac2b6] border-opacity-20 mt-2 bg-[#fcf9f4]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[9px] uppercase font-bold text-[#877369] tracking-[0.15em]">Upcoming Legislation</span>
              </div>
              <div className="space-y-4">
                 
                 {/* EU Law */}
                 <div className="flex flex-col gap-2 bg-white border border-[#dac2b6] border-opacity-40 rounded-sm p-4 text-[#553a34] shadow-sm hover:border-[#974726] transition-all">
                   <div className="text-[11px] font-bold leading-snug newsreader">EU CBAM Carbon Tax</div>
                   <p className="text-[10px] text-[#877369] leading-relaxed italic pr-2">Simulates a steep 35% tariff on highly emissive imports aligning with the EU Carbon Border Adjustment Mechanism (CBAM).</p>
                   <button 
                     onClick={() => onSuggestionClick && onSuggestionClick("Enact EU CBAM Legislation: Apply a 35% tariff (1.35x multiplier) on China (CN) imports to penalize high carbon emission indexes.")}
                     className="mt-2 w-full py-2 bg-[#553a34] text-white hover:bg-[#3a2824] transition-colors rounded-sm text-[10px] font-bold tracking-widest uppercase flex items-center justify-center shadow-sm"
                   >
                     Test Law Impact
                   </button>
                 </div>

                 {/* Indian Law */}
                 <div className="flex flex-col gap-2 bg-white border border-[#dac2b6] border-opacity-40 rounded-sm p-4 text-[#553a34] shadow-sm hover:border-[#974726] transition-all">
                   <div className="text-[11px] font-bold leading-snug newsreader">India PLI Subsidy</div>
                   <p className="text-[10px] text-[#877369] leading-relaxed italic pr-2">Applies a 20% domestic subsidy to tier 1 battery manufacturing in India per the Production Linked Incentive scheme.</p>
                   <button 
                     onClick={() => onSuggestionClick && onSuggestionClick("Enact India PLI Scheme: Apply a 20% subsidy (0.80x multiplier) on domestic India (IN) manufacturing to incentivize local production.")}
                     className="mt-2 w-full py-2 bg-[#553a34] text-white hover:bg-[#3a2824] transition-colors rounded-sm text-[10px] font-bold tracking-widest uppercase flex items-center justify-center shadow-sm"
                   >
                     Test Law Impact
                   </button>
                 </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
