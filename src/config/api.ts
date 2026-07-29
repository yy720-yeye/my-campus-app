/**
 * API 统一配置与请求工具
 *
 * 集中管理后端地址，提供带认证的请求封装。
 * 使用时只需 import { API_BASE, getApiUrl, apiRequest } from '../config/api'
 */

// ---- 后端基础地址 ----
// 开发环境：通过 Vite proxy 转发 /api -> http://localhost:3001，此处留空
// 生产环境：在 .env.production 中设置 VITE_API_BASE
export const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * 拼接完整 API 地址
 * @param path - API 路径，如 '/api/canteens'
 * @returns 完整 URL
 *
 * @example
 * getApiUrl('/api/canteens')           // → '/api/canteens'（开发环境）
 * getApiUrl('/api/reviews')            // → '/api/reviews'
 */
export function getApiUrl(path: string): string {
  // 确保 path 以 '/' 开头
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

// ---- 通用返回类型 ----
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

/**
 * 带认证的请求工具
 *
 * 自动从 localStorage 读取 token 并添加到请求头，
 * 自动处理 JSON 序列化与反序列化。
 *
 * @param url    - 完整 API 地址（建议用 getApiUrl 生成）
 * @param method - HTTP 方法（GET / POST / PUT / DELETE）
 * @param body   - 请求体对象（可选，GET/DELETE 不传）
 * @returns      - { code, data, message }
 *
 * @example
 * // GET 请求
 * const res = await apiRequest<Review[]>('/api/reviews', 'GET')
 *
 * // POST 请求
 * const res = await apiRequest('/api/reviews', 'POST', {
 *   canteen_id: 1,
 *   content: '好吃',
 *   rating: 5
 * })
 */
export async function apiRequest<T = unknown>(
  url: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 从 localStorage 获取 token
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 构建请求参数
  const options: RequestInit = {
    method,
    headers,
  };

  // POST / PUT 请求携带 body
  if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
    options.body = JSON.stringify(body);
  }

  // 发起请求
  const response = await fetch(url, options);

  // 401: Token 过期或未登录，清除本地凭证并通知各组件更新状态
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    const errResult: ApiResponse<T> = await response.json();
    throw errResult;
  }

  // 解析 JSON 响应
  const result: ApiResponse<T> = await response.json();

  // 如果 HTTP 状态码不是 2xx，抛出错误
  if (!response.ok) {
    throw result;
  }

  return result;
}