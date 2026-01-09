export type UserRole = 'admin' | 'developer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  oktaId?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AWSAccountConnection {
  id: string;
  accountId: string;
  accountName: string;
  roleArn: string;
  externalId?: string;
  status: 'connected' | 'pending' | 'failed';
  lastVerified?: string;
  createdAt: string;
  createdBy: string;
}
