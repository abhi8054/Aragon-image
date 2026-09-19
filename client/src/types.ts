export type ServerStatus = "PROCESSING" | "ACCEPTED" | "REJECTED";

export interface ServerImage {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  status: ServerStatus;
  rejectionReasons: string[];
  previewUrl: string;
  createdAt: string;
}

export type UploadStatus = "uploading" | "processing" | "accepted" | "rejected";

export interface UploadItem {
  clientId: string;
  fileName: string;
  localPreviewUrl: string;
  status: UploadStatus;
  reasons: string[];
  serverImage?: ServerImage;
}
