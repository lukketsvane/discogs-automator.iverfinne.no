export interface VinylRecord {
  id: string; // Unique ID for key mapping
  originalImage: string; // Base64 of the uploaded image
  artist: string;
  title: string;
  year?: string;
  label?: string;
  catalogNumber?: string;
  estimatedPrice?: string;
  discogsUrl?: string;
  description: string;
  genre?: string;
  confidenceScore: number; // 0-100
}

export interface AnalysisResult {
  records: VinylRecord[];
}

export type ProcessingStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
}
