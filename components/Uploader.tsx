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

  // ─── Fullscreen Camera (iOS-native style) ───
  if (isCameraOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col safe-top safe-bottom">
        <video ref={videoRef} className="flex-1 w-full object-cover" playsInline muted autoPlay />
        <canvas ref={canvasRef} className="hidden" />

        {/* Top guidance */}
        <div className="absolute top-0 left-0 right-0 safe-top pt-3 text-center pointer-events-none">
          <span className="inline-block bg-black/60 text-white px-3 py-1 rounded-full text-[11px] font-medium backdrop-blur-md">
            {files.length === 0 ? "Front Cover" : files.length === 1 ? "Back Cover" : "Labels / Details"}
          </span>
        </div>

        {/* Bottom controls */}
        <div className="safe-bottom bg-black/90 backdrop-blur-xl px-6 py-5 flex justify-center items-center gap-12">
          <button onClick={stopCamera} className="w-11 h-11 rounded-full bg-[#222] text-white flex items-center justify-center press-scale">
            <X size={20} />
          </button>
          <button onClick={capturePhoto} className="w-[68px] h-[68px] rounded-full bg-white flex items-center justify-center press-scale border-[3px] border-[#333]">
            <div className="w-[56px] h-[56px] rounded-full bg-white border-2 border-[#ddd]" />
          </button>
          <div className="w-11 h-11" />
        </div>

        {/* Thumbnail strip */}
        {files.length > 0 && (
          <div className="absolute bottom-24 left-3 flex gap-1.5">
            {files.slice(-3).map(f => (
              <div key={f.id} className="w-11 h-11 rounded-lg overflow-hidden border border-[#333] opacity-80">
                <img src={f.preview} className="w-full h-full object-cover" alt="" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Compact mode (for agent Q&A) ───
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 flex items-center justify-center gap-1.5 text-[11px] text-[#888] bg-[#111] border border-[#222] rounded-lg press-scale"
          >
            <ImageIcon size={13} /> Upload
          </button>
          <button
            onClick={startCamera}
            className="flex-1 py-2 flex items-center justify-center gap-1.5 text-[11px] text-[#888] bg-[#111] border border-[#222] rounded-lg press-scale"
          >
            <Camera size={13} /> Camera
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
              <div key={f.id} className="relative w-11 h-11 rounded overflow-hidden border border-[#222]">
                <img src={f.preview} className="w-full h-full object-cover" alt="" />
                <button onClick={() => removeFile(f.id)} className="absolute top-0 right-0 p-0.5 bg-black/80 text-white rounded-bl">
                  <X size={9} />
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
    <div className="w-full space-y-3">
      {/* Upload area */}
      <div
        onClick={() => !isAnalyzing && fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center py-10 border border-dashed rounded-xl transition-all duration-200
          border-[#222]
          ${isAnalyzing ? 'opacity-40 pointer-events-none' : 'cursor-pointer active:border-[#444]'}
        `}
      >
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-11 h-11 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center text-[#555]">
            <Upload size={18} />
          </div>
          <div className="text-center">
            <p className="text-[13px] text-[#888] font-medium">
              Tap to upload photos
            </p>
            <p className="text-[11px] text-[#555] mt-0.5">
              Front, back, labels, matrix
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

      {/* Camera button */}
      {!isAnalyzing && (
        <button
          onClick={(e) => { e.stopPropagation(); startCamera(); }}
          className="w-full py-2.5 flex items-center justify-center gap-2 text-[13px] text-[#888] border border-[#222] rounded-xl press-scale"
        >
          <Camera size={15} />
          Camera
        </button>
      )}

      {/* Image previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 animate-slide-up">
          {files.map((file, idx) => (
            <div key={file.id} className="relative aspect-square group rounded-lg overflow-hidden border border-[#222] bg-[#0a0a0a]">
              <img src={file.preview} alt="" className="w-full h-full object-cover" />
              {!isAnalyzing && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/80 text-white rounded-md backdrop-blur-sm"
                >
                  <X size={11} />
                </button>
              )}
              <div className="absolute bottom-0.5 left-0.5 bg-black/70 px-1 py-0.5 rounded text-[9px] text-[#999] font-medium backdrop-blur-sm">
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
