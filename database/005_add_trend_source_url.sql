alter table public.trends
  add column if not exists source_url text not null default '';
