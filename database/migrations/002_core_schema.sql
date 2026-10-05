-- 002_core_schema.sql: Core social accounts, posts, automations and triggers

-- 17.2 social_accounts
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
  for each row execute function set_updated_at();

-- 17.3 social_account_tokens (Server-only, no browser RLS access)
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
  for each row execute function set_updated_at();

-- 17.4 posts
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

-- 17.5 automations
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
  for each row execute function set_updated_at();

-- 17.6 automation_triggers (1:1 with automations in MVP)
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

-- 17.11 audit_logs
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
