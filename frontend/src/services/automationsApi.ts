import { apiClient } from './api';
import {
  Automation,
  AutomationListItem,
  CreateAutomationPayload
} from '@/types/automation';

export type { CreateAutomationPayload };

export interface PreviewPayload {
  reply_mode: 'static' | 'ai';
  dm_message: string;
  link_url?: string;
  ai_instructions?: string;
  sample_comment: string;
  sample_username: string;
}

export interface PreviewResponse {
  generation_mode: 'static' | 'ai';
  reply_text: string;
  guardrails: {
    ok: boolean;
    reasons: string[];
  };
  fallback_used: boolean;
  model: string;
  ai_calls_remaining_today: number;
}

export const automationsApi = {
  list: (status?: string, q?: string, page = 1, pageSize = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (status) params.append('status', status);
    if (q) params.append('q', q);

    return apiClient<AutomationListItem[]>(`/automations?${params.toString()}`);
  },

  get: (id: string) => apiClient<Automation>(`/automations/${id}`),

  create: (data: CreateAutomationPayload) =>
    apiClient<Automation>('/automations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateAutomationPayload>) =>
    apiClient<Automation>(`/automations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/automations/${id}`, {
      method: 'DELETE',
    }),

  activate: (id: string) =>
    apiClient<Automation>(`/automations/${id}/activate`, {
      method: 'POST',
    }),

  pause: (id: string) =>
    apiClient<Automation>(`/automations/${id}/pause`, {
      method: 'POST',
    }),

  preview: (data: PreviewPayload) =>
    apiClient<PreviewResponse>('/automations/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
