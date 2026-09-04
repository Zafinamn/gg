export interface ImportantDataPoint {
  label: string;
  value: string;
  category: 'date' | 'number' | 'fact' | 'other' | string;
}

export interface ImportantSection {
  title: string;
  description: string;
}

export interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
  importantSections: ImportantSection[];
  mainTopics: string[];
  importantData: ImportantDataPoint[];
  documentType: string;
  readingTimeMinutes?: number;
}

export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  base64: string;
  blobUrl: string;
  pdfUrl?: string;
  analysis?: DocumentAnalysis;
  totalPages?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export type ProcessingStep = 
  | 'reading' 
  | 'understanding' 
  | 'extracting' 
  | 'preparing' 
  | 'done';

export type SpreadViewMode = 'double' | 'single';

export interface CatalogBookmark {
  id: string;
  pageNumber: number;
  title: string;
  createdAt: number;
}
