import React from 'react';
import { ExternalLink } from 'lucide-react';
import { VinylRecord } from '../types';

interface VinylCardProps {
  record: VinylRecord;
}

const VinylCard: React.FC<VinylCardProps> = ({ record }) => {
  return (
    <div className="group bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-600 transition-all">
      <div className="flex gap-4 p-4">
        {/* Thumb */}
        <div className="w-20 h-20 shrink-0 bg-black rounded-md overflow-hidden border border-zinc-800">
          <img 
            src={record.originalImage} 
            alt={record.title} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
          />
        </div>

        {/* Info */}
        <div className="flex flex-col min-w-0 flex-1">
          <h3 className="text-sm font-medium text-white truncate">{record.title}</h3>
          <p className="text-xs text-zinc-400 truncate mb-2">{record.artist}</p>
          
          <div className="flex flex-wrap gap-1.5 mt-auto">
             {record.year && (
               <span className="px-1.5 py-0.5 bg-zinc-800 text-[10px] text-zinc-400 rounded-sm font-mono border border-zinc-700/50">
                 {record.year}
               </span>
             )}
             {record.catalogNumber && (
               <span className="px-1.5 py-0.5 bg-zinc-800 text-[10px] text-zinc-400 rounded-sm font-mono border border-zinc-700/50">
                 {record.catalogNumber}
               </span>
             )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-3">
          {record.description}
        </p>
        
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
          <span className="text-xs font-mono text-zinc-300">
            {record.estimatedPrice || 'N/A'}
          </span>
          
          {record.discogsUrl && (
            <a 
              href={record.discogsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
            >
              Discogs <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default VinylCard;