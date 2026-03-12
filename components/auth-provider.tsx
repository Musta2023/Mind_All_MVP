'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ApiClient, setAccessToken, clearAccessToken, getAccessToken } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  name: string | null;
  tenantId: string;
  role: string;
  language: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  register: (email: string, password: string, startupName: string, stage: string, name?: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const getCurrentUser = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setLoading(false);
        return null;
      }
      const response = await ApiClient.get<User>('/auth/me');
      setUser(response);
      return response;
    } catch (err) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  const register = useCallback(
    async (email: string, password: string, startupName: string, stage: string, name?: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await ApiClient.post<{
          user: User;
          accessToken: string;
        }>('/auth/register', {
          email,
          password,
          startupName,
          stage,
          name,
        });

        await setAccessToken(response.accessToken);
        setUser(response.user);
        return response.user;
      } catch (err: any) {
        const errorMessage = err.message || 'Registration failed';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await ApiClient.post<{
          user: User;
          accessToken: string;
        }>('/auth/login', {
          email,
          password,
        });

        await setAccessToken(response.accessToken);
        setUser(response.user);
        return response.user;
      } catch (err: any) {
        const errorMessage = err.message || 'Login failed';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await ApiClient.post('/auth/logout', {});
      await clearAccessToken();
      setUser(null);
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, [router]);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        register,
        login,
        logout,
        getCurrentUser,
        updateUser,
      }}
    >
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
