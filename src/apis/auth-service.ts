import { createClient } from '@/cores/network';
import { AGENT_SERVER_BASE } from '@/cores/config';

const client = createClient(AGENT_SERVER_BASE);

/** 后端 ApiResponse 统一包装结构 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/** 登录成功后后端返回的用户信息 */
export interface LoginResult {
  userId: number;
  username: string;
  displayName: string;
  roleCode: string;
  accessToken: string;
}

/** 登录请求参数 */
export interface LoginPayload {
  username: string;
  password: string;
}

class AuthService {
  async login(payload: LoginPayload): Promise<LoginResult> {
    const res = await client.post<ApiResponse<LoginResult>>('/auth/login', payload);
    if (!res.success) {
      throw new Error(res.message || '登录失败');
    }
    return res.data;
  }
}

export default new AuthService();
