alter table public.garments
  alter column id drop default;

alter table public.garments
  alter column id type text using id::text;

alter table public.garments
  alter column id set default gen_random_uuid()::text;

alter table public.garments
  add column if not exists title text not null default '';

alter table public.garments
  add column if not exists fit_profile text not null default 'regular';

alter table public.garments
  add column if not exists occasion text[] not null default array['casual'];

alter table public.garments
  add column if not exists season text[] not null default array['all-season'];

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

create index if not exists garments_occasion_gin_idx on public.garments using gin (occasion);
create index if not exists garments_season_gin_idx on public.garments using gin (season);

insert into public.garments (
  id,
  image_url,
  year,
  category,
  demographic,
  title,
  style_tags,
  color_palette,
  fit_profile,
  occasion,
  season,
  age_group,
  description,
  source_url
) values
(
  'gar-2026-env-01',
  'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800',
  2026,
  'tops',
  'menswear',
  'Textured Linen Short-Sleeve Resort Shirt',
  array['resort', 'relaxed', 'old-money', 'summer'],
  array['#F4F1DE', '#E07A5F', '#3D405B'],
  'relaxed',
  array['beach', 'vacation', 'casual'],
  array['summer'],
  '18-44',
  'Breathable open-collar linen resort shirt designed for high-humidity coastal climates and resort wear.',
  'https://images.unsplash.com/photo-1598033129183-c4f50c736f10'
),
(
  'gar-2026-env-02',
  'https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=800',
  2026,
  'bottoms',
  'menswear',
  'Quick-Dry Tailored Swim Shorts',
  array['beachwear', 'resort', 'utility'],
  array['#2A9D8F', '#264653', '#E9C46A'],
  'regular',
  array['beach', 'pool', 'vacation'],
  array['summer'],
  '18-44',
  'Mid-length 5-inch inseam swim shorts featuring stretch-nylon fabric and side slit pockets.',
  'https://images.unsplash.com/photo-1565084888279-aca607ecce0c'
),
(
  'gar-2026-env-03',
  'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800',
  2026,
  'accessory_headwear',
  'unisex',
  'Woven Raffia Resort Bucket Hat',
  array['resort', 'accessory', 'summer'],
  array['#D4AF37', '#C5A059', '#FAF0E6'],
  'regular',
  array['beach', 'vacation'],
  array['summer'],
  '18-44',
  'Structured wide-brim bucket hat engineered for UV protection during high-sun beach outings.',
  'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9'
),
(
  'gar-2025-env-04',
  'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800',
  2025,
  'tops',
  'menswear',
  'Heavyweight Drop-Shoulder Graphic Streetwear Tee',
  array['streetwear', 'urban', 'relaxed'],
  array['#111111', '#444444', '#888888'],
  'oversized',
  array['mall', 'street', 'casual'],
  array['all-season', 'summer'],
  '18-44',
  '300gsm heavyweight combed cotton graphic t-shirt engineered for indoor mall and urban streetwear aesthetics.',
  'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c'
),
(
  'gar-2025-env-05',
  'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800',
  2025,
  'bottoms',
  'menswear',
  'Relaxed Fit Wide-Leg Cargo Parachute Pants',
  array['gorpcore', 'streetwear', 'y2k'],
  array['#4F5D4E', '#2B2B2B', '#6B705C'],
  'oversized',
  array['mall', 'street', 'casual'],
  array['all-season'],
  '18-44',
  'Lightweight ripstop cotton parachute pants featuring adjustable toggle hems and deep side utility pockets.',
  'https://images.unsplash.com/photo-1517445312882-bc9910d016b7'
),
(
  'gar-2025-env-06',
  'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800',
  2025,
  'accessory_sunglasses',
  'unisex',
  'Geometric Acetate Frame Polarized Sunglasses',
  array['streetwear', 'accessory', 'modern'],
  array['#000000', '#1A1A1A'],
  'regular',
  array['beach', 'mall', 'street'],
  array['all-season', 'summer'],
  '18-44',
  'Thick black acetate rectangular sunglasses featuring UV400 polarized dark tinted lenses.',
  'https://images.unsplash.com/photo-1511499767150-a48a237f0083'
),
(
  'gar-2024-env-07',
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800',
  2024,
  'tops',
  'menswear',
  'Technical Performance Compression Gym Shirt',
  array['athleisure', 'sporty', 'gym'],
  array['#1F2421', '#216869', '#49A078'],
  'slim',
  array['gym', 'sporty'],
  array['all-season'],
  '18-44',
  'Moisture-wicking 4-way stretch compression shirt built for heavy lifting and high-intensity gym sessions.',
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e'
),
(
  'gar-2024-env-08',
  'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=800',
  2024,
  'outerwear',
  'menswear',
  'Insulated Water-Resistant Puff Parka',
  array['winterwear', 'utility', 'gorpcore'],
  array['#0F111A', '#2B3A41', '#CCCCCC'],
  'relaxed',
  array['outdoor', 'travel', 'casual'],
  array['winter'],
  '18-44',
  'Thermal-lined quilted puffer jacket featuring fleece-lined collar and windproof outer shell for winter travel.',
  'https://images.unsplash.com/photo-1544923246-77307dd654cb'
)
on conflict (id) do update set
  image_url = excluded.image_url,
  year = excluded.year,
  category = excluded.category,
  demographic = excluded.demographic,
  title = excluded.title,
  style_tags = excluded.style_tags,
  color_palette = excluded.color_palette,
  fit_profile = excluded.fit_profile,
  occasion = excluded.occasion,
  season = excluded.season,
  age_group = excluded.age_group,
  description = excluded.description,
  source_url = excluded.source_url;
