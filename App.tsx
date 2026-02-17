import React, { useState, useEffect } from 'react';
import { Layers, Loader2, Sparkles, AlertCircle, Disc, Key, Settings, X } from 'lucide-react';
import Uploader from './components/Uploader';
import VinylCard from './components/VinylCard';
import { identifyVinyls } from './services/geminiService';
import { UploadedFile, VinylRecord } from './types';

const App = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [results, setResults] = useState<VinylRecord[]>([]);
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
    if (files.length === 0) return;
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults([]);

    try {
      const rawFiles = files.map(f => f.file);
      const data = await identifyVinyls(rawFiles, apiKey);
      
      const mergedResults = data.map((record: any) => {
        const originalFile = files[record._originalIndex];
        return {
            ...record,
            originalImage: originalFile ? originalFile.preview : ''
        };
      });

      setResults(mergedResults);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze. Please check your API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-white selection:text-black">
      {/* Navbar */}
      <nav className="border-b border-zinc-800 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
               <Layers className="text-black" size={12} />
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">CrateDigger</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSettings(true)}
              className="text-zinc-500 hover:text-white transition-colors p-2"
              title="API Settings"
            >
              <div className="flex gap-2">
                <Key size={16} className={apiKey ? "text-zinc-500" : "text-amber-500 animate-pulse"} />
                {discogsToken && <Disc size={16} className="text-zinc-500" />}
                {!discogsToken && <Disc size={16} className="text-zinc-700" />}
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-1">
              <h2 className="text-white font-medium">Input</h2>
              <p className="text-xs text-zinc-500">Upload cover or label images.</p>
            </div>
            
            <Uploader files={files} setFiles={setFiles} isAnalyzing={isAnalyzing} />
            
            {files.length > 0 && !isAnalyzing && (
              <button 
                onClick={handleAnalyze}
                className="w-full py-2 bg-white text-black font-medium text-sm rounded-md hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
              >
                Identify Records
              </button>
            )}

            {error && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-md text-red-200 text-xs flex gap-2 items-start">
                 <AlertCircle size={14} className="mt-0.5" />
                 {error}
              </div>
            )}
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between h-8">
              <div className="space-y-1">
                <h2 className="text-white font-medium">Results</h2>
                <p className="text-xs text-zinc-500">
                  {results.length > 0 ? `${results.length} records identified` : 'Waiting for input...'}
                </p>
              </div>
            </div>

            {isAnalyzing ? (
              <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-lg bg-zinc-900/30">
                <Loader2 className="animate-spin text-white mb-3" size={24} />
                <p className="text-xs text-zinc-500 animate-pulse">Processing with Gemini 3 Pro...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((record) => (
                  <VinylCard key={record.id} record={record} />
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-lg text-zinc-600">
                <span className="text-sm">No results yet.</span>
              </div>
            )}
          </div>
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
                  <Key size={12} /> Gemini API Key <span className="text-red-500">*</span>
                </label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition-colors"
                />
                <p className="text-[10px] text-zinc-600">
                  Required. Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-zinc-400 hover:underline">Google AI Studio</a>.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium flex items-center gap-2">
                  <Disc size={12} /> Discogs Personal Access Token
                </label>
                <input 
                  type="password" 
                  value={discogsToken}
                  onChange={(e) => setDiscogsToken(e.target.value)}
                  placeholder="Token from Developer Settings..."
                  className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition-colors"
                />
                <p className="text-[10px] text-zinc-600">
                  Optional. Used for future agent capabilities.
                </p>
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