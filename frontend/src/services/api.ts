import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://recliner-filter-luxurious.ngrok-free.dev/api/v1';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  request_id?: string;
}

export class ApiException extends Error {
  code: string;
  details?: Record<string, any>;
  requestId?: string;
  status: number;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = 'ApiException';
    this.status = status;
    this.code = error.code;
    this.details = error.details;
    this.requestId = error.request_id;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    if (body && body.error) {
      let msg = body.error.message || 'An unexpected error occurred.';
      if (body.error.details && typeof body.error.details === 'object' && Object.keys(body.error.details).length > 0) {
        const detailsStr = Object.entries(body.error.details)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        if (!msg || msg === 'Invalid request parameters.' || msg.startsWith('Invalid request parameters')) {
          msg = `Validation error: ${detailsStr}`;
        }
      }
      throw new ApiException(response.status, {
        ...body.error,
        message: msg,
      });
    }
    throw new ApiException(response.status, {
      code: 'HTTP_ERROR',
      message: response.statusText || 'An unexpected error occurred.',
    });
  }

  // AutoDM standard envelope: { success: true, data: T, meta?: ... }
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data as T;
  }

  return body as T;
}

// Typed endpoints
export const userApi = {
  getProfile: () => apiClient<any>('/users/me'),
  updateProfile: (data: { name?: string; avatar_url?: string }) =>
    apiClient<any>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: () =>
    apiClient<{ success: boolean; message: string }>('/users/me', { method: 'DELETE' }),
};
