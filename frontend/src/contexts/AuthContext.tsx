import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { logout as clearSession, getStoredAuth } from '@/services/auth';
import { AuthUser } from '@/types';

interface AuthContextData {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hidratação síncrona a partir do armazenamento local para evitar que, ao
  // recarregar a página, o usuário seja momentaneamente tratado como deslogado
  // (o que causava redirecionamento para o login a cada refresh).
  const [token, setToken] = useState<string | null>(() => getStoredAuth().token || null);
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = getStoredAuth();
    return stored.user ? (stored.user as AuthUser) : null;
  });

  // Garante que o header de autorização reflita sempre o token vigente.
  useEffect(() => {
    if (token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.Authorization;
    }
  }, [token]);

  const signIn = useCallback((newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    api.defaults.headers.Authorization = `Bearer ${newToken}`;
    localStorage.setItem('@StudioFy:token', newToken);
    localStorage.setItem('@StudioFy:user', JSON.stringify(newUser));
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    delete api.defaults.headers.Authorization;
    clearSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: Boolean(token),
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
