import React, { useState, useEffect, useRef } from 'react';
import { Disc, Plus, Settings, User, X, Key, LogOut, ArrowLeft, Loader2 } from 'lucide-react';
import Uploader from './components/Uploader';
import VinylCard from './components/VinylCard';
import RecordForm from './components/RecordForm';
import AgentView from './components/AgentView';
import ConnectDiscogs from './components/ConnectDiscogs';
import { DiscogsAgent } from './services/geminiService';
import { DiscogsClient } from './services/discogsService';
import { useSwipeDown, useSwipeBack } from './hooks/useSwipe';
import { UploadedFile, VinylRecord, DraftRecord, AgentResponse, DiscogsProfile, AppView } from './types';

const App = () => {
  // ─── Auth State ───
  const [geminiKey, setGeminiKey] = useState('');
  const [discogsToken, setDiscogsToken] = useState('');
  const [discogsProfile, setDiscogsProfile] = useState<DiscogsProfile | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ─── View State ───
  const [view, setView] = useState<AppView>('home');

  // ─── Workflow State ───
  const [currentFiles, setCurrentFiles] = useState<UploadedFile[]>([]);
  const [draftRecord, setDraftRecord] = useState<DraftRecord | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Collection State ───
  const [savedRecords, setSavedRecords] = useState<VinylRecord[]>([]);

  // ─── Refs ───
  const agentRef = useRef<DiscogsAgent | null>(null);

  // ─── Gestures ───
  const settingsSwipe = useSwipeDown(() => setShowSettings(false));

  // ─── Init: Load from localStorage ───
  useEffect(() => {
    const storedGemini = localStorage.getItem('gemini_api_key') || '';
    const storedDiscogs = localStorage.getItem('discogs_token') || '';
    const storedProfile = localStorage.getItem('discogs_profile');
    const storedRecords = localStorage.getItem('vinyl_collection');

    if (storedGemini) setGeminiKey(storedGemini);
    if (storedDiscogs) {
      setDiscogsToken(storedDiscogs);
      if (storedProfile) {
        try { setDiscogsProfile(JSON.parse(storedProfile)); } catch {}
      } else {
        verifyDiscogsToken(storedDiscogs);
      }
    }
    if (storedRecords) {
      try { setSavedRecords(JSON.parse(storedRecords)); } catch {}
    }
  }, []);

  // ─── Persist collection ───
  useEffect(() => {
    if (savedRecords.length > 0) {
      localStorage.setItem('vinyl_collection', JSON.stringify(savedRecords));
    }
  }, [savedRecords]);

  // ─── Discogs token verification ───
  const verifyDiscogsToken = async (token: string) => {
    try {
      const client = new DiscogsClient(token);
      const identity = await client.getIdentity();
      const profile = await client.getProfile(identity.username);
      setDiscogsProfile(profile);
      localStorage.setItem('discogs_profile', JSON.stringify(profile));
    } catch {
      // Token invalid, clear it
      setDiscogsToken('');
      setDiscogsProfile(null);
      localStorage.removeItem('discogs_token');
      localStorage.removeItem('discogs_profile');
    }
  };

  // ─── Discogs connect handler ───
  const handleDiscogsConnect = (token: string, profile: DiscogsProfile) => {
    setDiscogsToken(token);
    setDiscogsProfile(profile);
    localStorage.setItem('discogs_token', token);
    localStorage.setItem('discogs_profile', JSON.stringify(profile));
    setShowConnect(false);
  };

  const handleDiscogsDisconnect = () => {
    setDiscogsToken('');
    setDiscogsProfile(null);
    localStorage.removeItem('discogs_token');
    localStorage.removeItem('discogs_profile');
  };

  // ─── Gemini key save ───
  const saveGeminiKey = (key: string) => {
    setGeminiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setShowSettings(false);
  };

  // ─── Agent: Start analysis ───
  const startAnalysis = async () => {
    if (currentFiles.length === 0) return;
    if (!geminiKey) {
      setShowSettings(true);
      return;
    }

    setIsAnalyzing(true);
    setView('agent');
    setError(null);
    setDraftRecord(null);
    setAgentResponse(null);

    try {
      agentRef.current = new DiscogsAgent(geminiKey, discogsToken || undefined);
      const rawFiles = currentFiles.map(f => f.file);
      const response = await agentRef.current.startAnalysis(rawFiles);
      setAgentResponse(response);

      if (response.status === 'error') {
        setError(response.error || "Unknown agent error");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ─── Agent: Reply ───
  const handleAgentReply = async (text?: string, file?: File) => {
    if (!agentRef.current) return { status: 'error', logs: ['Agent session lost'] } as AgentResponse;

    setIsAnalyzing(true);
    try {
      const response = await agentRef.current.replyToAgent(text, file);
      setAgentResponse(response);
      return response;
    } catch (e: any) {
      return { status: 'error', logs: ['Error: ' + e.message], error: e.message } as AgentResponse;
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ─── Agent: Complete ───
  const handleAgentComplete = (record: DraftRecord) => {
    setDraftRecord(record);
    setView('review');
  };

  // ─── Save record ───
  const handleSaveRecord = (record: VinylRecord) => {
    setSavedRecords(prev => [record, ...prev]);
    resetWorkflow();
  };

  // ─── Reset ───
  const resetWorkflow = () => {
    setDraftRecord(null);
    setCurrentFiles([]);
    setAgentResponse(null);
    setView('home');
    agentRef.current = null;
    setError(null);
  };

  // ─── Back navigation ───
  const handleBack = () => {
    if (view === 'review') {
      setView('agent');
      setDraftRecord(null);
    } else if (view === 'agent') {
      resetWorkflow();
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#ededed] selection:bg-white selection:text-black">

      {/* ═══ Navbar ═══ */}
      <nav className="sticky top-0 z-40 border-b border-[#1a1a1a] bg-black/80 backdrop-blur-xl safe-top">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">

          {/* Left: Back or Logo */}
          {view !== 'home' ? (
            <button onClick={handleBack} className="flex items-center gap-1.5 text-[#888] hover:text-white transition-colors press-scale -ml-1 py-2 pr-3">
              <ArrowLeft size={16} />
              <span className="text-xs font-medium">Back</span>
            </button>
          ) : (
            <span className="text-sm font-semibold text-white tracking-tight">discogs.iverfinne.no</span>
          )}

          {/* Right: Profile / Settings */}
          <div className="flex items-center gap-1">
            {discogsProfile ? (
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-[#111] transition-colors"
              >
                {discogsProfile.avatar_url ? (
                  <img src={discogsProfile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#222] flex items-center justify-center">
                    <User size={12} className="text-[#888]" />
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowSettings(true)}
                className="text-[#555] hover:text-white transition-colors p-2"
              >
                <Settings size={16} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ Main Content ═══ */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8 safe-bottom pb-20 scroll-momentum">

        {/* ─── Review View ─── */}
        {view === 'review' && draftRecord && (
          <div className="animate-slide-up">
            <RecordForm
              draft={draftRecord}
              images={currentFiles}
              onSave={handleSaveRecord}
              onCancel={handleBack}
              discogsToken={discogsToken || undefined}
              discogsUsername={discogsProfile?.username}
            />
          </div>
        )}

        {/* ─── Agent View ─── */}
        {view === 'agent' && !draftRecord && (
          <AgentView
            initialResponse={agentResponse}
            onReply={handleAgentReply}
            onComplete={handleAgentComplete}
            isProcessing={isAnalyzing}
          />
        )}

        {/* ─── Home View ─── */}
        {view === 'home' && (
          <div className="space-y-8 animate-fade-in">

            {/* Discogs connect prompt */}
            {!discogsToken && (
              <button
                onClick={() => setShowConnect(true)}
                className="w-full p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl flex items-center gap-4 hover:border-[#333] transition-all press-scale group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-[#222] flex items-center justify-center shrink-0">
                  <Disc size={18} className="text-[#555] group-hover:text-white transition-colors" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Connect Discogs</p>
                  <p className="text-xs text-[#555] truncate">Link your account to manage your collection</p>
                </div>
                <div className="text-xs text-[#333] font-medium px-2 py-1 rounded-md border border-[#222]">
                  Connect
                </div>
              </button>
            )}

            {/* Upload section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-white flex items-center gap-2">
                  <Plus size={14} className="text-[#666]" />
                  Identify Record
                </h2>
                {!geminiKey && (
                  <button onClick={() => setShowSettings(true)} className="text-[10px] text-amber-500/70 flex items-center gap-1">
                    <Key size={10} /> API key needed
                  </button>
                )}
              </div>

              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5">
                <Uploader files={currentFiles} setFiles={setCurrentFiles} isAnalyzing={isAnalyzing} />

                {error && (
                  <div className="mt-4 p-3 bg-red-950/20 border border-red-900/20 rounded-xl text-red-300 text-xs">
                    {error}
                  </div>
                )}

                {currentFiles.length > 0 && (
                  <button
                    onClick={startAnalysis}
                    disabled={isAnalyzing}
                    className="mt-5 w-full py-3 bg-white text-black font-semibold text-sm rounded-xl hover:bg-[#e0e0e0] transition-colors press-scale flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
                    ) : (
                      'Identify Record'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Collection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-white">Collection</h2>
                <span className="text-[11px] text-[#555] font-mono">{savedRecords.length}</span>
              </div>

              {savedRecords.length > 0 ? (
                <div className="space-y-2">
                  {savedRecords.map((record) => (
                    <VinylCard key={record.id} record={record} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-[#1a1a1a] rounded-2xl">
                  <Disc size={24} className="mx-auto mb-3 text-[#222]" />
                  <p className="text-xs text-[#444]">No records yet</p>
                  <p className="text-[10px] text-[#333] mt-1">Upload photos to identify your vinyl</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ═══ Connect Discogs Sheet ═══ */}
      {showConnect && (
        <ConnectDiscogs
          onConnect={handleDiscogsConnect}
          onSkip={() => setShowConnect(false)}
          onClose={() => setShowConnect(false)}
        />
      )}

      {/* ═══ Settings Modal ═══ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in sheet-overlay" onClick={() => setShowSettings(false)}>
          <div
            className="w-full max-w-md bg-[#0a0a0a] border border-[#1a1a1a] sm:rounded-2xl rounded-t-2xl overflow-hidden animate-sheet-up shadow-2xl sheet-content"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={settingsSwipe.onTouchStart}
            onTouchMove={settingsSwipe.onTouchMove}
            onTouchEnd={settingsSwipe.onTouchEnd}
          >

            {/* Drag handle */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 bg-[#333] rounded-full" />
            </div>

            <div className="px-6 py-5 space-y-6">

              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-[#555] hover:text-white transition-colors p-1">
                  <X size={18} />
                </button>
              </div>

              {/* Discogs Account */}
              <div className="space-y-3">
                <label className="text-[11px] font-medium text-[#666] uppercase tracking-wider">Discogs Account</label>

                {discogsProfile ? (
                  <div className="flex items-center justify-between p-3 bg-[#111] border border-[#1a1a1a] rounded-xl">
                    <div className="flex items-center gap-3">
                      {discogsProfile.avatar_url ? (
                        <img src={discogsProfile.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center">
                          <User size={14} className="text-[#666]" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-white font-medium">@{discogsProfile.username}</p>
                        <p className="text-[10px] text-[#666]">{discogsProfile.num_collection} in collection</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDiscogsDisconnect}
                      className="text-xs text-[#555] hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <LogOut size={12} /> Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowSettings(false); setShowConnect(true); }}
                    className="w-full p-3 bg-[#111] border border-[#1a1a1a] rounded-xl text-sm text-[#888] hover:text-white hover:border-[#333] transition-all text-left"
                  >
                    Connect your Discogs account
                  </button>
                )}
              </div>

              {/* Gemini API Key */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-[#666] uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={10} /> Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors font-mono"
                />
                <p className="text-[10px] text-[#444]">Required for AI record identification</p>
              </div>

              {/* Save */}
              <button
                onClick={() => saveGeminiKey(geminiKey)}
                className="w-full py-3 bg-white text-black font-medium text-sm rounded-xl hover:bg-[#e0e0e0] transition-colors press-scale"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
