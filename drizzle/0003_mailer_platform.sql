-- User profile fields from Google
alter table mailer.users add column if not exists first_name text;
alter table mailer.users add column if not exists last_name text;

update mailer.users
set
  first_name = coalesce(
    first_name,
    nullif(split_part(trim(name), ' ', 1), '')
  ),
  last_name = coalesce(
    last_name,
    nullif(
      trim(substring(trim(name) from position(' ' in trim(name)) + 1)),
      ''
    )
  )
where first_name is null or last_name is null;

create table if not exists mailer.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references mailer.users (id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  company text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists contacts_owner_email_unique
  on mailer.contacts (owner_id, lower(email));
create index if not exists contacts_owner_id_idx on mailer.contacts (owner_id);
create index if not exists contacts_company_idx on mailer.contacts (company);

create table if not exists mailer.contact_access_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references mailer.users (id) on delete cascade,
  owner_id uuid not null references mailer.users (id) on delete cascade,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint contact_access_requests_status_check
    check (status in ('pending', 'accepted', 'rejected'))
);

create unique index if not exists contact_access_requests_pair_unique
  on mailer.contact_access_requests (requester_id, owner_id)
  where status = 'pending';
create index if not exists contact_access_requests_owner_idx
  on mailer.contact_access_requests (owner_id);

create table if not exists mailer.contact_access_grants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references mailer.users (id) on delete cascade,
  viewer_id uuid not null references mailer.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists contact_access_grants_pair_unique
  on mailer.contact_access_grants (owner_id, viewer_id);

create table if not exists mailer.smtp_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references mailer.users (id) on delete cascade,
  label text not null default 'Default',
  host text not null,
  port integer not null default 587,
  secure boolean not null default false,
  username text not null,
  password_encrypted text not null,
  from_name text,
  from_email text not null,
  is_valid boolean not null default false,
  last_validated_at timestamptz,
  validation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smtp_profiles_user_id_idx on mailer.smtp_profiles (user_id);

create table if not exists mailer.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references mailer.users (id) on delete cascade,
  original_name text not null,
  mime_type text not null,
  storage_path text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists uploaded_files_user_id_idx on mailer.uploaded_files (user_id);

create table if not exists mailer.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references mailer.users (id) on delete cascade,
  name text not null,
  format text not null default 'html',
  subject text not null,
  body_html text,
  body_text text,
  pdf_file_id uuid references mailer.uploaded_files (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint templates_format_check check (format in ('html', 'text'))
);

create index if not exists templates_user_id_idx on mailer.templates (user_id);

create table if not exists mailer.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references mailer.users (id) on delete cascade,
  template_id uuid not null references mailer.templates (id) on delete restrict,
  smtp_profile_id uuid not null references mailer.smtp_profiles (id) on delete restrict,
  name text not null,
  recipient_mode text not null,
  company_filter text,
  skip_already_sent boolean not null default true,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint campaigns_recipient_mode_check
    check (recipient_mode in ('all', 'filter', 'pick')),
  constraint campaigns_status_check
    check (status in ('draft', 'running', 'completed', 'failed'))
);

create index if not exists campaigns_user_id_idx on mailer.campaigns (user_id);

create table if not exists mailer.campaign_picks (
  campaign_id uuid not null references mailer.campaigns (id) on delete cascade,
  contact_id uuid not null references mailer.contacts (id) on delete cascade,
  primary key (campaign_id, contact_id)
);

create table if not exists mailer.campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references mailer.campaigns (id) on delete cascade,
  user_id uuid not null references mailer.users (id) on delete cascade,
  contact_id uuid references mailer.contacts (id) on delete set null,
  recipient_email text not null,
  template_id uuid not null references mailer.templates (id) on delete set null,
  subject text not null,
  status text not null,
  error_message text,
  smtp_message_id text,
  sent_at timestamptz not null default now(),
  constraint campaign_sends_status_check
    check (status in ('sent', 'failed', 'skipped'))
);

create index if not exists campaign_sends_user_recipient_idx
  on mailer.campaign_sends (user_id, lower(recipient_email));
create index if not exists campaign_sends_campaign_id_idx
  on mailer.campaign_sends (campaign_id);

create table if not exists mailer.delivery_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references mailer.users (id) on delete cascade,
  contact_id uuid references mailer.contacts (id) on delete set null,
  template_id uuid not null references mailer.templates (id) on delete cascade,
  recipient_email text not null,
  campaign_id uuid references mailer.campaigns (id) on delete set null,
  sent_at timestamptz not null default now()
);

create unique index if not exists delivery_ledger_user_template_email_unique
  on mailer.delivery_ledger (user_id, template_id, lower(recipient_email));