alter table public.garments
  add column if not exists demographic text not null default 'unisex';

alter table public.garments
  drop constraint if exists garments_category_check;

alter table public.garments
  add constraint garments_category_check
  check (
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
  );

alter table public.garments
  drop constraint if exists garments_demographic_check;

alter table public.garments
  add constraint garments_demographic_check
  check (demographic in ('menswear', 'womenswear', 'unisex'));

create index if not exists garments_demographic_idx on public.garments (demographic);
create index if not exists garments_year_demographic_idx on public.garments (year, demographic);

update public.garments
set demographic = case
  when category in ('dresses', 'skirts', 'blouses') then 'womenswear'
  when category in ('footwear', 'accessories') then 'unisex'
  else demographic
end;
