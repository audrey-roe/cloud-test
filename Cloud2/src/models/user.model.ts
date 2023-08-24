import bcrypt from 'bcrypt';
import { FileInput } from './file.model';
import { Folder, FolderInput } from './folder.models';
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

export class User {
  id: number | undefined;
  email!: string;
  password!: string;
  name!: string;
  files: File[] = [];
  folders: Folder[] = [];
  rootFolders: Folder[] = [];
  isSessionRevoked!: boolean;
  isAdmin!: boolean;

  async hashPassword(): Promise<void> {
    const salt = await bcrypt.genSalt((process.env.saltWorkFactor, 10));
    this.password = await bcrypt.hash(this.password, salt);
  }

  async createRootFolder(folderName: string): Promise<Folder> {
    const folder: Folder = {
      name: folderName,
      ownerId: this.id,
      files: [],
      subfolders: [],
      id: undefined
    };
    this.rootFolders.push(folder);
    return folder;
  }
}

export interface UserInput {
  name: string;
  email: string;
  password: string;
  is_admin?: boolean;
}

export class Admin extends User {
  // filesPendingDeletion: File[] = [];
}

