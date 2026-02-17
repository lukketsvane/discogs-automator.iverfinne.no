import React from 'react';
import { ExternalLink, Disc, Calendar, Globe } from 'lucide-react';
import { VinylRecord } from '../types';

interface VinylCardProps {
  record: VinylRecord;
}

const VinylCard: React.FC<VinylCardProps> = ({ record }) => {
  return (
    <div className="group bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 hover:bg-zinc-900/50 transition-all flex flex-col md:flex-row">
      {/* Image Section */}
      <div className="relative w-full md:w-32 aspect-square md:aspect-auto shrink-0 bg-black border-b md:border-b-0 md:border-r border-zinc-800">
        <img 
          src={record.images[0]} 
          alt={record.title} 
          className="w-full h-full object-cover" 
        />
        {record.images.length > 1 && (
            <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 font-mono">
                +{record.images.length - 1}
            </div>
        )}
      </div>

      {/* Details Section */}
      <div className="flex-1 p-4 md:p-5 flex flex-col justify-between gap-4">
        <div>
           <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">{record.title}</h3>
                <p className="text-zinc-400 font-medium">{record.artist}</p>
              </div>
              <div className="text-right shrink-0">
                  <p className="text-amber-500 font-mono font-bold">{record.estimatedPrice}</p>
              </div>
           </div>

           <div className="mt-3 flex flex-wrap gap-2">
              {record.year && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 border border-zinc-800 rounded text-xs text-zinc-400">
                   <Calendar size={12} /> {record.year}
                </div>
              )}
              {record.country && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 border border-zinc-800 rounded text-xs text-zinc-400">
                   <Globe size={12} /> {record.country}
                </div>
              )}
              {record.catalogNumber && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 border border-zinc-800 rounded text-xs text-zinc-400 font-mono">
                   <Disc size={12} /> {record.catalogNumber}
                </div>
              )}
               {record.format && (
                <div className="px-2 py-1 bg-zinc-800/50 border border-zinc-800 rounded text-xs text-zinc-500">
                   {record.format}
                </div>
              )}
           </div>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50 mt-auto">
            <span className="text-xs text-zinc-500 truncate max-w-[200px]">{record.label}</span>
            {record.discogsUrl && (
                <a 
                href={record.discogsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
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
