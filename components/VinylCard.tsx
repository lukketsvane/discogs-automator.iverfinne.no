import React from 'react';
import { ExternalLink, Trash2, ChevronRight } from 'lucide-react';
import { VinylRecord, DiscogsCollectionItem } from '../types';
import { useSwipeAction } from '../hooks/useSwipe';

interface VinylCardProps {
  record?: VinylRecord;
  discogsItem?: DiscogsCollectionItem;
  onTap?: () => void;
  onDelete?: () => void;
}

const VinylCard: React.FC<VinylCardProps> = ({ record, discogsItem, onTap, onDelete }) => {
  const swipe = useSwipeAction(onDelete);

  // Normalize data from either source
  const title = record?.title || discogsItem?.basic_information?.title || 'Unknown';
  const artist = record?.artist || discogsItem?.basic_information?.artists?.map(a => a.name).join(', ') || 'Unknown';
  const year = record?.year || (discogsItem?.basic_information?.year ? String(discogsItem.basic_information.year) : '');
  const thumb = record?.images?.[0] || discogsItem?.basic_information?.thumb || discogsItem?.basic_information?.cover_image || '';
  const format = record?.format || discogsItem?.basic_information?.formats?.map(f => f.name).join(', ') || '';
  const label = record?.label || discogsItem?.basic_information?.labels?.[0]?.name || '';
  const catno = record?.catalogNumber || discogsItem?.basic_information?.labels?.[0]?.catno || '';
  const releaseId = record?.discogsReleaseId || discogsItem?.basic_information?.id;
  const discogsUrl = record?.discogsUrl || (releaseId ? `https://www.discogs.com/release/${releaseId}` : '');

  return (
    <div
      className="swipe-card rounded-xl overflow-hidden"
      onTouchStart={swipe.onTouchStart}
      onTouchMove={swipe.onTouchMove}
      onTouchEnd={swipe.onTouchEnd}
    >
      {/* Swipe action buttons behind the card */}
      <div className="absolute inset-y-0 right-0 flex">
        {discogsUrl && (
          <a
            href={discogsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-20 flex items-center justify-center bg-[#1a1a1a]"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={18} className="text-blue-400" />
          </a>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-20 flex items-center justify-center bg-red-600"
          >
            <Trash2 size={18} className="text-white" />
          </button>
        )}
      </div>

      {/* Card content */}
      <div
        className="swipe-card-content bg-[#0a0a0a] border border-[#1a1a1a] relative z-10"
        onClick={onTap}
      >
        <div className="flex items-center">
          {/* Album art */}
          <div className="relative w-16 h-16 shrink-0 bg-[#111]">
            {thumb ? (
              <img
                src={thumb}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border border-[#333]" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 px-3 py-2.5">
            <p className="text-[13px] font-semibold text-white truncate leading-tight">{title}</p>
            <p className="text-[11px] text-[#888] truncate mt-0.5">{artist}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {year && year !== '0' && (
                <span className="text-[10px] text-[#555] font-mono">{year}</span>
              )}
              {year && format && <span className="text-[10px] text-[#333]">&middot;</span>}
              {format && (
                <span className="text-[10px] text-[#555]">{format}</span>
              )}
              {(year || format) && label && <span className="text-[10px] text-[#333]">&middot;</span>}
              {label && (
                <span className="text-[10px] text-[#555] truncate">{label}</span>
              )}
            </div>
          </div>

          {/* Chevron */}
          <div className="pr-3 shrink-0">
            <ChevronRight size={14} className="text-[#333]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VinylCard;
