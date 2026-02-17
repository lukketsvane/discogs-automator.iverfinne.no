
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

export interface QuestionOption {
  label: string;
  value: string;
}

export interface AgentQuestion {
  text: string;
  type: 'text' | 'choice' | 'image_request';
  options?: QuestionOption[];
  allowImageUpload?: boolean;
}

export interface AgentResponse {
  logs: string[]; // Steps the agent took (e.g., "Detected text...", "Searching web...")
  status: 'complete' | 'clarification_needed' | 'error';
  question?: AgentQuestion;
  record?: DraftRecord;
  error?: string;
}
