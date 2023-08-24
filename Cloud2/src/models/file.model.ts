import { Admin } from "./user.model";

export class File {
    id: number | undefined;
    fileName: string | undefined;
    fileSize: number | undefined;
    fileType: string | undefined;
    storagePath?: string;
    uploadDate: Date | undefined;
    encoding: string | undefined;
    duration?: number;
    mediaType?: string;
    data: string | undefined;
    isUnsafe: boolean | undefined;
    isPendingDeletion: boolean | undefined;
    pendingReviewBy?: Admin;
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
  