import React, { useRef, useState, useCallback } from 'react';
import { Upload, Camera, X } from 'lucide-react';
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
      if (file.type.startsWith('image/')) {
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
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleFiles({ 0: file, length: 1, item: () => file } as unknown as FileList);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== id);
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return newFiles;
    });
  };

  return (
    <div className="w-full space-y-4">
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
              <button onClick={capturePhoto} className="p-5 rounded-full bg-white text-black hover:bg-zinc-200 transition transform hover:scale-105 shadow-lg border-4 border-black">
                <Camera size={32} />
              </button>
            </div>
            
            <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
                <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md">
                   {files.length === 0 ? "Capture Front Cover" : files.length === 1 ? "Capture Back Cover" : "Capture Labels/Details"}
                </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Upload Area */}
      {!isCameraOpen && (
        <div
          onDragEnter={onDragEnter}
          onDragOver={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !isAnalyzing && fileInputRef.current?.click()}
          className={`
            relative group flex flex-col items-center justify-center h-48 border border-dashed rounded-lg transition-all duration-200
            ${dragActive ? 'border-white bg-zinc-900' : 'border-zinc-800 bg-black hover:border-zinc-600'}
            ${isAnalyzing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 bg-zinc-900 rounded-md border border-zinc-800 text-zinc-400 group-hover:text-white transition-colors">
              <Upload size={20} />
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-400 group-hover:text-zinc-200 font-medium">
                Upload Record Photos
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Required: Front & Back Cover. Optional: Labels, Matrix.
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

      {/* Action Bar */}
      {!isCameraOpen && !isAnalyzing && (
        <div className="flex gap-2">
           <button 
            onClick={(e) => { e.stopPropagation(); startCamera(); }}
            className="flex-1 py-2 flex items-center justify-center gap-2 text-sm text-zinc-400 border border-zinc-800 rounded-lg hover:bg-zinc-900 hover:text-white transition-colors"
           >
            <Camera size={16} />
            <span>Use Camera</span>
          </button>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2 animate-in fade-in slide-in-from-bottom-2">
            {files.map((file, idx) => (
              <div key={file.id} className="relative aspect-square group rounded-md overflow-hidden border border-zinc-800 bg-zinc-900">
                <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
                {!isAnalyzing && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute top-1 right-1 p-1 bg-black/80 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                )}
                <div className="absolute bottom-1 left-1 bg-black/60 px-1 rounded text-[10px] text-white">
                   {idx === 0 ? "Front" : idx === 1 ? "Back" : "Extra"}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Uploader;
