import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Sparkles, Send, Loader2 } from 'lucide-react';

export interface AIRecommendation {
  action: string;
  reasoning: string;
  metrics?: { label: string; value: string; trend: 'up'|'down'|'neutral' }[];
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
      The user will give you a natural language command. You can do three things:
      1. Apply tariffs/subsidies: Extract country_code (e.g. CN, IN-TN) and multiplier (1.0 is neutral, >1.0 is tax, <1.0 is subsidy) into tax_updates.
      2. Swap a supplier: If they ask to swap a supplier, look at the active suppliers and alternatives, and populate the node_swap object with target_node_id and alternative_node_id.
      3. Undo/Revert: If they ask to undo, go back, or reverse, set revert_timeline to true.
      
      Context data:
      Active Suppliers: ${activeSuppliers}
      Available Alternatives: ${JSON.stringify(contextAlternatives)}
      
      Write a short, friendly response in 'ai_response' explaining what you did, without sounding like a robot. Speak in first person.
      Recommend 1 or 2 next actions in 'recommended_actions'. IMPORTANT: 'recommended_actions' strings MUST be strictly formatted commands. Provide a 1-sentence 'reasoning' and extract 2 hard numbers into the 'metrics' array with label, value, and trend ('up' or 'down'). DO NOT ask questions.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: cmdText,
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
      setAiText("Error parsing command. Did you use a supported region? " + err?.message);
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
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-slate-900/90 border border-slate-700/50 backdrop-blur-md rounded-2xl shadow-2xl z-50 overflow-hidden">

      {/* Brief AI Confirmation Toast */}
      {aiText && (
        <div className="px-4 py-2.5 border-b border-slate-800 bg-gradient-to-r from-blue-900/20 to-purple-900/20 flex items-center gap-2">
          <Sparkles size={13} className="text-purple-400 shrink-0" />
          <p className="text-[11px] text-slate-300 leading-snug">{aiText}</p>
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="flex relative items-center p-2">
        <div className="absolute left-6">
          <Sparkles size={16} className="text-blue-500" />
        </div>
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Ask Gemini to simulate a policy change (e.g. 'Tax China by 50%')..."
          className="w-full bg-transparent border-none text-slate-200 text-sm pl-12 pr-14 py-3 placeholder:text-slate-600 focus:outline-none focus:ring-0"
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="absolute right-4 p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-blue-600/20 disabled:hover:text-blue-400 flex items-center justify-center"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
};
