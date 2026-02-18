import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Disc, Plus, Settings, User, X, Key, LogOut, ArrowLeft, Loader2, Camera, Search, Library, ExternalLink, ChevronRight, RefreshCw, Download, DollarSign } from 'lucide-react';
import Uploader from './components/Uploader';
import VinylCard from './components/VinylCard';
import RecordForm from './components/RecordForm';
import AgentView from './components/AgentView';
import ConnectDiscogs from './components/ConnectDiscogs';
import { DiscogsAgent, getDefaultGeminiKey } from './services/geminiService';
import { DiscogsClient } from './services/discogsService';
import { exportCollectionAsZip } from './services/exportService';
import { useSwipeDown } from './hooks/useSwipe';
import { UploadedFile, VinylRecord, DraftRecord, AgentResponse, DiscogsProfile, DiscogsCollectionItem, AppView, TabView } from './types';

const App = () => {
  // ─── Auth State ───
  const [geminiKey, setGeminiKey] = useState('');
  const [discogsToken, setDiscogsToken] = useState('');
  const [discogsProfile, setDiscogsProfile] = useState<DiscogsProfile | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ─── View State ───
  const [view, setView] = useState<AppView>('home');
  const [activeTab, setActiveTab] = useState<TabView>('collection');

  // ─── Workflow State ───
  const [currentFiles, setCurrentFiles] = useState<UploadedFile[]>([]);
  const [draftRecord, setDraftRecord] = useState<DraftRecord | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Collection State ───
  const [savedRecords, setSavedRecords] = useState<VinylRecord[]>([]);
  const [discogsCollection, setDiscogsCollection] = useState<DiscogsCollectionItem[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionPage, setCollectionPage] = useState(1);
  const [collectionTotalPages, setCollectionTotalPages] = useState(1);
  const [collectionTotal, setCollectionTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Detail State ───
  const [selectedRecord, setSelectedRecord] = useState<VinylRecord | null>(null);
  const [selectedDiscogsItem, setSelectedDiscogsItem] = useState<DiscogsCollectionItem | null>(null);

  // ─── Export State ───
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // ─── Refs ───
  const agentRef = useRef<DiscogsAgent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Gestures ───
  const settingsSwipe = useSwipeDown(() => setShowSettings(false));

  // ─── Effective API key (user override or env default) ───
  const effectiveGeminiKey = geminiKey || getDefaultGeminiKey();
  const hasGeminiKey = !!effectiveGeminiKey;

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

  // ─── Fetch Discogs collection when profile loads ───
  useEffect(() => {
    if (discogsProfile && discogsToken) {
      fetchDiscogsCollection(1);
    }
  }, [discogsProfile, discogsToken]);

  const fetchDiscogsCollection = async (page: number = 1) => {
    if (!discogsToken || !discogsProfile) return;
    setCollectionLoading(true);

    try {
      const client = new DiscogsClient(discogsToken);
      const response = await client.getCollection(discogsProfile.username, 0, page, 50);
      if (page === 1) {
        setDiscogsCollection(response.releases || []);
      } else {
        setDiscogsCollection(prev => [...prev, ...(response.releases || [])]);
      }
      setCollectionPage(response.pagination.page);
      setCollectionTotalPages(response.pagination.pages);
      setCollectionTotal(response.pagination.items);
    } catch (err) {
      console.error('Failed to fetch collection:', err);
    } finally {
      setCollectionLoading(false);
    }
  };

  const loadMoreCollection = () => {
    if (collectionPage < collectionTotalPages && !collectionLoading) {
      fetchDiscogsCollection(collectionPage + 1);
    }
  };

  // ─── Discogs token verification ───
  const verifyDiscogsToken = async (token: string) => {
    try {
      const client = new DiscogsClient(token);
      const identity = await client.getIdentity();
      const profile = await client.getProfile(identity.username);
      setDiscogsProfile(profile);
      localStorage.setItem('discogs_profile', JSON.stringify(profile));
    } catch {
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
    setDiscogsCollection([]);
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
    if (!hasGeminiKey) {
      setShowSettings(true);
      return;
    }

    setIsAnalyzing(true);
    setView('agent');
    setError(null);
    setDraftRecord(null);
    setAgentResponse(null);

    try {
      agentRef.current = new DiscogsAgent(effectiveGeminiKey, discogsToken || undefined);
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

  // ─── Delete local record ───
  const handleDeleteRecord = (id: string) => {
    setSavedRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('vinyl_collection', JSON.stringify(updated));
      return updated;
    });
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
    if (view === 'detail') {
      setView('home');
      setSelectedRecord(null);
      setSelectedDiscogsItem(null);
    } else if (view === 'review') {
      setView('agent');
      setDraftRecord(null);
    } else if (view === 'agent') {
      resetWorkflow();
    }
  };

  // ─── View record detail ───
  const openRecordDetail = (record: VinylRecord) => {
    setSelectedRecord(record);
    setSelectedDiscogsItem(null);
    setView('detail');
  };

  const openDiscogsDetail = (item: DiscogsCollectionItem) => {
    setSelectedDiscogsItem(item);
    setSelectedRecord(null);
    setView('detail');
  };

  // ─── Export collection ───
  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);
    try {
      await exportCollectionAsZip(savedRecords, discogsCollection, (pct) => setExportProgress(pct));
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Filter collection by search
  const filteredDiscogsCollection = searchQuery
    ? discogsCollection.filter(item => {
        const q = searchQuery.toLowerCase();
        const info = item.basic_information;
        return (
          info.title.toLowerCase().includes(q) ||
          info.artists.some(a => a.name.toLowerCase().includes(q)) ||
          info.labels.some(l => l.name.toLowerCase().includes(q))
        );
      })
    : discogsCollection;

  const filteredLocalRecords = searchQuery
    ? savedRecords.filter(r => {
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.artist.toLowerCase().includes(q) ||
          r.label.toLowerCase().includes(q)
        );
      })
    : savedRecords;

  // ─── Handle infinite scroll ───
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      loadMoreCollection();
    }
  }, [collectionPage, collectionTotalPages, collectionLoading]);

  const isSubView = view !== 'home';

  return (
    <div className="h-full flex flex-col bg-black text-[#ededed] selection:bg-white selection:text-black overflow-hidden">

      {/* ═══ Nav Bar ═══ */}
      <nav className="shrink-0 z-40 border-b border-[#1a1a1a] nav-glass safe-top">
        <div className="px-4 h-11 flex items-center justify-between">

          {/* Left */}
          {isSubView ? (
            <button onClick={handleBack} className="flex items-center gap-1 text-blue-400 press-scale -ml-1 py-2 pr-3">
              <ArrowLeft size={18} strokeWidth={2.5} />
              <span className="text-[13px] font-medium">Back</span>
            </button>
          ) : (
            <span className="text-[13px] font-semibold text-white tracking-tight">
              {activeTab === 'collection' ? 'Collection' : activeTab === 'identify' ? 'Identify' : 'Settings'}
            </span>
          )}

          {/* Center title for sub-views */}
          {isSubView && (
            <span className="absolute left-1/2 -translate-x-1/2 text-[13px] font-semibold text-white">
              {view === 'agent' ? 'Identifying' : view === 'review' ? 'Review' : view === 'detail' ? 'Details' : ''}
            </span>
          )}

          {/* Right */}
          <div className="flex items-center gap-1">
            {!isSubView && discogsProfile ? (
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center py-1 px-1 rounded-lg btn-haptic"
              >
                {discogsProfile.avatar_url ? (
                  <img src={discogsProfile.avatar_url} alt="" className="w-7 h-7 rounded-full border border-[#333]" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#222] flex items-center justify-center">
                    <User size={13} className="text-[#888]" />
                  </div>
                )}
              </button>
            ) : !isSubView ? (
              <button
                onClick={() => setShowSettings(true)}
                className="text-[#555] p-2 btn-haptic"
              >
                <Settings size={18} />
              </button>
            ) : null}
          </div>
        </div>
      </nav>

      {/* ═══ Main Content ═══ */}
      <div className="flex-1 overflow-hidden relative">

        {/* ─── Detail View ─── */}
        {view === 'detail' && (selectedRecord || selectedDiscogsItem) && (
          <div className="h-full overflow-y-auto scroll-momentum animate-slide-up" ref={scrollRef}>
            <RecordDetailView
              record={selectedRecord}
              discogsItem={selectedDiscogsItem}
              discogsToken={discogsToken}
              discogsUsername={discogsProfile?.username}
            />
          </div>
        )}

        {/* ─── Review View ─── */}
        {view === 'review' && draftRecord && (
          <div className="h-full overflow-y-auto scroll-momentum animate-slide-up">
            <div className="px-4 py-4 safe-bottom pb-6">
              <RecordForm
                draft={draftRecord}
                images={currentFiles}
                onSave={handleSaveRecord}
                onCancel={handleBack}
                discogsToken={discogsToken || undefined}
                discogsUsername={discogsProfile?.username}
              />
            </div>
          </div>
        )}

        {/* ─── Agent View ─── */}
        {view === 'agent' && !draftRecord && (
          <div className="h-full overflow-hidden animate-slide-up">
            <AgentView
              initialResponse={agentResponse}
              onReply={handleAgentReply}
              onComplete={handleAgentComplete}
              isProcessing={isAnalyzing}
            />
          </div>
        )}

        {/* ─── Home View ─── */}
        {view === 'home' && (
          <div className="h-full flex flex-col overflow-hidden animate-fade-in">

            {/* ─── Tab: Collection ─── */}
            {activeTab === 'collection' && (
              <div className="flex-1 flex flex-col overflow-hidden">

                {/* Search bar */}
                <div className="px-4 pt-3 pb-2 shrink-0">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search collection..."
                      className="w-full bg-[#111] border border-[#1a1a1a] rounded-lg pl-9 pr-3 py-2 text-[13px] text-white placeholder-[#444] focus:outline-none focus:border-[#333] transition-colors"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] p-0.5">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                {discogsProfile && (
                  <div className="px-4 pb-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[#666]">
                        <span className="text-white font-semibold">{collectionTotal || discogsProfile.num_collection}</span> records
                      </span>
                      {savedRecords.length > 0 && (
                        <span className="text-[11px] text-[#666]">
                          <span className="text-white font-semibold">{savedRecords.length}</span> local
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExport}
                        disabled={isExporting || (savedRecords.length === 0 && discogsCollection.length === 0)}
                        className="text-[11px] text-blue-400 flex items-center gap-1 btn-haptic disabled:opacity-40"
                        title="Export collection as ZIP"
                      >
                        {isExporting ? (
                          <><Loader2 size={11} className="animate-spin" /> {exportProgress}%</>
                        ) : (
                          <><Download size={11} /> Export</>
                        )}
                      </button>
                      <button
                        onClick={() => fetchDiscogsCollection(1)}
                        disabled={collectionLoading}
                        className="text-[11px] text-blue-400 flex items-center gap-1 btn-haptic"
                      >
                        <RefreshCw size={11} className={collectionLoading ? 'animate-spin' : ''} />
                        Refresh
                      </button>
                    </div>
                  </div>
                )}

                {/* Export when no Discogs but local records exist */}
                {!discogsProfile && savedRecords.length > 0 && (
                  <div className="px-4 pb-2 flex items-center justify-between shrink-0">
                    <span className="text-[11px] text-[#666]">
                      <span className="text-white font-semibold">{savedRecords.length}</span> local records
                    </span>
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="text-[11px] text-blue-400 flex items-center gap-1 btn-haptic disabled:opacity-40"
                      title="Export collection as ZIP"
                    >
                      {isExporting ? (
                        <><Loader2 size={11} className="animate-spin" /> {exportProgress}%</>
                      ) : (
                        <><Download size={11} /> Export</>
                      )}
                    </button>
                  </div>
                )}

                {/* Connect prompt if no token */}
                {!discogsToken && (
                  <div className="px-4 pb-3 shrink-0">
                    <button
                      onClick={() => setShowConnect(true)}
                      className="w-full p-3.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex items-center gap-3 press-scale"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/5 border border-[#222] flex items-center justify-center shrink-0">
                        <Disc size={16} className="text-[#555]" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white">Connect Discogs</p>
                        <p className="text-[11px] text-[#555] truncate">See your full collection</p>
                      </div>
                      <ChevronRight size={16} className="text-[#333] shrink-0" />
                    </button>
                  </div>
                )}

                {/* Collection list */}
                <div
                  className="flex-1 overflow-y-auto scroll-momentum px-4 pb-24"
                  onScroll={handleScroll}
                >
                  {/* Local records section */}
                  {filteredLocalRecords.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-2 px-0.5">
                        Saved Locally
                      </p>
                      <div className="space-y-1">
                        {filteredLocalRecords.map((record) => (
                          <VinylCard
                            key={record.id}
                            record={record}
                            onTap={() => openRecordDetail(record)}
                            onDelete={() => handleDeleteRecord(record.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discogs collection section */}
                  {discogsToken && filteredDiscogsCollection.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-2 px-0.5">
                        Discogs Collection
                      </p>
                      <div className="space-y-1">
                        {filteredDiscogsCollection.map((item) => (
                          <VinylCard
                            key={`d-${item.instance_id}`}
                            discogsItem={item}
                            onTap={() => openDiscogsDetail(item)}
                          />
                        ))}
                      </div>

                      {/* Load more */}
                      {collectionPage < collectionTotalPages && (
                        <button
                          onClick={loadMoreCollection}
                          disabled={collectionLoading}
                          className="w-full py-3 mt-2 text-[12px] text-blue-400 flex items-center justify-center gap-2 btn-haptic"
                        >
                          {collectionLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>Load More ({collectionTotal - discogsCollection.length} remaining)</>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Loading state */}
                  {collectionLoading && discogsCollection.length === 0 && (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                          <div className="w-16 h-16 rounded-lg skeleton shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-3/4 rounded skeleton" />
                            <div className="h-2.5 w-1/2 rounded skeleton" />
                            <div className="h-2 w-1/3 rounded skeleton" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!collectionLoading && filteredLocalRecords.length === 0 && filteredDiscogsCollection.length === 0 && !discogsToken && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Disc size={28} className="text-[#222] mb-3" />
                      <p className="text-[13px] text-[#444]">No records yet</p>
                      <p className="text-[11px] text-[#333] mt-1">Identify records or connect Discogs</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Tab: Identify ─── */}
            {activeTab === 'identify' && (
              <div className="flex-1 overflow-y-auto scroll-momentum px-4 py-4 pb-24">
                <div className="space-y-4">
                  {!hasGeminiKey && (
                    <button onClick={() => setShowSettings(true)} className="w-full p-3 bg-amber-950/20 border border-amber-900/20 rounded-xl text-left flex items-center gap-3 press-scale">
                      <Key size={16} className="text-amber-500/70 shrink-0" />
                      <div>
                        <p className="text-[13px] font-medium text-amber-200/80">API key needed</p>
                        <p className="text-[11px] text-amber-200/50">Add a Gemini API key in settings</p>
                      </div>
                    </button>
                  )}

                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
                    <Uploader files={currentFiles} setFiles={setCurrentFiles} isAnalyzing={isAnalyzing} />

                    {error && (
                      <div className="mt-3 p-3 bg-red-950/20 border border-red-900/20 rounded-lg text-red-300 text-[12px]">
                        {error}
                      </div>
                    )}

                    {currentFiles.length > 0 && (
                      <button
                        onClick={startAnalysis}
                        disabled={isAnalyzing}
                        className="mt-4 w-full py-3 bg-white text-black font-semibold text-[14px] rounded-xl press-scale flex justify-center items-center gap-2 disabled:opacity-50"
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
              </div>
            )}

            {/* ─── Tab: Settings ─── */}
            {activeTab === 'settings' && (
              <div className="flex-1 overflow-y-auto scroll-momentum px-4 py-4 pb-24">
                <div className="space-y-5">

                  {/* Profile section */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider px-0.5">Account</p>

                    {discogsProfile ? (
                      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 p-3.5">
                          {discogsProfile.avatar_url ? (
                            <img src={discogsProfile.avatar_url} alt="" className="w-12 h-12 rounded-full border border-[#333]" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[#222] flex items-center justify-center">
                              <User size={18} className="text-[#666]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] text-white font-semibold">@{discogsProfile.username}</p>
                            <div className="flex gap-3 mt-0.5">
                              <span className="text-[11px] text-[#666]"><span className="text-[#999]">{discogsProfile.num_collection}</span> collected</span>
                              <span className="text-[11px] text-[#666]"><span className="text-[#999]">{discogsProfile.num_wantlist}</span> wanted</span>
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-[#1a1a1a]">
                          <button
                            onClick={handleDiscogsDisconnect}
                            className="w-full px-3.5 py-3 text-[13px] text-red-400 text-left flex items-center gap-2 btn-haptic"
                          >
                            <LogOut size={14} /> Disconnect
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowConnect(true)}
                        className="w-full p-3.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex items-center gap-3 press-scale"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-[#222] flex items-center justify-center shrink-0">
                          <Disc size={18} className="text-[#555]" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-[13px] font-medium text-white">Connect Discogs</p>
                          <p className="text-[11px] text-[#555]">Link your account</p>
                        </div>
                        <ChevronRight size={16} className="text-[#333]" />
                      </button>
                    )}
                  </div>

                  {/* API Key section */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider px-0.5">AI Engine</p>
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3.5 space-y-3">
                      {getDefaultGeminiKey() && !geminiKey && (
                        <div className="flex items-center gap-2 p-2.5 bg-green-950/20 border border-green-900/20 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                          <span className="text-[11px] text-green-400/80">Using built-in API key</span>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#666] flex items-center gap-1.5">
                          <Key size={10} /> {getDefaultGeminiKey() ? 'Custom Gemini API Key (optional)' : 'Gemini API Key'}
                        </label>
                        <input
                          type="password"
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          placeholder={getDefaultGeminiKey() ? "Override built-in key..." : "AIzaSy..."}
                          className="w-full bg-black border border-[#222] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors font-mono"
                        />
                      </div>
                      <button
                        onClick={() => saveGeminiKey(geminiKey)}
                        className="w-full py-2.5 bg-white text-black font-medium text-[13px] rounded-lg press-scale"
                      >
                        {geminiKey ? 'Save Key' : 'Clear Custom Key'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Tab Bar ═══ */}
      {!isSubView && (
        <div className="shrink-0 border-t border-[#1a1a1a] tab-bar-glass safe-bottom z-40">
          <div className="flex items-center justify-around h-12">
            <TabButton
              icon={<Library size={20} />}
              label="Collection"
              active={activeTab === 'collection'}
              onTap={() => setActiveTab('collection')}
            />
            <TabButton
              icon={<Camera size={20} />}
              label="Identify"
              active={activeTab === 'identify'}
              onTap={() => setActiveTab('identify')}
            />
            <TabButton
              icon={<Settings size={20} />}
              label="Settings"
              active={activeTab === 'settings'}
              onTap={() => setActiveTab('settings')}
            />
          </div>
        </div>
      )}

      {/* ═══ Connect Discogs Sheet ═══ */}
      {showConnect && (
        <ConnectDiscogs
          onConnect={handleDiscogsConnect}
          onSkip={() => setShowConnect(false)}
          onClose={() => setShowConnect(false)}
        />
      )}

      {/* ═══ Settings Modal (quick access) ═══ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md animate-fade-in sheet-overlay" onClick={() => setShowSettings(false)}>
          <div
            className="w-full bg-[#0a0a0a] border-t border-[#1a1a1a] rounded-t-2xl overflow-hidden animate-sheet-up shadow-2xl sheet-content"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={settingsSwipe.onTouchStart}
            onTouchMove={settingsSwipe.onTouchMove}
            onTouchEnd={settingsSwipe.onTouchEnd}
          >
            <div className="flex justify-center pt-2.5 pb-0">
              <div className="w-9 h-1 bg-[#333] rounded-full" />
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-white">Quick Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-[#555] p-1">
                  <X size={18} />
                </button>
              </div>

              {/* Discogs account */}
              {discogsProfile ? (
                <div className="flex items-center justify-between p-3 bg-[#111] border border-[#1a1a1a] rounded-xl">
                  <div className="flex items-center gap-2.5">
                    {discogsProfile.avatar_url ? (
                      <img src={discogsProfile.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center">
                        <User size={13} className="text-[#666]" />
                      </div>
                    )}
                    <div>
                      <p className="text-[13px] text-white font-medium">@{discogsProfile.username}</p>
                      <p className="text-[10px] text-[#666]">{discogsProfile.num_collection} records</p>
                    </div>
                  </div>
                  <button onClick={handleDiscogsDisconnect} className="text-[11px] text-[#555] flex items-center gap-1 btn-haptic">
                    <LogOut size={11} /> Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowSettings(false); setShowConnect(true); }}
                  className="w-full p-3 bg-[#111] border border-[#1a1a1a] rounded-xl text-[13px] text-[#888] text-left flex items-center gap-2 press-scale"
                >
                  <Disc size={16} className="text-[#555]" /> Connect Discogs
                </button>
              )}

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#666] flex items-center gap-1">
                  <Key size={10} /> Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black border border-[#222] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors font-mono"
                />
              </div>

              <button
                onClick={() => saveGeminiKey(geminiKey)}
                className="w-full py-2.5 bg-white text-black font-medium text-[13px] rounded-xl press-scale"
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

// ─── Tab Button Component ───
const TabButton = ({ icon, label, active, onTap }: { icon: React.ReactNode; label: string; active: boolean; onTap: () => void }) => (
  <button
    onClick={onTap}
    className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full btn-haptic transition-colors ${
      active ? 'text-blue-400' : 'text-[#555]'
    }`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

// ─── Record Detail View ───
const RecordDetailView = ({
  record,
  discogsItem,
  discogsToken,
  discogsUsername,
}: {
  record?: VinylRecord | null;
  discogsItem?: DiscogsCollectionItem | null;
  discogsToken?: string;
  discogsUsername?: string;
}) => {
  const [isAddingToWantlist, setIsAddingToWantlist] = useState(false);
  const [addedToWantlist, setAddedToWantlist] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const [listed, setListed] = useState(false);
  const [listingError, setListingError] = useState('');
  const [showListingForm, setShowListingForm] = useState(false);
  const [listingCondition, setListingCondition] = useState('Very Good Plus (VG+)');
  const [listingSleeveCondition, setListingSleeveCondition] = useState('Very Good Plus (VG+)');
  const [listingPrice, setListingPrice] = useState('');
  const [listingComments, setListingComments] = useState('');

  // Normalize
  const title = record?.title || discogsItem?.basic_information?.title || 'Unknown';
  const artist = record?.artist || discogsItem?.basic_information?.artists?.map(a => a.name).join(', ') || 'Unknown';
  const year = record?.year || (discogsItem?.basic_information?.year ? String(discogsItem.basic_information.year) : '');
  const coverImage = record?.images?.[0] || discogsItem?.basic_information?.cover_image || discogsItem?.basic_information?.thumb || '';
  const format = record?.format || discogsItem?.basic_information?.formats?.map(f => {
    const descs = f.descriptions?.join(', ') || '';
    return descs ? `${f.name} (${descs})` : f.name;
  }).join(', ') || '';
  const label = record?.label || discogsItem?.basic_information?.labels?.map(l => l.name).join(', ') || '';
  const catno = record?.catalogNumber || discogsItem?.basic_information?.labels?.[0]?.catno || '';
  const genres = discogsItem?.basic_information?.genres || [];
  const styles = discogsItem?.basic_information?.styles || [];
  const releaseId = record?.discogsReleaseId || discogsItem?.basic_information?.id;
  const discogsUrl = record?.discogsUrl || (releaseId ? `https://www.discogs.com/release/${releaseId}` : '');
  const dateAdded = record?.dateAdded ? new Date(record.dateAdded).toLocaleDateString() : discogsItem?.date_added ? new Date(discogsItem.date_added).toLocaleDateString() : '';
  const rating = discogsItem?.rating || 0;

  const addToWantlist = async () => {
    if (!discogsToken || !discogsUsername || !releaseId) return;
    setIsAddingToWantlist(true);
    try {
      const client = new DiscogsClient(discogsToken);
      await client.addToWantlist(discogsUsername, releaseId);
      setAddedToWantlist(true);
    } catch { }
    setIsAddingToWantlist(false);
  };

  const handleListForSale = async () => {
    if (!discogsToken || !releaseId) return;
    const price = parseFloat(listingPrice);
    if (isNaN(price) || price <= 0) {
      setListingError('Enter a valid price');
      return;
    }
    setIsListing(true);
    setListingError('');
    try {
      const client = new DiscogsClient(discogsToken);
      await client.createListing(
        releaseId,
        listingCondition,
        price,
        'For Sale',
        listingSleeveCondition,
        listingComments || undefined,
      );
      setListed(true);
      setShowListingForm(false);
    } catch (e: any) {
      setListingError(e.message || 'Failed to create listing');
    } finally {
      setIsListing(false);
    }
  };

  return (
    <div className="px-4 py-4 pb-24 space-y-4">
      {/* Cover art */}
      <div className="aspect-square bg-[#0a0a0a] rounded-xl overflow-hidden border border-[#1a1a1a]">
        {coverImage ? (
          <img src={coverImage} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Disc size={48} className="text-[#222]" />
          </div>
        )}
      </div>

      {/* Title info */}
      <div className="space-y-1">
        <h2 className="text-[18px] font-bold text-white leading-tight">{title}</h2>
        <p className="text-[14px] text-[#888]">{artist}</p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        {discogsUrl && (
          <a
            href={discogsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 bg-[#111] border border-[#222] rounded-xl text-[13px] text-white font-medium flex items-center justify-center gap-2 press-scale"
          >
            <ExternalLink size={14} /> View on Discogs
          </a>
        )}
        {discogsToken && releaseId && !listed && (
          <button
            onClick={() => setShowListingForm(!showListingForm)}
            className="py-2.5 px-4 bg-[#111] border border-[#222] rounded-xl text-[13px] text-green-400 font-medium flex items-center gap-2 press-scale"
          >
            <DollarSign size={14} /> Sell
          </button>
        )}
        {listed && (
          <span className="py-2.5 px-4 bg-green-950/20 border border-green-900/20 rounded-xl text-[13px] text-green-400 font-medium">
            Listed ✓
          </span>
        )}
        {discogsToken && releaseId && !addedToWantlist && (
          <button
            onClick={addToWantlist}
            disabled={isAddingToWantlist}
            className="py-2.5 px-4 bg-[#111] border border-[#222] rounded-xl text-[13px] text-[#888] font-medium flex items-center gap-2 press-scale"
          >
            {isAddingToWantlist ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Want
          </button>
        )}
        {addedToWantlist && (
          <span className="py-2.5 px-4 bg-green-950/20 border border-green-900/20 rounded-xl text-[13px] text-green-400 font-medium">
            Added
          </span>
        )}
      </div>

      {/* List for Sale form */}
      {showListingForm && discogsToken && releaseId && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3.5 space-y-3 animate-slide-up">
          <p className="text-[13px] font-semibold text-white">List for Sale</p>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#666] uppercase tracking-wider">Price (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={listingPrice}
              onChange={(e) => setListingPrice(e.target.value)}
              placeholder={(() => {
                if (!record?.estimatedPrice) return '10.00';
                const match = record.estimatedPrice.match(/\d+(\.\d+)?/);
                return match ? match[0] : '10.00';
              })()}
              className="w-full bg-black border border-[#222] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#666] uppercase tracking-wider">Vinyl Condition</label>
              <select
                value={listingCondition}
                onChange={(e) => setListingCondition(e.target.value)}
                className="w-full bg-black border border-[#222] rounded-lg px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#444] transition-colors"
              >
                <option>Mint (M)</option>
                <option>Near Mint (NM or M-)</option>
                <option>Very Good Plus (VG+)</option>
                <option>Very Good (VG)</option>
                <option>Good Plus (G+)</option>
                <option>Good (G)</option>
                <option>Fair (F)</option>
                <option>Poor (P)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#666] uppercase tracking-wider">Sleeve Condition</label>
              <select
                value={listingSleeveCondition}
                onChange={(e) => setListingSleeveCondition(e.target.value)}
                className="w-full bg-black border border-[#222] rounded-lg px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#444] transition-colors"
              >
                <option>Mint (M)</option>
                <option>Near Mint (NM or M-)</option>
                <option>Very Good Plus (VG+)</option>
                <option>Very Good (VG)</option>
                <option>Good Plus (G+)</option>
                <option>Good (G)</option>
                <option>Fair (F)</option>
                <option>Poor (P)</option>
                <option>Generic</option>
                <option>Not Graded</option>
                <option>No Cover</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#666] uppercase tracking-wider">Comments (optional)</label>
            <textarea
              value={listingComments}
              onChange={(e) => setListingComments(e.target.value)}
              rows={2}
              placeholder="Any notes about this item..."
              className="w-full bg-black border border-[#222] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors resize-none"
            />
          </div>

          {listingError && (
            <p className="text-[11px] text-red-400">{listingError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setShowListingForm(false)}
              className="flex-1 py-2.5 text-[13px] text-[#666] font-medium rounded-xl border border-[#222] press-scale"
            >
              Cancel
            </button>
            <button
              onClick={handleListForSale}
              disabled={isListing}
              className="flex-[2] py-2.5 bg-green-600 text-white text-[13px] font-semibold rounded-xl press-scale flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isListing ? (
                <><Loader2 size={14} className="animate-spin" /> Listing...</>
              ) : (
                <><DollarSign size={14} /> List for Sale</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Additional images for local records */}
      {record && record.images.length > 1 && (
        <div className="grid grid-cols-3 gap-1.5">
          {record.images.slice(1).map((img, i) => (
            <div key={i} className="aspect-square bg-[#0a0a0a] rounded-lg overflow-hidden border border-[#1a1a1a]">
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Details */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden divide-y divide-[#1a1a1a]">
        {year && year !== '0' && <DetailRow label="Year" value={year} />}
        {format && <DetailRow label="Format" value={format} />}
        {label && <DetailRow label="Label" value={label} />}
        {catno && catno !== 'none' && <DetailRow label="Catalog #" value={catno} />}
        {record?.country && <DetailRow label="Country" value={record.country} />}
        {record?.estimatedPrice && record.estimatedPrice !== 'N/A' && <DetailRow label="Est. Price" value={record.estimatedPrice} />}
        {genres.length > 0 && <DetailRow label="Genres" value={genres.join(', ')} />}
        {styles.length > 0 && <DetailRow label="Styles" value={styles.join(', ')} />}
        {rating > 0 && <DetailRow label="Rating" value={'★'.repeat(rating) + '☆'.repeat(5 - rating)} />}
        {dateAdded && <DetailRow label="Added" value={dateAdded} />}
        {record?.description && <DetailRow label="Notes" value={record.description} />}
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between px-3.5 py-2.5">
    <span className="text-[12px] text-[#666] shrink-0 w-20">{label}</span>
    <span className="text-[12px] text-white text-right flex-1 min-w-0">{value}</span>
  </div>
);

export default App;
