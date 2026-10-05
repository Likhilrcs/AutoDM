import { apiClient } from './api';

export interface ProfileSettings {
  name?: string;
  email: string;
  avatar_url?: string;
  timezone: string;
  bio?: string;
}

export interface AiSettings {
  provider: string;
  model: string;
  status: string;
  temperature: number;
  fallback_to_static: boolean;
  max_tokens: number;
}

export interface SafetySettings {
  cooldown_hours: number;
  daily_dm_limit: number;
  whole_word_matching: boolean;
  blocklist: string[];
}

export interface WebhookSettings {
  endpoint_url: string;
  verify_token: string;
  hmac_signature_active: boolean;
}

export interface FullSettings {
  profile: ProfileSettings;
  ai: AiSettings;
  safety: SafetySettings;
  webhook: WebhookSettings;
}

export interface UpdateSettingsRequest {
  name?: string;
  avatar_url?: string;
  timezone?: string;
  bio?: string;
  cooldown_hours?: number;
  daily_dm_limit?: number;
  fallback_to_static?: boolean;
}

export interface TestLlmResponse {
  provider: string;
  model: string;
  output: string;
  latency_ms: number;
}

export const settingsApi = {
  getSettings: () => apiClient<FullSettings>('/settings'),
  updateSettings: (data: UpdateSettingsRequest) =>
    apiClient<FullSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  testLlm: (prompt?: string, link_url?: string) =>
    apiClient<TestLlmResponse>('/settings/test-llm', {
      method: 'POST',
      body: JSON.stringify({ prompt, link_url }),
    }),
};
