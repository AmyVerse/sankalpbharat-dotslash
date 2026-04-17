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
    <div className="absolute top-20 right-4 w-72 bg-slate-900/95 border border-slate-700/50 backdrop-blur-md rounded-xl shadow-2xl z-10 text-white font-sans overflow-hidden">

      {/* AI Response Header */}
      {aiResponse && (
        <div className="p-3 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-b border-slate-700/50 flex gap-2 items-start">
          <Sparkles size={13} className="text-purple-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-200 leading-relaxed">{aiResponse}</p>
        </div>
      )}

      {/* Impact Summary */}
      {impactSummary && (
        <div className="p-3 border-b border-slate-800">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Zap size={12} className="text-yellow-400" />
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">Impact Summary</span>
          </div>

          {/* Cost Delta Bar */}
          <div className={`flex items-center justify-between p-2 rounded-lg mb-2.5 border ${isPositiveDelta
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-bold">Estimated Tax Impact</span>
              <span className={`text-base font-mono font-bold ${isPositiveDelta ? 'text-red-400' : 'text-emerald-400'}`}>
                {impactSummary.delta >= 0 ? '+' : ''}₹{impactSummary.delta.toLocaleString()}
              </span>
            </div>
            {isPositiveDelta
              ? <TrendingUp size={20} className="text-red-400/50" />
              : <TrendingDown size={20} className="text-emerald-400/50" />
            }
          </div>

          {/* Before/After */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 bg-slate-800/60 rounded p-2 text-center">
              <div className="text-[9px] text-slate-500 uppercase font-bold">Before</div>
              <div className="text-[11px] font-mono text-slate-400">₹{impactSummary.before.toLocaleString()}</div>
            </div>
            <div className="flex items-center text-slate-600 text-xs">→</div>
            <div className="flex-1 bg-slate-800/60 rounded p-2 text-center">
              <div className="text-[9px] text-slate-500 uppercase font-bold">After</div>
              <div className={`text-[11px] font-mono font-bold ${isPositiveDelta ? 'text-red-300' : 'text-emerald-300'}`}>
                ₹{impactSummary.after.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Bullet Points */}
          <div className="space-y-1.5">
            {impactSummary.bullets.map((bullet, i) => (
              <div key={i} className="flex gap-2 items-start text-[10px] text-slate-300 leading-snug">
                <AlertCircle size={10} className="text-blue-400 mt-0.5 shrink-0" />
                {bullet}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Actions */}
      {(recommendations.length > 0 || isSuggesting) && (
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={12} className="text-yellow-400" />
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">Suggested Actions</span>
            {isSuggesting && <Loader2 size={10} className="animate-spin text-slate-500 ml-auto" />}
          </div>
          {isSuggesting && recommendations.length === 0 ? (
            <div className="space-y-2 animate-pulse mt-3">
              <div className="h-6 bg-slate-800/80 rounded" />
              <div className="h-6 bg-slate-800/80 rounded w-5/6" />
            </div>
          ) : (
            <div className="space-y-2">
              {recommendations.map((rec, i) => {
                const isExpanded = expandedRecIndex === i;
                return (
                  <div key={i} className="flex flex-col bg-slate-800/60 border border-slate-700/40 rounded-lg overflow-hidden transition-all">
                    <button 
                      onClick={() => setExpandedRecIndex(isExpanded ? null : i)}
                      disabled={!onSuggestionClick}
                      className="w-full text-left flex gap-2 items-center p-2 hover:bg-slate-700/40 cursor-pointer"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-[10px] text-slate-300 leading-snug">{rec.action}</span>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-3 pt-1 border-t border-slate-700/40 bg-slate-800/40">
                        <p className="text-[10px] text-slate-400 mb-2 italic leading-relaxed">"{rec.reasoning}"</p>
                        
                        {rec.metrics && rec.metrics.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 mb-3 mt-2">
                            {rec.metrics.map((m, mIdx) => (
                              <div key={mIdx} className="bg-slate-900/60 rounded border border-slate-700/30 p-1.5 flex flex-col items-center justify-center">
                                <span className="text-[8.5px] text-slate-500 uppercase font-bold text-center leading-tight tracking-wider">{m.label}</span>
                                <span className={`text-[11px] font-mono font-bold mt-0.5 ${
                                  m.trend === 'down' ? 'text-emerald-400' :
                                  m.trend === 'up' ? 'text-red-400' : 'text-slate-300'
                                }`}>{m.trend === 'down' ? '↓' : m.trend === 'up' ? '↑' : ''} {m.value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => { setExpandedRecIndex(null); }}
                            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[9px] text-slate-300 font-bold"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => {
                               setExpandedRecIndex(null);
                               if (onSuggestionClick) onSuggestionClick(rec.action);
                            }}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-[9px] text-white font-bold"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
