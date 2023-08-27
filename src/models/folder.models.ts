export class Folder {
    id: string | undefined;
    name: string | undefined;
    ownerId: number | undefined;
    parentFolderId?: number; 
    files: File[] = [];
    subfolders: Folder[] = []; 
}

export interface FolderInput {
    name: string;
    parentFolderId?: number; // Optional reference to the parent folder's ID
}
  