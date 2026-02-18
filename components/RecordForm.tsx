import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, ExternalLink, Loader2, Plus } from 'lucide-react';
import { DraftRecord, VinylRecord, UploadedFile } from '../types';
import { DiscogsClient } from '../services/discogsService';
import { uploadToImgBB } from '../services/imgbbService';

interface RecordFormProps {
  draft: DraftRecord;
  images: UploadedFile[];
  onSave: (record: VinylRecord) => void;
  onCancel: () => void;
  discogsToken?: string;
  discogsUsername?: string;
}

const RecordForm: React.FC<RecordFormProps> = ({ draft, images, onSave, onCancel, discogsToken, discogsUsername }) => {
  const [formData, setFormData] = useState<DraftRecord>(draft);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingToDiscogs, setIsAddingToDiscogs] = useState(false);
  const [addedToDiscogs, setAddedToDiscogs] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [discogsError, setDiscogsError] = useState('');

  useEffect(() => {
    setFormData(draft);
  }, [draft]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const uploadImagesToImgBB = async (): Promise<string[]> => {
    setUploadingImages(true);
    try {
      const urls = await Promise.all(
        images.map(async (img) => {
          if (img.imgbbUrl) return img.imgbbUrl;
          try {
            return await uploadToImgBB(img.file);
          } catch {
            return img.preview;
          }
        })
      );
      return urls;
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const imageUrls = await uploadImagesToImgBB();

      const finalRecord: VinylRecord = {
        id: crypto.randomUUID(),
        ...formData,
        images: imageUrls,
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
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const addToDiscogsCollection = async () => {
    if (!discogsToken || !discogsUsername || !formData.discogsReleaseId) return;
    setIsAddingToDiscogs(true);
    setDiscogsError('');

    try {
      const client = new DiscogsClient(discogsToken);
      await client.addToCollection(discogsUsername, formData.discogsReleaseId);
      setAddedToDiscogs(true);
    } catch (e: any) {
      setDiscogsError(e.message || 'Failed to add to Discogs');
    } finally {
      setIsAddingToDiscogs(false);
    }
  };

  const InputField = ({ label, name, placeholder = '' }: { label: string, name: keyof DraftRecord, placeholder?: string }) => (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-[#666] uppercase tracking-wider">{label}</label>
      <input
        type="text"
        name={name}
        value={String(formData[name as keyof DraftRecord] || '')}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-black border border-[#222] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors"
      />
    </div>
  );

  return (
    <div className="space-y-4 animate-slide-up">

      {/* Warning banner */}
      {!formData.isValid && (
        <div className="bg-amber-950/15 border border-amber-900/20 rounded-xl px-4 py-3 flex gap-3 items-start">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500/70" />
          <div>
            <p className="text-[12px] font-medium text-amber-200/80">Verification needed</p>
            <p className="text-[11px] text-amber-200/50 mt-0.5">{formData.validationWarning || "Please verify these details."}</p>
          </div>
        </div>
      )}

      {/* Cover image */}
      <div className="aspect-[16/10] bg-black rounded-xl overflow-hidden border border-[#1a1a1a] relative">
        {images.length > 0 && (
          <img src={images[0].preview} className="w-full h-full object-cover" alt="Cover" />
        )}
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-mono text-[#888]">
          {images.length} image{images.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Extra images */}
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {images.slice(1, 5).map((img) => (
            <div key={img.id} className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-[#1a1a1a]">
              <img src={img.preview} className="w-full h-full object-cover" alt="" />
            </div>
          ))}
        </div>
      )}

      {/* Discogs actions */}
      {discogsToken && formData.discogsReleaseId && (
        <button
          onClick={addToDiscogsCollection}
          disabled={isAddingToDiscogs || addedToDiscogs}
          className={`w-full py-2.5 flex items-center justify-center gap-2 text-[12px] font-medium rounded-xl transition-all press-scale border ${
            addedToDiscogs
              ? 'bg-green-950/30 border-green-900/30 text-green-400'
              : 'bg-[#111] border-[#222] text-[#888]'
          }`}
        >
          {isAddingToDiscogs ? (
            <Loader2 size={14} className="animate-spin" />
          ) : addedToDiscogs ? (
            <><Plus size={14} /> Added to Collection</>
          ) : (
            <><Plus size={14} /> Add to Discogs Collection</>
          )}
        </button>
      )}
      {discogsError && (
        <p className="text-[10px] text-red-400 text-center">{discogsError}</p>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <InputField label="Artist" name="artist" />
        <InputField label="Title" name="title" />

        <div className="grid grid-cols-2 gap-2.5">
          <InputField label="Year" name="year" />
          <InputField label="Format" name="format" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <InputField label="Country" name="country" />
          <InputField label="Cat #" name="catalogNumber" />
        </div>

        <InputField label="Label" name="label" />

        <div className="grid grid-cols-2 gap-2.5">
          <InputField label="Est. Price" name="estimatedPrice" />
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#666] uppercase tracking-wider">Discogs URL</label>
            <div className="relative">
              <input
                type="text"
                name="discogsUrl"
                value={formData.discogsUrl}
                onChange={handleChange}
                className="w-full bg-black border border-[#222] rounded-lg pl-3 pr-8 py-2.5 text-[13px] text-blue-400 placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors"
              />
              {formData.discogsUrl && (
                <a href={formData.discogsUrl} target="_blank" rel="noreferrer" className="absolute right-2.5 top-3 text-[#555]">
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-[#666] uppercase tracking-wider">Notes</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={2}
            className="w-full bg-black border border-[#222] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] placeholder-[#333] focus:outline-none focus:border-[#444] transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-[13px] text-[#666] font-medium rounded-xl border border-[#222] press-scale"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || uploadingImages}
            className="flex-[2] flex items-center justify-center gap-2 py-3 bg-white text-black text-[13px] font-semibold rounded-xl press-scale disabled:opacity-50"
          >
            {isSaving || uploadingImages ? (
              <><Loader2 size={14} className="animate-spin" /> {uploadingImages ? 'Uploading...' : 'Saving...'}</>
            ) : (
              <><Save size={14} /> Save to Collection</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecordForm;
