/**
 * API 端点常量与便捷函数
 *
 * 底层配置在 src/config/api.ts 中，此文件基于其构建。
 * 推荐在本文件管理所有端点路径，业务代码通过 API.xxx 引用。
 */

import { getApiUrl, apiRequest } from '../config/api';
export { apiRequest, getApiUrl };
export type { ApiResponse } from '../config/api';

// ---- 端点路径 ----
export const API = {
  // 食堂点评
  canteens: getApiUrl('/api/canteens'),
  reviews: getApiUrl('/api/reviews'),

  // 二手交易
  items: getApiUrl('/api/items'),

  // 失物招领
  lostFound: getApiUrl('/api/lost-found'),

  // 用户认证
  auth: {
    register: getApiUrl('/api/auth/register'),
    login: getApiUrl('/api/auth/login'),
  },

  // 课程表
  schedules: getApiUrl('/api/schedules'),

  // 个人中心
  profile: {
    info: getApiUrl('/api/profile'),
    update: getApiUrl('/api/profile'),
    items: getApiUrl('/api/profile/items'),
    lostFound: getApiUrl('/api/profile/lost-found'),
    deleteAccount: getApiUrl('/api/profile/account'),
  },

  // AI 服务
  ai: {
    reviewSummary: getApiUrl('/api/ai/review-summary'),
    summarizeReviews: getApiUrl('/api/ai/summarize-reviews'),
    generateItemDescription: getApiUrl('/api/ai/generate-item-description'),
    generateDescription: getApiUrl('/api/ai/generate-description'),
  },
} as const;

// ---- 辅助函数 ----

/** 构建带查询参数的 URL */
export function buildUrl(
  base: string,
  params?: Record<string, string | number | undefined | null>,
): string {
  if (!params) return base;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}