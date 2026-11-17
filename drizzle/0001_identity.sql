create schema if not exists mailer authorization lssgoo_backend;

create table if not exists mailer.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mailer.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references mailer.users (id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on mailer.sessions (user_id);