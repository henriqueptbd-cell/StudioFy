import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
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
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        const { token: storedToken, user: storedUser } = getStoredAuth();
        if (storedToken) {
            setToken(storedToken);
            api.defaults.headers.Authorization = `Bearer ${storedToken}`;
        }
        if (storedUser) setUser(storedUser as AuthUser);
    }, []);

    const signIn = useCallback((newToken: string, newUser: AuthUser) => {
        setToken(newToken);
        setUser(newUser);
        api.defaults.headers.Authorization = `Bearer ${newToken}`;
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
