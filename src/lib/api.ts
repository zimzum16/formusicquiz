import type { paths } from './api-types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Типы из автогенерированного spec — не редактировать вручную, запустить npm run gen:types
export type User = NonNullable<
  paths['/api/auth/me']['get']['responses']['200']['content']['application/json']['user']
>;
export type AuthResponse =
  paths['/api/auth/login']['post']['responses']['200']['content']['application/json'];

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const { headers: extraHeaders, ...restOptions } = options ?? {};
  const res = await fetch(`${BASE}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

export const authApi = {
  register: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ user: User | null }>('/api/auth/me'),
};
