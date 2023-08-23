import bcrypt from 'bcrypt';

export class User {
  id: number;
  email: string;
  password: string;
  fullName: string;
  files: File[] = [];
  folders: Folder[] = [];
  isSessionRevoked: boolean;

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password).catch(() => false);
  }

  async hashPassword(): Promise<void> {
    const salt = await bcrypt.genSalt((process.env.saltWorkFactor, 10));
    this.password = await bcrypt.hash(this.password, salt);
  }
}

export interface UserInput {
  name: string;
  email: string;
  password: string;
  // files: FileInput[];
  // folders: FolderInput[];
}
// Import the PostgreSQL client instance

export class Admin extends User {
  isAdmin: boolean;
  // filesPendingDeletion: File[] = [];
}
