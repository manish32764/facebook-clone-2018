import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getStoredToken, setStoredToken, toErrorMessage } from '@/api/client';
import { authApi, userApi } from '@/api/endpoints';
import { AuthContext, type AuthContextValue } from './auth-context';
import type { LoginPayload, RegisterPayload, User } from '@/types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // A token in localStorage is only a claim; verify it against /users/me before trusting it.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getStoredToken()) {
        setIsBootstrapping(false);
        return;
      }
      try {
        const me = await userApi.me();
        if (!cancelled) setUser(me);
      } catch {
        setStoredToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    try {
      const result = await authApi.login(payload);
      setStoredToken(result.token);
      setUser(result.user);
    } catch (error) {
      throw new Error(toErrorMessage(error, 'Could not sign you in'));
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    try {
      const result = await authApi.register(payload);
      setStoredToken(result.token);
      setUser(result.user);
    } catch (error) {
      throw new Error(toErrorMessage(error, 'Could not create your account'));
    }
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getStoredToken()) return;
    setUser(await userApi.me());
  }, []);

  const patchUser = useCallback((updates: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...updates } : current));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isBootstrapping,
      login,
      register,
      logout,
      refreshUser,
      patchUser,
    }),
    [user, isBootstrapping, login, register, logout, refreshUser, patchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
