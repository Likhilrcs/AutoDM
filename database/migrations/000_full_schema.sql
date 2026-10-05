-- ====================================================================
-- AutoDM Complete Database Schema (PRD v1.1)
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. Helper trigger function for updated_at
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 2. 17.1 Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trigger_profiles_updated_at on public.profiles;
create trigger trigger_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile row on signup via Supabase Auth
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. 17.2 Social Accounts
create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null default 'instagram' check (platform in ('instagram', 'mock')),
  external_account_id text not null,
  username text,
  account_type text check (account_type in ('BUSINESS', 'MEDIA_CREATOR', null)),
  status text not null default 'connected' check (status in ('connected', 'expired', 'disconnected', 'error')),
  scopes text[],
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_social_account unique (platform, external_account_id)
);

create index if not exists idx_social_accounts_user on public.social_accounts(user_id);

drop trigger if exists trigger_social_accounts_updated_at on public.social_accounts;
create trigger trigger_social_accounts_updated_at
  before update on public.social_accounts
  for each row execute function public.set_updated_at();

-- 4. 17.3 Social Account Tokens (Server-only, no browser RLS access)
create table if not exists public.social_account_tokens (
  social_account_id uuid primary key references public.social_accounts(id) on delete cascade,
  access_token_enc text not null,
  token_type text default 'long_lived',
  expires_at timestamptz,
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tokens_expires_at on public.social_account_tokens(expires_at);

drop trigger if exists trigger_social_account_tokens_updated_at on public.social_account_tokens;
create trigger trigger_social_account_tokens_updated_at
  before update on public.social_account_tokens
  for each row execute function public.set_updated_at();

-- 5. 17.4 Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  external_post_id text not null,
  permalink text,
  caption text,
  media_type text check (media_type in ('IMAGE', 'VIDEO', 'REEL', 'CAROUSEL', null)),
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint uq_posts_account_media unique (social_account_id, external_post_id)
);

create index if not exists idx_posts_user on public.posts(user_id);
create index if not exists idx_posts_account on public.posts(social_account_id);

-- 6. 17.5 Automations
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  external_post_id text not null,
  post_url text,
  name text not null,
  dm_message text not null,
  link_url text check (link_url is null or link_url ~* '^https://'),
  allow_repeat boolean not null default false,
  reply_mode text not null default 'static' check (reply_mode in ('static', 'ai')),
  ai_instructions text,
  intent_gate_enabled boolean not null default false,
  intent_gate_description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_automations_user on public.automations(user_id);
create index if not exists idx_automations_lookup on public.automations(social_account_id, external_post_id) where status = 'active' and deleted_at is null;

drop trigger if exists trigger_automations_updated_at on public.automations;
create trigger trigger_automations_updated_at
  before update on public.automations
  for each row execute function public.set_updated_at();

-- 7. 17.6 Automation Triggers (1:1 with automations in MVP)
create table if not exists public.automation_triggers (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  trigger_type text not null default 'comment_keyword' check (trigger_type = 'comment_keyword'),
  keyword text not null,
  keyword_normalized text not null,
  match_mode text not null default 'contains' check (match_mode in ('exact', 'contains')),
  case_sensitive boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_automation_triggers_auto on public.automation_triggers(automation_id);

-- 8. 17.7 Webhook Events (raw, immutable audit trail)
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  external_event_id text not null,
  payload jsonb not null,
  signature_valid boolean,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint uq_webhook_event unique (platform, external_event_id)
);

create index if not exists idx_webhook_events_received on public.webhook_events(received_at desc);

-- 9. 17.8 Incoming Events (normalized comments)
create table if not exists public.incoming_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  webhook_event_id uuid references public.webhook_events(id) on delete set null,
  event_type text not null default 'comment',
  external_comment_id text not null,
  external_post_id text not null,
  commenter_id text not null,
  commenter_username text,
  comment_text text not null,
  normalized_text text not null,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  constraint uq_incoming_comment unique (social_account_id, external_comment_id)
);

create index if not exists idx_incoming_events_user on public.incoming_events(user_id, created_at desc);

