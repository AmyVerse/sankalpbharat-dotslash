import React from 'react';
import { Sparkles, Lightbulb } from 'lucide-react';

interface SuggestionsPanelProps {
  aiResponse: string;
  recommendations: string[];
}

export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({ aiResponse, recommendations }) => {
  if (!aiResponse && recommendations.length === 0) return null;

  return (
    <div className="absolute top-24 right-10 w-72 bg-white border border-[#dac2b6] border-opacity-60 rounded-md shadow-2xl z-20 text-[#553a34] font-sans overflow-hidden animate-fade-in">
      {/* AI Response Summary - Editorial Style */}
      {aiResponse && (
        <div className="p-5 border-b border-[#dac2b6] border-opacity-30 bg-[#ebe8e3]">
          <div className="flex items-start gap-3">
            <Sparkles size={14} className="text-[#974726] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[#553a34] font-medium leading-relaxed italic">{aiResponse}</p>
          </div>
        </div>
      )}

      {/* Recommended Actions - Archival Notation Style */}
      {recommendations.length > 0 && (
        <div className="p-5 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={14} className="text-[#553d00]" />
            <span className="text-[9px] uppercase font-bold text-[#877369] tracking-[0.2em]">Tactical Advisories</span>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex gap-3 items-start bg-[#fcf9f4] border border-[#dac2b6] border-opacity-30 rounded-md p-3 text-[11px] text-[#553a34] font-bold leading-snug">
                <div className="w-2 h-2 rounded-full bg-[#974726] mt-1 shrink-0" />
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

