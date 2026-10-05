-- 004_rls.sql: Row-Level Security policies for all tables

-- Enable RLS on all tables
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

-- Drop existing policies if re-running
drop policy if exists "sa_select_own" on public.social_accounts;
drop policy if exists "posts_select_own" on public.posts;
drop policy if exists "auto_select_own" on public.automations;
drop policy if exists "auto_insert_own" on public.automations;
drop policy if exists "auto_update_own" on public.automations;
drop policy if exists "auto_delete_own" on public.automations;
drop policy if exists "trg_all_own" on public.automation_triggers;
drop policy if exists "events_select_own" on public.incoming_events;
drop policy if exists "executions_select_own" on public.executions;
drop policy if exists "messages_select_own" on public.messages;
drop policy if exists "audit_select_own" on public.audit_logs;
drop policy if exists "steps_select_own" on public.execution_steps;

-- 1. social_accounts: read own (writes done by backend service role during OAuth / mock connect)
create policy "sa_select_own" on public.social_accounts
  for select using (user_id = auth.uid());

-- 2. posts: read own
create policy "posts_select_own" on public.posts
  for select using (user_id = auth.uid());

-- 3. automations: CRUD own
create policy "auto_select_own" on public.automations
  for select using (user_id = auth.uid());

create policy "auto_insert_own" on public.automations
  for insert with check (user_id = auth.uid());

create policy "auto_update_own" on public.automations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "auto_delete_own" on public.automations
  for delete using (user_id = auth.uid());

-- 4. automation_triggers: via parent automation ownership
create policy "trg_all_own" on public.automation_triggers
  for all
  using (exists (select 1 from public.automations a where a.id = automation_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.automations a where a.id = automation_id and a.user_id = auth.uid()));

-- 5. Read-only audit history for user
create policy "events_select_own" on public.incoming_events
  for select using (user_id = auth.uid());

create policy "executions_select_own" on public.executions
  for select using (user_id = auth.uid());

create policy "messages_select_own" on public.messages
  for select using (user_id = auth.uid());

create policy "audit_select_own" on public.audit_logs
  for select using (user_id = auth.uid());

create policy "steps_select_own" on public.execution_steps
  for select using (user_id = auth.uid());

-- Server-only tables:
-- social_account_tokens: RLS enabled, NO policies => completely unreachable from the browser/anon key.
-- webhook_events: RLS enabled, NO policies => completely unreachable from the browser/anon key.