-- 10. 17.9 Executions
create table if not exists public.executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  automation_id uuid not null references public.automations(id) on delete cascade,
  incoming_event_id uuid references public.incoming_events(id) on delete cascade,
  dedupe_key text not null,
  thread_id text,
  status text not null default 'pending' check (status in ('pending', 'sending', 'success', 'failed', 'skipped')),
  attempt_count int not null default 0,
  failure_code text,
  failure_reason text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint uq_execution_dedupe unique (dedupe_key)
);

create index if not exists idx_executions_user on public.executions(user_id, created_at desc);
create index if not exists idx_executions_status on public.executions(status);
create index if not exists idx_executions_thread on public.executions(thread_id);

-- 11. 17.10 Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  execution_id uuid not null references public.executions(id) on delete cascade,
  automation_id uuid references public.automations(id) on delete set null,
  platform text not null default 'instagram',
  recipient_id text,
  comment_id text,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  external_message_id text,
  response_payload jsonb,
  attempt_no int not null default 1,
  generation_mode text not null default 'static' check (generation_mode in ('static', 'ai')),
  ai_model text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_execution on public.messages(execution_id);
create index if not exists idx_messages_user on public.messages(user_id, created_at desc);

-- 12. 17.11 Audit Logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_user on public.audit_logs(user_id, created_at desc);

-- 13. 17.11a Execution Steps (LangGraph Run Trace)
create table if not exists public.execution_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  incoming_event_id uuid references public.incoming_events(id) on delete cascade,
  execution_id uuid references public.executions(id) on delete cascade,
  node text not null,
  status text not null check (status in ('success', 'failed', 'skipped', 'fallback', 'rejected')),
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms int,
  summary jsonb,
  error_code text,
  llm_model text,
  tokens_in int,
  tokens_out int,
  created_at timestamptz not null default now()
);

create index if not exists idx_execution_steps_exec on public.execution_steps(execution_id, created_at);
create index if not exists idx_execution_steps_event on public.execution_steps(incoming_event_id);
create index if not exists idx_execution_steps_user on public.execution_steps(user_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
alter table public.profiles enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_account_tokens enable row level security;
alter table public.posts enable row level security;
alter table public.automations enable row level security;
alter table public.automation_triggers enable row level security;
alter table public.webhook_events enable row level security;
alter table public.incoming_events enable row level security;
alter table public.executions enable row level security;
alter table public.messages enable row level security;
alter table public.audit_logs enable row level security;
alter table public.execution_steps enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Social Accounts
drop policy if exists "sa_select_own" on public.social_accounts;
create policy "sa_select_own" on public.social_accounts for select using (user_id = auth.uid());

-- Posts
drop policy if exists "posts_select_own" on public.posts;
create policy "posts_select_own" on public.posts for select using (user_id = auth.uid());

-- Automations
drop policy if exists "auto_select_own" on public.automations;
create policy "auto_select_own" on public.automations for select using (user_id = auth.uid());
drop policy if exists "auto_insert_own" on public.automations;
create policy "auto_insert_own" on public.automations for insert with check (user_id = auth.uid());
drop policy if exists "auto_update_own" on public.automations;
create policy "auto_update_own" on public.automations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "auto_delete_own" on public.automations;
create policy "auto_delete_own" on public.automations for delete using (user_id = auth.uid());

-- Automation Triggers
drop policy if exists "trg_all_own" on public.automation_triggers;
create policy "trg_all_own" on public.automation_triggers for all
  using (exists (select 1 from public.automations a where a.id = automation_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.automations a where a.id = automation_id and a.user_id = auth.uid()));

-- Audit & Read-only logs
drop policy if exists "events_select_own" on public.incoming_events;
create policy "events_select_own" on public.incoming_events for select using (user_id = auth.uid());
drop policy if exists "executions_select_own" on public.executions;
create policy "executions_select_own" on public.executions for select using (user_id = auth.uid());
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages for select using (user_id = auth.uid());
drop policy if exists "audit_select_own" on public.audit_logs;
create policy "audit_select_own" on public.audit_logs for select using (user_id = auth.uid());
drop policy if exists "steps_select_own" on public.execution_steps;
create policy "steps_select_own" on public.execution_steps for select using (user_id = auth.uid());
