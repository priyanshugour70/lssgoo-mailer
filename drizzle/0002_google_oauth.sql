alter table mailer.users
  add column if not exists image_url text,
  add column if not exists google_sub text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'mailer'
      and table_name = 'users'
      and column_name = 'password_hash'
  ) then
    alter table mailer.users alter column password_hash drop not null;
    alter table mailer.users drop column password_hash;
  end if;
end $$;

update mailer.users
set google_sub = 'legacy:' || id::text
where google_sub is null;

alter table mailer.users
  alter column google_sub set not null;

create unique index if not exists users_google_sub_unique on mailer.users (google_sub);
create unique index if not exists users_email_unique on mailer.users (email);