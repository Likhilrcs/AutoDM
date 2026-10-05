import { apiClient } from './api';

export interface RecentActivityItem {
  id: string;
  commenter_username: string;
  comment_text: string;
  trigger_keyword: string;
  automation_name: string;
  dm_status: 'sent' | 'failed' | 'queued';
  created_at?: string;
}

export interface ActiveCampaignItem {
  id: string;
  name: string;
  trigger_keyword: string;
  target_post_id?: string;
  status: string;
  dms_sent: number;
}

export interface ConnectedAccountSummary {
  id?: string;
  username?: string;
  status: string;
  followers_count: number;
}

export interface DashboardSummary {
  total_automations: number;
  active_automations: number;
  total_comments: number;
  total_dms: number;
  successful_dms: number;
  failed_dms: number;
  success_rate: number;
  connected_account?: ConnectedAccountSummary;
  active_campaigns: ActiveCampaignItem[];
  recent_activity: RecentActivityItem[];
}

export const dashboardApi = {
  getSummary: () => apiClient<DashboardSummary>('/dashboard/summary'),
};
