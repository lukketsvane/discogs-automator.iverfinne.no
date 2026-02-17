import React, { useState } from 'react';
import { Layers, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import Uploader from './components/Uploader';
import VinylCard from './components/VinylCard';
import { identifyVinyls } from './services/geminiService';
import { UploadedFile, VinylRecord } from './types';
import { MAX_BATCH_SIZE } from './constants';

const App = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [results, setResults] = useState<VinylRecord[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    setResults([]);

    try {
      const rawFiles = files.map(f => f.file);
      const data = await identifyVinyls(rawFiles);
      
      // Merge local preview images with API results
      const mergedResults = data.map((record: any) => {
        // The service returns an _originalIndex helper to match files
        const originalFile = files[record._originalIndex];
        return {
            ...record,
            originalImage: originalFile ? originalFile.preview : ''
        };
      });

      setResults(mergedResults);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze vinyl records. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResults([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-md flex items-center justify-center transform rotate-3">
               <Layers className="text-black" size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Crate<span className="text-amber-500">Digger</span> AI
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs font-medium text-zinc-500">
            <span>Powered by Gemini 3 Pro</span>
            <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
            <span>Search Grounding</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Intro Section */}
        {results.length === 0 && !isAnalyzing && (
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Identify your vinyl collection <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">in seconds.</span>
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              Upload photos or snap pictures of your records. Our AI agent identifies the pressing, 
              finds market prices, and links to Discogs automatically.
            </p>
          </div>
        )}

        {/* Action Area */}
        <div className="max-w-4xl mx-auto">
            {results.length === 0 && (
                <Uploader files={files} setFiles={setFiles} isAnalyzing={isAnalyzing} />
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-3 text-red-200">
                    <AlertCircle size={20} className="mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-semibold">Analysis Failed</h4>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                </div>
            )}

            {/* Analyze Button */}
            {files.length > 0 && !isAnalyzing && results.length === 0 && (
                <div className="flex justify-center">
                    <button 
                        onClick={handleAnalyze}
                        disabled={files.length === 0}
                        className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                    >
                        <Sparkles size={20} className="text-amber-600 group-hover:rotate-12 transition-transform" />
                        Analyze Batch ({files.length})
                    </button>
                </div>
            )}
        </div>

        {/* Loading State */}
        {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-in fade-in duration-500">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-zinc-800 border-t-amber-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Disc size={24} className="text-zinc-700 animate-pulse" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold text-white">Analyzing your crate...</h3>
                    <p className="text-zinc-500">Identifying pressings and checking market values via Web Search.</p>
                </div>
            </div>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
            <div className="animate-in slide-in-from-bottom-10 duration-700 fade-in">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="bg-amber-500 text-black text-sm px-2 py-1 rounded font-mono">BATCH RESULTS</span>
                        Found {results.length} Releases
                    </h2>
                    <button 
                        onClick={handleReset}
                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white border border-zinc-800 rounded-lg hover:bg-zinc-900 transition-colors"
                    >
                        Start New Batch
                    </button>
                </div>

