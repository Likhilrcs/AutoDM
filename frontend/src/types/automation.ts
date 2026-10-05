export interface TriggerConfig {
  type: 'comment_keyword';
  keyword: string;
  match_mode: 'contains' | 'exact';
  case_sensitive: boolean;
}

export interface AutomationStats {
  executions: number;
  success: number;
  failed: number;
}

export interface Automation {
  id: string;
  name: string;
  social_account_id?: string;
  external_post_id?: string;
  post_url?: string;
  status: 'draft' | 'active' | 'paused';
  trigger: TriggerConfig;
  dm_message: string;
  link_url?: string;
  allow_repeat: boolean;
  reply_mode: 'static' | 'ai';
  ai_instructions?: string;
  intent_gate_enabled: boolean;
  intent_gate_description?: string;
  stats?: AutomationStats;
  created_at?: string;
  updated_at?: string;
}

export interface AutomationListItem {
  id: string;
  name: string;
  keyword: string;
  post_url?: string;
  status: 'draft' | 'active' | 'paused';
  reply_mode: 'static' | 'ai';
  executions: number;
  created_at?: string;
}

export interface CreateAutomationPayload {
  name: string;
  social_account_id: string;
  external_post_id: string;
  post_url?: string;
  trigger: TriggerConfig;
  dm_message: string;
  link_url?: string;
  allow_repeat: boolean;
  reply_mode: 'static' | 'ai';
  ai_instructions?: string;
  intent_gate_enabled: boolean;
  intent_gate_description?: string;
  status: 'draft' | 'active' | 'paused';
}
