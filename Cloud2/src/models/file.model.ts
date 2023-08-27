import { User } from "./user.model";

export class File {
  id?: number;
  fileName?: string;
  fileSize?: number;
  uploadDate?: Date; 
  mediaType?: string;
  data?: string;
  isUnsafe?: boolean;
  pendingReviewBy?: User;
  ownerId?: number;

  constructor(fileInput: FileInput) {
    this.fileName = fileInput.fileName;
    this.fileSize = fileInput.fileSize;
    this.uploadDate = new Date(); 
    this.mediaType = fileInput.mediaType;
    this.data = fileInput.data;
    this.isUnsafe = fileInput.isUnsafe;
    this.pendingReviewBy = fileInput.pendingReviewBy;
    this.ownerId = fileInput.ownerId;
  }
}

export interface FileInput {
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  encoding: string;
  duration?: number;
  mediaType?: string;
  data: string;
  isUnsafe: boolean;
  pendingReviewBy?: User;
  ownerId?: number;
}
