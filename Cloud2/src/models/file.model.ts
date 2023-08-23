import { Admin } from "./user.model";

export class File {
    id: number;
    fileName: string;
    fileSize: number;
    fileType: string;
    storagePath: string;
    uploadDate: Date;
    encoding: string;
    duration?: number;
    mediaType?: string;
    data: string;
    isUnsafe: boolean;
    isPendingDeletion: boolean;
    pendingReviewBy?: Admin; // Assuming Admin is defined
  }
  
  export interface FileInput {
    fileName: string;
    fileSize: number;
    fileType: string;
    storagePath: string;
    uploadDate: Date;
    encoding: string;
    duration?: number;
    mediaType?: string;
    data: string;
    isUnsafe: boolean;
    isPendingDeletion: boolean;
  }
  