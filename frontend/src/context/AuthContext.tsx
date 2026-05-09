import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol_codigo: string;
  rol_nombre: string;
  totp_secret?: string;
}

interface LoginResult {
  requires2FA: boolean;
  userId?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginWith2FA: (userId: string, totpCode: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

axios.defaults.baseURL = (import.meta as any).env.VITE_API_URL || '/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setAccessToken(token);
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const response = await axios.post('/auth/login', { email, password });
    const { requires2FA, userId, tokens, user } = response.data;

    if (requires2FA) {
      return { requires2FA: true, userId };
    }

    if (tokens) {
      setAccessToken(tokens.accessToken);
      setUser(user);
      localStorage.setItem('access_token', tokens.accessToken);
      localStorage.setItem('refresh_token', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    return { requires2FA: false };
  };

  const loginWith2FA = async (userId: string, totpCode: string) => {
    const response = await axios.post('/auth/verify-2fa', { userId, totpCode });
    const { tokens, user } = response.data;

    setAccessToken(tokens.accessToken);
    setUser(user);
    localStorage.setItem('access_token', tokens.accessToken);
    localStorage.setItem('refresh_token', tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, loginWith2FA, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
