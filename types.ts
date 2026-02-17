export interface VinylRecord {
  id: string;
  artist: string;
  title: string;
  year: string;
  label: string;
  catalogNumber: string;
  country?: string;
  condition?: string;
  estimatedPrice: string;
  discogsUrl: string;
  description: string;
  format?: string;
  images: string[]; // Array of base64 strings
  dateAdded: number;
}

export interface DraftRecord {
  artist: string;
  title: string;
  year: string;
  label: string;
  catalogNumber: string;
  country: string;
  format: string;
  estimatedPrice: string;
  discogsUrl: string;
  description: string;
  validationWarning?: string; // If front/back missing or unclear
  isValid: boolean;
}

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
}
