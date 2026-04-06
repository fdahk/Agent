import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import authService from '@/apis/auth-service';
import type { LoginPayload, LoginResult } from '@/apis/auth-service';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/** 持久化的用户信息（不含 token，token 单独存储） */
export interface AuthUser {
  userId: number;
  username: string;
  displayName: string;
  roleCode: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);
  const [token, setToken] = useState<string | null>(loadStoredToken);

  const login = useCallback(async (payload: LoginPayload) => {
    const result: LoginResult = await authService.login(payload);

    const authUser: AuthUser = {
      userId: result.userId,
      username: result.username,
      displayName: result.displayName,
      roleCode: result.roleCode,
    };

    localStorage.setItem(TOKEN_KEY, result.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));

    setToken(result.accessToken);
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}

/** 供网络层等非组件代码直接读取 token */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
