import React, { useRef, useState, useCallback } from 'react';
import { Upload, Camera, X, Image as ImageIcon } from 'lucide-react';
import { UploadedFile } from '../types';

interface UploaderProps {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  isAnalyzing: boolean;
  compact?: boolean;
}

const Uploader: React.FC<UploaderProps> = ({ files, setFiles, isAnalyzing, compact = false }) => {
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
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
        }, 'image/jpeg', 0.92);
      }
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  // ─── Camera Fullscreen (iOS-optimized) ───
  if (isCameraOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <video ref={videoRef} className="flex-1 w-full object-cover" playsInline muted autoPlay />
        <canvas ref={canvasRef} className="hidden" />

        <div className="absolute top-0 left-0 right-0 safe-top pt-4 text-center pointer-events-none">
          <span className="inline-block bg-black/60 text-white px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-md">
            {files.length === 0 ? "Front Cover" : files.length === 1 ? "Back Cover" : "Labels / Details"}
          </span>
        </div>

        <div className="safe-bottom bg-black/90 backdrop-blur-xl px-6 py-6 flex justify-center items-center gap-12">
          <button onClick={stopCamera} className="w-12 h-12 rounded-full bg-[#222] text-white flex items-center justify-center press-scale">
            <X size={22} />
          </button>
          <button onClick={capturePhoto} className="w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center press-scale border-4 border-[#333]">
            <div className="w-14 h-14 rounded-full bg-white border-2 border-[#ddd]" />
          </button>
          <div className="w-12 h-12" />
        </div>

        {files.length > 0 && (
          <div className="absolute bottom-28 left-4 flex gap-2">
            {files.slice(-3).map(f => (
              <div key={f.id} className="w-12 h-12 rounded-lg overflow-hidden border border-[#333] opacity-80">
                <img src={f.preview} className="w-full h-full object-cover" alt="" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Compact mode (for in-agent image requests) ───
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 flex items-center justify-center gap-2 text-xs text-[#888] bg-[#111] border border-[#222] rounded-lg hover:border-[#444] transition-colors press-scale"
          >
            <ImageIcon size={14} /> Upload
          </button>
          <button
            onClick={startCamera}
            className="flex-1 py-2.5 flex items-center justify-center gap-2 text-xs text-[#888] bg-[#111] border border-[#222] rounded-lg hover:border-[#444] transition-colors press-scale"
          >
            <Camera size={14} /> Camera
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          multiple
          accept="image/*"
          capture="environment"
          className="hidden"
        />
        {files.length > 0 && (
          <div className="flex gap-1.5">
            {files.map(f => (
              <div key={f.id} className="relative w-12 h-12 rounded overflow-hidden border border-[#222]">
                <img src={f.preview} className="w-full h-full object-cover" alt="" />
                <button onClick={() => removeFile(f.id)} className="absolute top-0 right-0 p-0.5 bg-black/80 text-white rounded-bl">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Full Upload UI ───
  return (
    <div className="w-full space-y-4">
      <div
        onDragEnter={onDragEnter}
        onDragOver={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isAnalyzing && fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center py-12 border border-dashed rounded-xl transition-all duration-200
          ${dragActive ? 'border-white/30 bg-white/[0.02]' : 'border-[#222] hover:border-[#444]'}
          ${isAnalyzing ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}
        `}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center text-[#555]">
            <Upload size={20} />
          </div>
          <div className="text-center">
            <p className="text-sm text-[#888] font-medium">
              Drop record photos here
            </p>
            <p className="text-xs text-[#555] mt-1">
              Front cover, back cover, labels, matrix
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

      {!isAnalyzing && (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); startCamera(); }}
            className="flex-1 py-3 flex items-center justify-center gap-2 text-sm text-[#888] border border-[#222] rounded-xl hover:border-[#444] hover:text-white transition-colors press-scale"
          >
            <Camera size={16} />
            Camera
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2 animate-slide-up">
          {files.map((file, idx) => (
            <div key={file.id} className="relative aspect-square group rounded-lg overflow-hidden border border-[#222] bg-[#0a0a0a]">
              <img src={file.preview} alt="" className="w-full h-full object-cover" />
              {!isAnalyzing && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  className="absolute top-1 right-1 p-1 bg-black/80 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                >
                  <X size={12} />
                </button>
              )}
              <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-[#999] font-medium backdrop-blur-sm">
                {idx === 0 ? "Front" : idx === 1 ? "Back" : `#${idx + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Uploader;
