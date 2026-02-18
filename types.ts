
// ─── Discogs User ─────────────────────────────────
export interface DiscogsUser {
  id: number;
  username: string;
  resource_url: string;
  consumer_name: string;
}

export interface DiscogsProfile {
  id: number;
  username: string;
  name: string;
  avatar_url: string;
  num_collection: number;
  num_wantlist: number;
  num_lists: number;
  location: string;
  profile: string;
  registered: string;
}

// ─── Discogs Search ───────────────────────────────
export interface DiscogsSearchResult {
  id: number;
  type: string;
  title: string;
  thumb: string;
  cover_image: string;
  uri: string;
  country: string;
  year: string;
  format: string[];
  label: string[];
  catno: string;
  community: {
    have: number;
    want: number;
  };
}

export interface DiscogsSearchResponse {
  results: DiscogsSearchResult[];
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
  };
}

// ─── Discogs Collection ──────────────────────────
export interface DiscogsCollectionItem {
  id: number;
  instance_id: number;
  folder_id: number;
  rating: number;
  date_added: string;
  basic_information: {
    id: number;
    title: string;
    year: number;
    thumb: string;
    cover_image: string;
    resource_url: string;
    artists: { name: string; id: number }[];
    labels: { name: string; catno: string; id: number }[];
    formats: { name: string; qty: string; descriptions?: string[] }[];
    genres: string[];
    styles: string[];
  };
  notes?: { field_id: number; value: string }[];
}

export interface DiscogsCollectionResponse {
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
  };
  releases: DiscogsCollectionItem[];
}

// ─── Records ──────────────────────────────────────
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
  discogsReleaseId?: number;
  description: string;
  format?: string;
  images: string[];
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
  discogsReleaseId?: number;
  description: string;
  validationWarning?: string;
  isValid: boolean;
}

// ─── Files ────────────────────────────────────────
export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  imgbbUrl?: string;
}

// ─── Agent ────────────────────────────────────────
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
  logs: string[];
  status: 'complete' | 'clarification_needed' | 'error';
  question?: AgentQuestion;
  record?: DraftRecord;
  error?: string;
}

// ─── App Views ────────────────────────────────────
export type AppView = 'home' | 'agent' | 'review' | 'detail';
export type TabView = 'collection' | 'identify' | 'settings';
