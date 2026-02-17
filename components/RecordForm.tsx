import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { DraftRecord, VinylRecord, UploadedFile } from '../types';

interface RecordFormProps {
  draft: DraftRecord;
  images: UploadedFile[];
  onSave: (record: VinylRecord) => void;
  onCancel: () => void;
}

const RecordForm: React.FC<RecordFormProps> = ({ draft, images, onSave, onCancel }) => {
  const [formData, setFormData] = useState<DraftRecord>(draft);

  // Sync draft prop to state if it changes
  useEffect(() => {
    setFormData(draft);
  }, [draft]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalRecord: VinylRecord = {
      id: crypto.randomUUID(),
      ...formData,
      images: images.map(img => img.preview), // In a real app, these would be uploaded URLs
      dateAdded: Date.now(),
      artist: formData.artist || 'Unknown Artist',
      title: formData.title || 'Unknown Title',
      estimatedPrice: formData.estimatedPrice || 'N/A',
      discogsUrl: formData.discogsUrl || '',
      description: formData.description || '',
      label: formData.label || '',
      catalogNumber: formData.catalogNumber || '',
      year: formData.year || '',
    };

    onSave(finalRecord);
  };

  const InputField = ({ label, name, placeholder = '' }: { label: string, name: keyof DraftRecord, placeholder?: string }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        name={name}
        value={String(formData[name as keyof DraftRecord] || '')}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all"
      />
    </div>
  );

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Validation Warning Banner */}
      {!formData.isValid && (
        <div className="bg-amber-900/20 border-b border-amber-900/50 p-4 flex gap-3 items-start text-amber-200">
           <AlertTriangle size={18} className="shrink-0 mt-0.5" />
           <div className="space-y-1">
             <p className="text-sm font-semibold">Verification Needed</p>
             <p className="text-xs opacity-90">{formData.validationWarning || "The AI could not fully verify this pressing. Please ensure details are correct."}</p>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* Left: Images & Quick Actions */}
        <div className="md:col-span-4 bg-black/40 border-r border-zinc-800 p-6 space-y-4">
           <div className="aspect-square bg-black border border-zinc-800 rounded-lg overflow-hidden relative">
              {images.length > 0 && (
                <img src={images[0].preview} className="w-full h-full object-cover" alt="Main cover" />
              )}
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-mono text-zinc-400">
                 {images.length} images
              </div>
           </div>
           
           <div className="grid grid-cols-3 gap-2">
              {images.slice(1, 4).map((img) => (
                 <div key={img.id} className="aspect-square bg-black border border-zinc-800 rounded overflow-hidden">
                    <img src={img.preview} className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity" alt="Thumb" />
                 </div>
              ))}
           </div>
        </div>

        {/* Right: Form */}
        <div className="md:col-span-8 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Edit Details</h3>
                <button type="button" onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
                   <X size={20} />
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Artist" name="artist" />
                <InputField label="Title" name="title" />
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InputField label="Year" name="year" />
                <InputField label="Format" name="format" />
                <InputField label="Country" name="country" />
                <InputField label="Cat #" name="catalogNumber" />
             </div>

             <InputField label="Label" name="label" />

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Est. Price" name="estimatedPrice" />
                <div className="space-y-1.5">
                   <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Discogs URL</label>
                   <div className="relative">
                     <input
                        type="text"
                        name="discogsUrl"
                        value={formData.discogsUrl}
                        onChange={handleChange}
                        className="w-full bg-black border border-zinc-800 rounded-md pl-3 pr-8 py-2 text-sm text-blue-400 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all"
                     />
                     {formData.discogsUrl && (
                        <a href={formData.discogsUrl} target="_blank" rel="noreferrer" className="absolute right-2 top-2.5 text-zinc-500 hover:text-white">
                           <ExternalLink size={14} />
                        </a>
                     )}
                   </div>
                </div>
             </div>

             <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Description & Notes</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all resize-none"
                />
             </div>

             <div className="pt-4 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                   Cancel
                </button>
                <button 
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                   <Save size={16} />
                   Confirm & Add
                </button>
             </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecordForm;
