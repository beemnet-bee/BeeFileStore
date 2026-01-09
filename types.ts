
export type FileCategory = 'all' | 'images' | 'videos' | 'documents' | 'others';

export interface BeeFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  ownerId: string;
  blobId: string; // Key in IndexedDB
  category: FileCategory;
}

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
}

export enum StorageStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type AuthMode = 'landing' | 'login' | 'signup';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  mode: AuthMode;
}
