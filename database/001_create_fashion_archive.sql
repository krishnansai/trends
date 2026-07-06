create extension if not exists "pgcrypto";

create table if not exists public.garments (
  id text primary key default gen_random_uuid()::text,
  image_url text not null,
  year integer not null check (year between 1900 and 2100),
  category text not null check (
    category in (
      'tops',
      'bottoms',
      'outerwear',
      'dresses',
      'skirts',
      'blouses',
      'footwear',
      'accessories',
      'accessory_watch',
      'accessory_jewelry',
      'accessory_bag',
      'accessory_headwear',
      'accessory_sunglasses'
    )
  ),
  demographic text not null default 'unisex' check (
    demographic in ('menswear', 'womenswear', 'unisex')
  ),
  title text not null default '',
  style_tags text[] not null default '{}',
  color_palette text[] not null default '{}',
  fit_profile text not null default 'regular',
  occasion text[] not null default array['casual'],
  season text[] not null default array['all-season'],
  age_group text not null default 'unknown',
  description text not null default '',
  source_url text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.trends (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  forecast_year integer not null check (forecast_year between 1900 and 2100),
  confidence_score integer not null check (confidence_score between 0 and 100),
  season text not null default 'unspecified',
  forecast_image_url text not null default '',
  source_url text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists garments_year_idx on public.garments (year);
create index if not exists garments_category_idx on public.garments (category);
create index if not exists garments_demographic_idx on public.garments (demographic);
create index if not exists garments_year_category_idx on public.garments (year, category);
create index if not exists garments_year_demographic_idx on public.garments (year, demographic);
create index if not exists garments_style_tags_gin_idx on public.garments using gin (style_tags);
create index if not exists garments_color_palette_gin_idx on public.garments using gin (color_palette);
create index if not exists garments_occasion_gin_idx on public.garments using gin (occasion);
create index if not exists garments_season_gin_idx on public.garments using gin (season);

create index if not exists trends_forecast_year_idx on public.trends (forecast_year);
create index if not exists trends_season_idx on public.trends (season);
create index if not exists trends_confidence_score_idx on public.trends (confidence_score desc);

alter table public.garments enable row level security;
alter table public.trends enable row level security;

drop policy if exists "Public read garments" on public.garments;
create policy "Public read garments"
  on public.garments for select
  using (true);

drop policy if exists "Public read trends" on public.trends;
create policy "Public read trends"
  on public.trends for select
  using (true);

insert into storage.buckets (id, name, public)
values ('fashion-garments', 'fashion-garments', true)
on conflict (id) do nothing;
