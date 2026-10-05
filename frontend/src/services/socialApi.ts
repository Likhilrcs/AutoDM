import { apiClient } from './api';

export interface SocialAccount {
  id: string;
  platform: 'instagram' | 'mock';
  external_account_id: string;
  username?: string;
  account_type?: string;
  status: 'connected' | 'expired' | 'disconnected' | 'error';
  followers_count?: number;
  media_count?: number;
  token_expires_at?: string;
  created_at?: string;
}

export interface ConnectResponse {
  account?: SocialAccount;
  authorization_url?: string;
  mock: boolean;
}

export interface PostItem {
  id: string;
  external_post_id: string;
  permalink?: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'REEL' | 'CAROUSEL';
  comments_count?: number;
  likes_count?: number;
  active_automation?: string;
  posted_at?: string;
}

export interface SimulateCommentRequest {
  social_account_id?: string;
  external_post_id?: string;
  commenter_username: string;
  comment_text: string;
}

export interface SimulateCommentResponse {
  success: boolean;
  matched_keyword?: string;
  automation_name?: string;
  reply_text?: string;
  execution_id?: string;
  status: string;
  message: string;
}

export const socialApi = {
  listAccounts: () => apiClient<SocialAccount[]>('/social/accounts'),
  connect: (platform: string = 'mock') =>
    apiClient<ConnectResponse>('/social/connect', {
      method: 'POST',
      body: JSON.stringify({ platform }),
    }),
  disconnect: (id: string) =>
    apiClient<void>(`/social/accounts/${id}`, {
      method: 'DELETE',
    }),
  syncAccount: (id: string) =>
    apiClient<{ synced: boolean; message?: string }>(`/social/accounts/${id}/sync`, {
      method: 'POST',
    }),
  getPosts: (accountId: string) =>
    apiClient<PostItem[]>(`/social/accounts/${accountId}/posts`),
  simulateComment: (data: SimulateCommentRequest) =>
    apiClient<SimulateCommentResponse>('/social/simulate-comment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  handleCallback: (code: string, state?: string) =>
    apiClient<{ connected: boolean; username: string }>('/social/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    }),
};
