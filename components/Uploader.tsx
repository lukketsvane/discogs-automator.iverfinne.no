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
            stopCamera(); 
          }
        }, 'image/jpeg', 0.8);
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
    <div className="w-full">
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
          onClick={() => !isAnalyzing && fileInputRef.current?.click()}
          className={`
            relative group flex flex-col items-center justify-center h-48 border border-dashed rounded-lg transition-all duration-200
            ${dragActive ? 'border-white bg-zinc-900' : 'border-zinc-700 bg-black hover:border-zinc-500'}
            ${isAnalyzing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 bg-zinc-900 rounded-md border border-zinc-800 text-zinc-400 group-hover:text-white transition-colors">
              <Upload size={20} />
            </div>
            <p className="text-sm text-zinc-500 group-hover:text-zinc-300 font-medium">
              Drop files or click to upload
            </p>
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

      {/* Camera Button Mobile / Desktop quick access */}
      {!isCameraOpen && !isAnalyzing && (
        <button 
          onClick={(e) => { e.stopPropagation(); startCamera(); }}
          className="mt-4 w-full py-2 flex items-center justify-center gap-2 text-sm text-zinc-400 border border-zinc-800 rounded-lg hover:bg-zinc-900 hover:text-white transition-colors"
        >
          <Camera size={16} />
          <span>Use Camera</span>
        </button>
      )}

      {/* Preview Grid */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 uppercase tracking-wider font-semibold">
             <span>Queue ({files.length})</span>
             <button onClick={() => setFiles([])} className="hover:text-white">Clear</button>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {files.map((file) => (
              <div key={file.id} className="relative aspect-square group rounded-md overflow-hidden border border-zinc-800 bg-zinc-900">
                <img src={file.preview} alt="Preview" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                {!isAnalyzing && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute top-1 right-1 p-1 bg-black text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Uploader;