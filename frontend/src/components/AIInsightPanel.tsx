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

  if (!aiResponse && !impactSummary && recommendations.length === 0 && !isSuggesting) return null;

  const isPositiveDelta = impactSummary && impactSummary.delta > 0;

  return (
    <div className="absolute top-24 right-10 w-80 bg-white border border-[#dac2b6] border-opacity-40 rounded-md shadow-2xl z-20 text-[#553a34] font-sans overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300">

      {/* AI Response Header - Archive Style */}
      {aiResponse && (
        <div className="p-5 bg-[#ebe8e3] border-b border-[#dac2b6] border-opacity-30 flex gap-3 items-start">
          <Sparkles size={14} className="text-[#974726] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[#553a34] font-medium leading-relaxed italic">{aiResponse}</p>
        </div>
      )}

      {/* Impact Summary Section */}
      {impactSummary && (
        <div className="p-5 border-b border-[#dac2b6] border-opacity-20 bg-white">
          <div className="flex items-center gap-2 mb-4 border-b border-[#dac2b6] border-opacity-20 pb-3">
            <Zap size={14} className="text-[#974726]" />
            <span className="text-[9px] uppercase font-bold text-[#877369] tracking-[0.2em]">Impact Assessment</span>
          </div>

          {/* Cost Delta Bar - Vivid Success/Error */}
          <div className={`flex items-center justify-between p-4 rounded-md mb-4 border-2 transition-all ${isPositiveDelta
            ? 'bg-[#b91c1c]/5 border-[#b91c1c]/30'
            : 'bg-[#15803d]/5 border-[#15803d]/30'
            }`}>
            <div className="flex flex-col">
            <span className="text-[9px] text-[#877369] uppercase font-bold tracking-widest">Estimated Policy Impact</span>
            <span className={`text-lg font-bold newsreader ${isPositiveDelta ? 'text-[#b91c1c]' : 'text-[#15803d]'}`}>
              {impactSummary.delta >= 0 ? '+' : ''}₹{impactSummary.delta.toLocaleString()}
            </span>
          </div>
          {isPositiveDelta
            ? <TrendingUp size={24} className="text-[#b91c1c] opacity-40" />
            : <TrendingDown size={24} className="text-[#15803d] opacity-40" />
          }
        </div>

        {/* Before/After - Technical Comparison */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 bg-[#fcf9f4] border border-[#dac2b6] border-opacity-40 rounded-sm p-3 text-center">
            <div className="text-[8px] text-[#877369] uppercase font-bold mb-1">Baseline</div>
            <div className="text-[10px] font-bold text-[#877369] newsreader">₹{impactSummary.before.toLocaleString()}</div>
          </div>
          <div className="text-[#dac2b6] font-bold">»</div>
          <div className="flex-1 bg-[#fcf9f4] border border-[#dac2b6] border-opacity-40 rounded-sm p-3 text-center">
            <div className="text-[8px] text-[#877369] uppercase font-bold mb-1">Simulated</div>
            <div className={`text-[10px] font-bold newsreader ${isPositiveDelta ? 'text-[#b91c1c]' : 'text-[#15803d]'}`}>
              ₹{impactSummary.after.toLocaleString()}
            </div>
          </div>
        </div>

          {/* Bullet Points - Tactical Notations */}
          <div className="space-y-3 pt-2">
            {impactSummary.bullets.map((bullet, i) => (
              <div key={i} className="flex gap-3 items-start text-[10px] text-[#553a34] leading-snug font-medium">
                <AlertCircle size={12} className="text-[#974726] mt-0.5 shrink-0" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proactive Suggestion Loader */}
      {isSuggesting && recommendations.length === 0 && (
        <div className="p-8 flex flex-col items-center justify-center text-center bg-[#fcf9f4]">
          <Loader2 size={24} className="text-[#974726] animate-spin mb-3" />
          <p className="text-[10px] text-[#877369] font-bold uppercase tracking-widest">Searching for verified alternatives...</p>
        </div>
      )}

      {/* Suggested Actions - High Trust Labels */}
      {(recommendations.length > 0 || (isSuggesting && recommendations.length > 0)) && (
        <div className="p-5 bg-[#fcf9f4]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-[#553d00]" />
              <span className="text-[9px] uppercase font-bold text-[#877369] tracking-[0.15em]">Mitigation Intelligence</span>
            </div>
            {isSuggesting && <Loader2 size={12} className="text-[#974726] animate-spin" />}
          </div>
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div 
                key={i} 
                className={`flex flex-col gap-2 bg-white border border-[#dac2b6] border-opacity-40 rounded-sm p-4 text-[#553a34] transition-all cursor-pointer hover:border-[#974726] group ${expandedRecIndex === i ? 'ring-1 ring-[#974726]/20' : ''}`}
                onClick={() => {
                  setExpandedRecIndex(expandedRecIndex === i ? null : i);
                  if (onSuggestionClick) onSuggestionClick(rec.action);
                }}
              >
                <div className="flex gap-3 items-start">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 transition-colors ${expandedRecIndex === i ? 'bg-[#974726]' : 'bg-[#dac2b6]'}`} />
                  <div className="text-[11px] font-bold leading-snug newsreader">{rec.action}</div>
                </div>

                {expandedRecIndex === i && (
                  <div className="mt-2 pl-5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-[10px] text-[#877369] leading-relaxed italic">{rec.reasoning}</p>
                    
                    {rec.metrics && rec.metrics.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {rec.metrics.map((m, mi) => (
                          <div key={mi} className="bg-[#fcf9f4] border border-[#dac2b6] border-opacity-30 px-2 py-1 rounded-sm flex items-center gap-1.5">
                            <span className="text-[8px] text-[#877369] font-bold uppercase">{m.label}</span>
                            <span className={`text-[10px] font-bold newsreader ${m.trend === 'down' ? 'text-[#15803d]' : m.trend === 'up' ? 'text-[#b91c1c]' : 'text-[#553a34]'}`}>
                              {m.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
