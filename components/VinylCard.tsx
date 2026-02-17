import React from 'react';
import { ExternalLink, Calendar, MapPin } from 'lucide-react';
import { VinylRecord } from '../types';

interface VinylCardProps {
  record: VinylRecord;
}

const VinylCard: React.FC<VinylCardProps> = ({ record }) => {
  return (
    <div className="group bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden hover:border-[#333] transition-all press-scale">
      <div className="flex">

        {/* Image */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-black">
          {record.images[0] && (
            <img
              src={record.images[0]}
              alt={record.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          {record.images.length > 1 && (
            <div className="absolute bottom-0.5 right-0.5 bg-black/80 px-1 py-0.5 rounded text-[9px] text-[#888] font-mono backdrop-blur-sm">
              +{record.images.length - 1}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{record.title}</h3>
                <p className="text-xs text-[#888] truncate">{record.artist}</p>
              </div>
              {record.estimatedPrice && record.estimatedPrice !== 'N/A' && (
                <span className="text-xs font-mono text-[#888] shrink-0">{record.estimatedPrice}</span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {record.year && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#111] border border-[#1a1a1a] rounded text-[10px] text-[#666]">
                  <Calendar size={9} /> {record.year}
                </span>
              )}
              {record.country && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#111] border border-[#1a1a1a] rounded text-[10px] text-[#666]">
                  <MapPin size={9} /> {record.country}
                </span>
              )}
              {record.catalogNumber && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#111] border border-[#1a1a1a] rounded text-[10px] text-[#666] font-mono">
                  {record.catalogNumber}
                </span>
              )}
              {record.format && (
                <span className="px-1.5 py-0.5 bg-[#111] border border-[#1a1a1a] rounded text-[10px] text-[#555]">
                  {record.format}
                </span>
              )}
            </div>
          </div>

          {record.discogsUrl && (
            <div className="mt-2 pt-2 border-t border-[#111]">
              <a
                href={record.discogsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#555] hover:text-white flex items-center gap-1 transition-colors w-fit"
              >
                Discogs <ExternalLink size={9} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VinylCard;
