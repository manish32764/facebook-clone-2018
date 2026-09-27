import { createContext } from 'react';
import type { LoginPayload, RegisterPayload, User } from '@/types';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** True only while the stored token is being exchanged for a profile on boot. */
  isBootstrapping: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  patchUser: (updates: Partial<User>) => void;
}

/**
 * Lives apart from the provider component so the provider file exports only
 * components - which is what keeps Fast Refresh working during development.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
