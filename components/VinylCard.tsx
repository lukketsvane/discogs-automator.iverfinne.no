import React from 'react';
import { ExternalLink, DollarSign, Calendar, Music2, Disc } from 'lucide-react';
import { VinylRecord } from '../types';

interface VinylCardProps {
  record: VinylRecord;
}

const VinylCard: React.FC<VinylCardProps> = ({ record }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors flex flex-col h-full shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-zinc-950">
        <img 
          src={record.originalImage} 
          alt={record.title} 
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
        />
        <div className="absolute top-3 left-3 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          {record.confidenceScore > 80 ? 'High Confidence' : 'Uncertain'}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white leading-tight mb-1">{record.title}</h3>
          <p className="text-zinc-400 font-medium">{record.artist}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded-lg">
            <Calendar size={14} className="text-zinc-500" />
            <span className="truncate">{record.year || 'Unknown Year'}</span>
          </div>
          <div className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded-lg">
            <Disc size={14} className="text-zinc-500" />
            <span className="truncate">{record.catalogNumber || 'No Cat#'}</span>
          </div>
          <div className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded-lg col-span-2">
            <Music2 size={14} className="text-zinc-500" />
            <span className="truncate">{record.label || 'Unknown Label'} • {record.genre || 'Music'}</span>
          </div>
        </div>

        <p className="text-sm text-zinc-500 leading-relaxed line-clamp-3">
          {record.description}
        </p>

        <div className="mt-auto pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex flex-col">
             <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Est. Value</span>
             <span className="text-amber-500 font-bold font-mono">{record.estimatedPrice || 'N/A'}</span>
          </div>

          {record.discogsUrl && (
            <a 
              href={record.discogsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors"
            >
              View on Discogs <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default VinylCard;
