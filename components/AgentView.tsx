import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Loader2, Send, Camera, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { AgentResponse, AgentQuestion } from '../types';
import Uploader from './Uploader';

interface AgentViewProps {
  initialResponse: AgentResponse | null;
  onReply: (text?: string, file?: File) => Promise<AgentResponse>;
  onComplete: (record: any) => void;
  isProcessing: boolean;
}

const AgentView: React.FC<AgentViewProps> = ({ initialResponse, onReply, onComplete, isProcessing }) => {
  const [history, setHistory] = useState<AgentResponse[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<AgentQuestion | null>(null);
  const [inputText, setInputText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]); // Reusing Uploader structure
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialResponse) {
      setHistory([initialResponse]);
      handleResponseLogic(initialResponse);
    }
  }, [initialResponse]);

  // Scroll to bottom on updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isProcessing]);

  const handleResponseLogic = (response: AgentResponse) => {
    if (response.status === 'complete' && response.record) {
      // Small delay to let user see the "Complete" log
      setTimeout(() => {
        onComplete(response.record);
      }, 1500);
    } else if (response.status === 'clarification_needed' && response.question) {
      setCurrentQuestion(response.question);
    }
  };

  const submitReply = async (text?: string, file?: File) => {
    setCurrentQuestion(null);
    setInputText('');
    setUploadedFiles([]);

    // Add a temporary "thinking" state visual if needed, but App.tsx isProcessing handles the spinner
    try {
      const newResponse = await onReply(text, file);
      setHistory(prev => [...prev, newResponse]);
      handleResponseLogic(newResponse);
    } catch (error) {
      console.error("Reply failed", error);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() || uploadedFiles.length > 0) {
      const file = uploadedFiles.length > 0 ? uploadedFiles[0].file : undefined;
      submitReply(inputText, file);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      
      {/* Terminal / Log View */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-[400px] max-h-[600px]">
        
        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
          <Terminal size={14} className="text-zinc-500" />
          <span className="text-xs font-mono text-zinc-400">AGI_RESEARCH_PROCESS_V3.1</span>
          {isProcessing && <Loader2 size={12} className="ml-auto animate-spin text-green-500" />}
        </div>

        {/* Logs Area */}
        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6 font-mono text-sm">
          {history.length === 0 && isProcessing && (
             <div className="text-zinc-500 animate-pulse">Initializing agent session...</div>
          )}

          {history.map((step, idx) => (
            <div key={idx} className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-500">
              {step.logs.map((log, logIdx) => (
                <div key={logIdx} className="flex gap-3 items-start">
                  <span className="text-zinc-600 select-none">sw@gemini:~$</span>
                  <span className="text-green-400/90">{log}</span>
                </div>
              ))}
              
              {step.status === 'clarification_needed' && (
                 <div className="pt-2 text-amber-400 flex gap-2 items-center">
                    <span>⚠ INTERVENTION REQUIRED</span>
                 </div>
              )}
               {step.status === 'complete' && (
                 <div className="pt-2 text-blue-400 flex gap-2 items-center">
                    <CheckCircle2 size={16} />
                    <span>IDENTIFICATION COMPLETE. PREPARING REPORT...</span>
                 </div>
              )}
            </div>
          ))}
          
          {isProcessing && history.length > 0 && (
             <div className="flex gap-2 items-center text-zinc-500 pl-2">
                <span className="w-2 h-4 bg-zinc-500 animate-pulse"></span>
             </div>
          )}
        </div>

        {/* Interaction Area (Footer) */}
        <div className="border-t border-zinc-800 bg-zinc-900/50 p-4 min-h-[100px] flex flex-col justify-end transition-all">
          
          {isProcessing ? (
            <div className="text-center text-zinc-500 text-sm py-4">
              Agent is researching...
            </div>
          ) : currentQuestion ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              
              <div className="flex items-start gap-3">
                 <div className="bg-white/10 p-2 rounded-full text-white">
                    {currentQuestion.type === 'image_request' ? <Camera size={20} /> : <Terminal size={20} />}
                 </div>
                 <div className="flex-1">
                    <h3 className="font-semibold text-white">{currentQuestion.text}</h3>
                    {currentQuestion.type === 'image_request' && (
                      <p className="text-xs text-zinc-400 mt-1">Please upload a photo to continue.</p>
                    )}
                 </div>
              </div>

              {/* Options for Choice */}
              {currentQuestion.type === 'choice' && currentQuestion.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {currentQuestion.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => submitReply(opt.value)}
                      className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-left text-sm transition-colors text-zinc-200"
                    >
                      <span className="block font-medium text-white">{opt.label}</span>
                      <span className="text-xs text-zinc-500">{opt.value}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Text Input / Image Upload */}
              {(currentQuestion.type === 'text' || currentQuestion.type === 'image_request') && (
                <div className="space-y-3">
                   {currentQuestion.allowImageUpload && (
                     <div className="border border-zinc-700 rounded-lg p-2 bg-black/20">
                        <Uploader files={uploadedFiles} setFiles={setUploadedFiles} isAnalyzing={false} />
                     </div>
                   )}
                   
                   <form onSubmit={handleTextSubmit} className="flex gap-2">
                      <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type your answer here..."
                        autoFocus
                        className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-all"
                      />
                      <button 
                        type="submit"
                        disabled={!inputText && uploadedFiles.length === 0}
                        className="bg-white text-black px-6 rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send size={18} />
                      </button>
                   </form>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-zinc-600 text-xs py-2">
               Session Active. Waiting for agent...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentView;
