import React, { useRef, useState, useCallback } from 'react';
import { Upload, Camera, X, Disc } from 'lucide-react';
import { MAX_BATCH_SIZE } from '../constants';
import { UploadedFile } from '../types';

interface UploaderProps {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  isAnalyzing: boolean;
}

const Uploader: React.FC<UploaderProps> = ({ files, setFiles, isAnalyzing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const validFiles: UploadedFile[] = [];
    Array.from(newFiles).forEach(file => {
      if (file.type.startsWith('image/') && (files.length + validFiles.length) < MAX_BATCH_SIZE) {
        validFiles.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file)
        });
      }
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAnalyzing) setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!isAnalyzing) handleFiles(e.dataTransfer.files);
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsCameraOpen(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob && files.length < MAX_BATCH_SIZE) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleFiles({ 0: file, length: 1, item: () => file } as unknown as FileList);
            stopCamera(); // Close after one shot for simplicity, or keep open for batch
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== id);
      // Cleanup object URL to prevent memory leaks
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return newFiles;
    });
  };

  return (
    <div className="w-full mb-8">
      {/* Camera Modal Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 shadow-2xl">
            <video ref={videoRef} className="w-full h-auto object-cover max-h-[70vh]" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 items-center">
              <button onClick={stopCamera} className="p-4 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition">
                <X size={24} />
              </button>
              <button onClick={capturePhoto} className="p-5 rounded-full bg-amber-500 text-black hover:bg-amber-400 transition transform hover:scale-105 shadow-lg border-4 border-zinc-900">
                <Camera size={32} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      {!isCameraOpen && (
        <div
          onDragEnter={onDragEnter}
          onDragOver={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`
            relative group border-2 border-dashed rounded-xl p-8 md:p-12 text-center transition-all duration-300
            ${dragActive ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'}
            ${isAnalyzing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-zinc-800 rounded-full group-hover:bg-zinc-700 transition-colors">
              <Upload className="w-8 h-8 text-zinc-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">Drop your vinyls here</h3>
              <p className="text-zinc-400 text-sm">
                Or <button onClick={() => fileInputRef.current?.click()} className="text-amber-500 hover:text-amber-400 underline decoration-dashed underline-offset-4">browse files</button>
                {' '}or <button onClick={startCamera} className="text-amber-500 hover:text-amber-400 underline decoration-dashed underline-offset-4">take a photo</button>
              </p>
              <p className="text-zinc-500 text-xs">
                Supports JPG, PNG • Max {MAX_BATCH_SIZE} records per batch
              </p>
            </div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handleFiles(e.target.files)} 
            multiple 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      )}

      {/* Preview Grid */}
      {files.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Queue ({files.length}/{MAX_BATCH_SIZE})</h4>
            {files.length > 0 && !isAnalyzing && (
              <button 
                onClick={() => setFiles([])}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map((file) => (
              <div key={file.id} className="relative aspect-square group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
                <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
                {!isAnalyzing && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                  >
                    <X size={14} />
                  </button>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pointer-events-none">
                  <span className="text-xs text-white truncate w-full flex items-center gap-1">
                    <Disc size={10} /> {file.file.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Uploader;
