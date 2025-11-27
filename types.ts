export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface StickerImage {
  id: string;
  originalFile: File;
  previewUrl: string;
  processedBlob: Blob | null;
  processedUrl: string | null;
  status: ProcessingStatus;
  error?: string;
  dimensions: { width: number; height: number };
  sizeKB: number;
}
