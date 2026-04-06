import { Navigate } from 'react-router-dom';
import { useAuth } from './auth-context';
import type { ReactNode } from 'react';

/**
 * 路由守卫：未登录时重定向到登录页。
 * 包裹在需要认证的路由 element 外层即可。
 * createBrowserRouter 在组件树外部创建，
 * 而 AuthContext 需要在组件内使用，需要用一个 AuthGuard 组件来保护需要认证的路由
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
