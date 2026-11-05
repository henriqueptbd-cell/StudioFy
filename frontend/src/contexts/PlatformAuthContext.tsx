import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { PlatformAdmin } from '@/types/platform';
import { PLATFORM_ADMIN_KEY, PLATFORM_TOKEN_KEY } from '@/services/platformApi';

interface PlatformAuthValue {
  token: string | null;
  admin: PlatformAdmin | null;
  isAuthenticated: boolean;
  signIn: (token: string, admin: PlatformAdmin) => void;
  signOut: () => void;
}
const PlatformAuthContext = createContext<PlatformAuthValue>({} as PlatformAuthValue);

function readAdmin(): PlatformAdmin | null {
  try {
    const stored = sessionStorage.getItem(PLATFORM_ADMIN_KEY);
    return stored ? (JSON.parse(stored) as PlatformAdmin) : null;
  } catch {
    return null;
  }
}

export const PlatformAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(PLATFORM_TOKEN_KEY),
  );
  const [admin, setAdmin] = useState<PlatformAdmin | null>(readAdmin);
  const signIn = useCallback((nextToken: string, nextAdmin: PlatformAdmin) => {
    sessionStorage.setItem(PLATFORM_TOKEN_KEY, nextToken);
    sessionStorage.setItem(PLATFORM_ADMIN_KEY, JSON.stringify(nextAdmin));
    setToken(nextToken);
    setAdmin(nextAdmin);
  }, []);
  const signOut = useCallback(() => {
    sessionStorage.removeItem(PLATFORM_TOKEN_KEY);
    sessionStorage.removeItem(PLATFORM_ADMIN_KEY);
    setToken(null);
    setAdmin(null);
  }, []);
  const value = useMemo(
    () => ({ token, admin, isAuthenticated: Boolean(token), signIn, signOut }),
    [token, admin, signIn, signOut],
  );
  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePlatformAuth = () => useContext(PlatformAuthContext);
