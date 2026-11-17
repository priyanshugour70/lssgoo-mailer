alter table mailer.campaigns add column if not exists total_recipients integer;
alter table mailer.campaigns add column if not exists processed_count integer not null default 0;
alter table mailer.campaigns add column if not exists sent_count integer not null default 0;
alter table mailer.campaigns add column if not exists failed_count integer not null default 0;
alter table mailer.campaigns add column if not exists skipped_count integer not null default 0;