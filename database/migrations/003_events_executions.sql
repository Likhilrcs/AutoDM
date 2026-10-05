-- 003_events_executions.sql: Webhook events, incoming comments, executions, messages, and execution_steps

-- 17.7 webhook_events (raw, immutable)
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

-- 17.8 incoming_events (normalized comments)
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

-- 17.9 executions
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

-- 17.10 messages
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

-- 17.11a execution_steps (LangGraph node-by-node run trace)
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
