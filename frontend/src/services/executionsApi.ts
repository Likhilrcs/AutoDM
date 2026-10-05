import { apiClient } from './api';

export interface ExecutionItem {
  id: string;
  automation_id: string;
  automation_name: string;
  commenter_username: string;
  comment_text: string;
  status: 'pending' | 'sending' | 'success' | 'failed' | 'skipped';
  attempt_count: number;
  failure_code?: string;
  created_at?: string;
}

export interface StepTrace {
  node: string;
  status: 'success' | 'failed' | 'skipped' | 'fallback' | 'rejected';
  duration_ms?: number;
  llm_model?: string;
  tokens_in?: number;
  tokens_out?: number;
  summary?: Record<string, any>;
  error_code?: string;
}

export interface ExecutionDetail extends ExecutionItem {
  steps?: StepTrace[];
  messages?: any[];
  incoming_events?: any;
}

export const executionsApi = {
  list: (status?: string, automationId?: string, page = 1, pageSize = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (status) params.append('status', status);
    if (automationId) params.append('automation_id', automationId);

    return apiClient<ExecutionItem[]>(`/executions?${params.toString()}`);
  },

  getDetail: (id: string) => apiClient<ExecutionDetail>(`/executions/${id}`),

  getSteps: (id: string) => apiClient<StepTrace[]>(`/executions/${id}/steps`),

  retry: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/executions/${id}/retry`, {
      method: 'POST',
    }),
};
