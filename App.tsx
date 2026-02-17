import React, { useState, useEffect } from 'react';
import { Layers, Loader2, Disc, Key, X, Plus, Check } from 'lucide-react';
import Uploader from './components/Uploader';
import VinylCard from './components/VinylCard';
import RecordForm from './components/RecordForm';
import { analyzeRecordImages } from './services/geminiService';
import { UploadedFile, VinylRecord, DraftRecord } from './types';

const App = () => {
  // Collection State
  const [savedRecords, setSavedRecords] = useState<VinylRecord[]>([]);
  
  // Current Workflow State
  const [currentFiles, setCurrentFiles] = useState<UploadedFile[]>([]);
  const [draftRecord, setDraftRecord] = useState<DraftRecord | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [discogsToken, setDiscogsToken] = useState('');

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key') || process.env.API_KEY || '';
    const storedToken = localStorage.getItem('discogs_token') || '';
    setApiKey(storedKey);
    setDiscogsToken(storedToken);
  }, []);

  const saveSettings = (newKey: string, newToken: string) => {
    setApiKey(newKey);
    setDiscogsToken(newToken);
    localStorage.setItem('gemini_api_key', newKey);
    localStorage.setItem('discogs_token', newToken);
    setShowSettings(false);
  };

  const handleAnalyze = async () => {
    if (currentFiles.length === 0) return;
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setDraftRecord(null);

    try {
      const rawFiles = currentFiles.map(f => f.file);
      const data = await analyzeRecordImages(rawFiles, apiKey);
      setDraftRecord(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze. Please check your API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveDraft = (record: VinylRecord) => {
    setSavedRecords(prev => [record, ...prev]);
    // Reset workflow
    setDraftRecord(null);
    setCurrentFiles([]);
  };

  const handleCancelDraft = () => {
    setDraftRecord(null);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-white selection:text-black">
      {/* Navbar */}
      <nav className="border-b border-zinc-800 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-white">discogs.iverfinne.no</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSettings(true)}
              className="text-zinc-500 hover:text-white transition-colors p-2"
            >
              <div className="flex gap-2 items-center">
                {apiKey ? <div className="w-2 h-2 rounded-full bg-green-500"></div> : <Key size={16} className="text-amber-500 animate-pulse" />}
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        
        {/* Editor Section (Shown when draft exists) */}
        {draftRecord && (
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-white">
                <Check size={18} className="text-green-500" />
                <h2 className="font-semibold">Verify Identification</h2>
             </div>
             <RecordForm 
                draft={draftRecord} 
                images={currentFiles} 
                onSave={handleSaveDraft}
                onCancel={handleCancelDraft} 
             />
          </div>
        )}

        {/* Input Section (Hidden while editing draft) */}
        {!draftRecord && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-white font-medium flex items-center gap-2">
                 <Plus size={16} /> Add to Collection
              </h2>

            </div>
            
            <div className="bg-zinc-900/20 border border-zinc-800 rounded-xl p-6">
               <Uploader files={currentFiles} setFiles={setCurrentFiles} isAnalyzing={isAnalyzing} />
               
               {error && (
                  <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-md text-red-200 text-xs">
                     {error}
                  </div>
               )}

               {isAnalyzing && (
                  <div className="mt-6 flex items-center justify-center gap-3 text-zinc-400 text-sm">
                     <Loader2 className="animate-spin" size={16} />
                     <span>Analyzing pressing details...</span>
                  </div>
               )}

               {!isAnalyzing && currentFiles.length > 0 && (
                  <button 
                    onClick={handleAnalyze}
                    className="mt-6 w-full py-2.5 bg-white text-black font-medium text-sm rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
                  >
                    Analyze Record
                  </button>
               )}
            </div>
          </div>
        )}

        {/* Collection List */}
        <div className="space-y-6">
           <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-white font-medium">My Collection</h2>
              <span className="text-xs text-zinc-500 font-mono">{savedRecords.length} items</span>
           </div>

           {savedRecords.length > 0 ? (
              <div className="space-y-4">
                 {savedRecords.map((record) => (
                    <VinylCard key={record.id} record={record} />
                 ))}
              </div>
           ) : (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl text-zinc-600">
                 <Disc size={32} className="mx-auto mb-3 opacity-20" />
                 <p className="text-sm">Your collection is empty.</p>
              </div>
           )}
        </div>

      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-medium">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium flex items-center gap-2">
                  <Key size={12} /> Gemini API Key
                </label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium flex items-center gap-2">
                  <Disc size={12} /> Discogs Token
                </label>
                <input 
                  type="password" 
                  value={discogsToken}
                  onChange={(e) => setDiscogsToken(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all"
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => saveSettings(apiKey, discogsToken)}
                  className="w-full py-2 bg-white text-black font-medium text-sm rounded-md hover:bg-zinc-200 transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;