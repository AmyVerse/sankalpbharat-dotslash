import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Sparkles, Send, Loader2 } from 'lucide-react';

export interface AIRecommendation {
  action: string;
  reasoning: string;
  metrics?: { label: string; value: string; trend: 'up' | 'down' | 'neutral' }[];
}

export interface AICommandResult {
  tax_updates?: { country_code: string; multiplier: number }[];
  node_swap?: { target_node_id: string; alternative_node_id: string } | null;
  revert_timeline?: boolean;
  ai_response: string;
  recommended_actions: AIRecommendation[];
  prompt?: string;
}

interface AICommandBarProps {
  onCommand: (result: AICommandResult) => void;
  contextNodes?: any[];
  contextAlternatives?: any;
  autoRunPrompt?: string;
  onAutoRunClear?: () => void;
}

export const AICommandBar: React.FC<AICommandBarProps> = ({
  onCommand,
  contextNodes = [],
  contextAlternatives = {},
  autoRunPrompt,
  onAutoRunClear
}) => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  const executeCommand = async (cmdText: string) => {
    if (!cmdText.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey === "INSERT_YOUR_GEMINI_API_KEY_HERE") {
        setAiText("ERROR: Please set your VITE_GEMINI_API_KEY in .env.local first!");
        setIsLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          tax_updates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                country_code: { type: Type.STRING },
                multiplier: { type: Type.NUMBER }
              }
            }
          },
          node_swap: {
            type: Type.OBJECT,
            properties: {
              target_node_id: { type: Type.STRING },
              alternative_node_id: { type: Type.STRING }
            }
          },
          revert_timeline: {
            type: Type.BOOLEAN,
            description: "Set to true if user wants to undo, go back, or revert the last action"
          },
          ai_response: { type: Type.STRING },
          recommended_actions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                metrics: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      value: { type: Type.STRING },
                      trend: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const activeSuppliers = contextNodes.filter(n => n.type === 'supplier').map(n => `{id: "${n.id}", label: "${n.data.label}"}`).join(', ');

      const systemInstruction = `You are the AI Co-Pilot for a Supply Chain Visualization Dashboard. 
      The user will give you a natural language command (e.g., "Add a heavy 50% tariff to Chinese imports" or "Tax the US to 2.5x"). 
      Extract the country_code (e.g. EU, CN, US, CL, TW, BR, AU, CA) and the multiplier (from 0.5 to 2.5, where 1.0 is neutral, >1.0 is tax, <1.0 is subsidy).
      You must also recommend 1-2 actions based on their decision. For example, if they tax China heavily, recommend swapping Chinese suppliers for Taiwanese or US suppliers.
      Write a short, professional response in 'ai_response' confirming what you did. Use authoritative, high-trust language.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: responseSchema
        }
      });

      if (response.text) {
        const result: AICommandResult = JSON.parse(response.text);
        result.prompt = cmdText;
        setAiText(result.ai_response);
        setRecommendations(result.recommended_actions || []);
        onCommand(result);
        setPrompt(""); // clear input
      }

    } catch (err: any) {
      console.error(err);
      setAiText("Error parsing command. " + err?.message);
    } finally {
      setIsLoading(false);
      if (onAutoRunClear) onAutoRunClear();
    }
  };

  React.useEffect(() => {
    if (autoRunPrompt) {
      setPrompt(autoRunPrompt);
      executeCommand(autoRunPrompt);
    }
  }, [autoRunPrompt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(prompt);
  };

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-white border border-[#dac2b6] border-opacity-60 rounded-md shadow-2xl z-50 overflow-hidden text-[#553a34] transition-all">

      {/* Brief AI Confirmation Toast - Archive Feel */}
      {aiText && (
        <div className="px-6 py-4 border-b border-[#dac2b6] border-opacity-30 bg-[#fcf9f4] flex items-center gap-3">
          <Sparkles size={14} className="text-[#974726] shrink-0" />
          <p className="text-[11px] text-[#553a34] font-medium leading-normal italic">{aiText}</p>
        </div>
      )}

      {/* Input Bar - Technical Notebook Style */}
      <form onSubmit={handleSubmit} className="flex relative items-center p-3">
        <div className="absolute left-8">
          <Sparkles size={18} className="text-[#974726]" />
        </div>
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Issue tactical directive (e.g. 'Tax China by 50%' or 'Subsidize EU routes')..."
          className="w-full bg-transparent border-none text-[#553a34] font-bold text-sm pl-16 pr-20 py-5 placeholder:text-[#a3948e] focus:outline-none focus:ring-0"
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="absolute right-6 px-5 py-3 bg-[#553a34] text-white hover:bg-[#3a2824] rounded-sm text-[10px] font-bold transition-all disabled:opacity-30 uppercase tracking-[0.2em] flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Initiate <Send size={14} /></>}
        </button>
      </form>
    </div>
  );
};

