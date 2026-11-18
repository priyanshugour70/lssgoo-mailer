create table if not exists mailer.suppressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references mailer.users(id) on delete cascade,
  email text not null,
  reason text not null default 'manual',
  created_at timestamptz not null default now()
);
create unique index if not exists suppressions_user_email_idx
  on mailer.suppressions (user_id, lower(email));
