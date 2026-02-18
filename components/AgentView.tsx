import React, { useEffect, useState, useRef } from 'react';
import { Loader2, Send, Camera, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { AgentResponse, AgentQuestion, UploadedFile } from '../types';
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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialResponse) {
      setHistory([initialResponse]);
      handleResponseLogic(initialResponse);
    }
  }, [initialResponse]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isProcessing]);

  const handleResponseLogic = (response: AgentResponse) => {
    if (response.status === 'complete' && response.record) {
      setTimeout(() => onComplete(response.record), 1200);
    } else if (response.status === 'clarification_needed' && response.question) {
      setCurrentQuestion(response.question);
    }
  };

  const submitReply = async (text?: string, file?: File) => {
    setCurrentQuestion(null);
    setInputText('');
    setUploadedFiles([]);

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
    <div className="h-full flex flex-col">

      {/* Header bar */}
      <div className="px-4 py-2.5 border-b border-[#1a1a1a] flex items-center justify-between bg-[#050505] shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-green-400 animate-pulse' : history.some(h => h.status === 'complete') ? 'bg-blue-400' : 'bg-[#555]'}`} />
          <span className="text-[12px] font-medium text-[#888]">Research Agent</span>
        </div>
        {isProcessing && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#555] font-mono">analyzing</span>
            <Loader2 size={11} className="animate-spin text-[#555]" />
          </div>
        )}
      </div>

      {/* Log entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-momentum">

        {history.length === 0 && isProcessing && (
          <div className="flex items-center gap-3 py-12 justify-center">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#555] typing-dot" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#555] typing-dot" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#555] typing-dot" />
            </div>
            <span className="text-[12px] text-[#555]">Initializing...</span>
          </div>
        )}

        {history.map((step, idx) => (
          <div key={idx} className="space-y-1.5 animate-fade-in">
            {step.logs.map((log, logIdx) => (
              <div key={logIdx} className="flex gap-2 items-start" style={{ animationDelay: `${logIdx * 50}ms` }}>
                <ChevronRight size={11} className="text-[#333] mt-0.5 shrink-0" />
                <span className="text-[12px] leading-relaxed text-[#999]">{log}</span>
              </div>
            ))}

            {step.status === 'clarification_needed' && (
              <div className="flex items-center gap-2 pt-1.5 pl-0.5">
                <AlertTriangle size={12} className="text-amber-500/80" />
                <span className="text-[11px] font-medium text-amber-500/80">Input needed</span>
              </div>
            )}

            {step.status === 'complete' && (
              <div className="flex items-center gap-2 pt-1.5 pl-0.5">
                <CheckCircle2 size={12} className="text-blue-400" />
                <span className="text-[11px] font-medium text-blue-400">Identification complete</span>
              </div>
            )}

            {step.status === 'error' && step.error && (
              <div className="mt-2 p-2.5 bg-red-950/20 border border-red-900/30 rounded-lg text-[11px] text-red-300">
                {step.error}
              </div>
            )}

            {idx < history.length - 1 && (
              <div className="border-t border-[#111] my-2" />
            )}
          </div>
        ))}

        {/* Thinking indicator */}
        {isProcessing && history.length > 0 && (
          <div className="flex items-center gap-2 py-2 animate-fade-in">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#555] typing-dot" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#555] typing-dot" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#555] typing-dot" />
            </div>
          </div>
        )}
      </div>

      {/* Interaction footer */}
      <div className="border-t border-[#1a1a1a] bg-[#050505] p-3 safe-bottom shrink-0">

        {isProcessing ? (
          <div className="text-center py-2">
            <span className="text-[11px] text-[#555]">Agent is researching...</span>
          </div>
        ) : currentQuestion ? (
          <div className="space-y-2.5 animate-slide-up">

            {/* Question text */}
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                {currentQuestion.type === 'image_request' ? <Camera size={12} className="text-[#888]" /> : <AlertTriangle size={12} className="text-amber-500/70" />}
              </div>
              <div>
                <p className="text-[13px] text-white font-medium leading-snug">{currentQuestion.text}</p>
                {currentQuestion.type === 'image_request' && (
                  <p className="text-[10px] text-[#555] mt-0.5">Upload a photo to continue</p>
                )}
              </div>
            </div>

            {/* Choice options */}
            {currentQuestion.type === 'choice' && currentQuestion.options && (
              <div className="space-y-1.5">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => submitReply(opt.value)}
                    className="w-full px-3.5 py-2.5 bg-[#111] border border-[#222] rounded-xl text-left transition-all press-scale"
                  >
                    <span className="text-[13px] text-white font-medium">{opt.label}</span>
                    {opt.value !== opt.label && (
                      <span className="block text-[10px] text-[#666] mt-0.5">{opt.value}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Text + image input */}
            {(currentQuestion.type === 'text' || currentQuestion.type === 'image_request') && (
              <div className="space-y-2.5">
                {(currentQuestion.allowImageUpload || currentQuestion.type === 'image_request') && (
                  <Uploader files={uploadedFiles} setFiles={setUploadedFiles} isAnalyzing={false} compact />
                )}

                <form onSubmit={handleTextSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={currentQuestion.type === 'image_request' ? "Add a note..." : "Type your answer..."}
                    autoFocus
                    className="flex-1 bg-black border border-[#222] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-[#444] focus:outline-none focus:border-[#444] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() && uploadedFiles.length === 0}
                    className="px-3.5 bg-white text-black rounded-xl font-medium disabled:opacity-30 transition-all press-scale"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2">
            <span className="text-[10px] text-[#444]">Waiting for agent...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentView;
