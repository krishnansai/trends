create table if not exists public.grooming_trends (
  id text primary key,
  year integer not null check (year between 1900 and 2100),
  category text not null check (category in ('hairstyle', 'beard')),
  title text not null,
  description text not null default '',
  face_shapes text[] not null default '{}',
  style_tags text[] not null default '{}',
  maintenance_level text not null default '',
  recommended_products jsonb not null default '[]'::jsonb check (
    jsonb_typeof(recommended_products) = 'array'
  ),
  image_url text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists grooming_trends_year_idx on public.grooming_trends (year);
create index if not exists grooming_trends_category_idx on public.grooming_trends (category);
create index if not exists grooming_trends_face_shapes_gin_idx
  on public.grooming_trends using gin (face_shapes);
create index if not exists grooming_trends_style_tags_gin_idx
  on public.grooming_trends using gin (style_tags);

alter table public.grooming_trends enable row level security;

drop policy if exists "Public read grooming trends" on public.grooming_trends;
create policy "Public read grooming trends"
  on public.grooming_trends for select
  using (true);

insert into public.grooming_trends (
  id,
  year,
  category,
  title,
  description,
  face_shapes,
  style_tags,
  recommended_products,
  image_url
)
values
  (
    'groom-2026-hair-001',
    2026,
    'hairstyle',
    'The Textured Crop with Low Skin Fade',
    'Low-maintenance 2026 staple with choppy, piece-y texture on top and a clean low skin fade at the sides.',
    array['oval', 'square', 'round'],
    array['textured-crop', 'low-fade', 'low-maintenance', 'matte-finish'],
    '[{"name":"Matte Clay / Styling Powder","search_query":"men matte clay styling powder textured crop"}]'::jsonb,
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800'
  ),
  (
    'groom-2026-hair-002',
    2026,
    'hairstyle',
    'Modern Burr Cut with Taper Fade',
    'Minimalist, sharp, 1.5-inch buzzed look with a soft taper fade for clean structure and easy upkeep.',
    array['square', 'oval', 'diamond'],
    array['burr-cut', 'taper-fade', 'minimalist', 'sharp'],
    '[{"name":"Scalp Moisturizer / Light Texture Cream","search_query":"men scalp moisturizer light texture cream burr cut"}]'::jsonb,
    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800'
  ),
  (
    'groom-2026-hair-003',
    2026,
    'hairstyle',
    'Medium Bro Flow / Shaggy Layers',
    'Natural pushed-back waves skimming the collar with airy shaggy layers and controlled movement.',
    array['rectangle', 'heart', 'oval'],
    array['bro-flow', 'shaggy-layers', 'medium-length', 'natural-wave'],
    '[{"name":"Sea Salt Texturizing Spray","search_query":"men sea salt texturizing spray medium bro flow"}]'::jsonb,
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800'
  ),
  (
    'groom-2026-beard-001',
    2026,
    'beard',
    'The Precise Fade Beard',
    'Sideburns seamlessly blended into a fuller chin structure to sculpt jawline definition.',
    array['round', 'oval', 'square'],
    array['fade-beard', 'jawline-definition', 'precision', 'structured'],
    '[{"name":"Precision T-Blade Beard Trimmer","search_query":"precision t blade beard trimmer fade beard"}]'::jsonb,
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
  ),
  (
    'groom-2026-beard-002',
    2026,
    'beard',
    'The Short Boxed Revival',
    'Structured, low cheek-line corporate stubble and short beard shape for a polished profile.',
    array['square', 'heart', 'oval'],
    array['short-boxed', 'corporate-stubble', 'structured', 'low-cheek-line'],
    '[{"name":"Organic Sandalwood Beard Oil","search_query":"organic sandalwood beard oil short boxed beard"}]'::jsonb,
    'https://images.unsplash.com/photo-1520975661595-6453be3f7070?w=800'
  ),
  (
    'groom-2026-beard-003',
    2026,
    'beard',
    'The Beardstache',
    'Prominent heavy moustache paired with 3-day designer stubble for strong mid-face emphasis.',
    array['oblong', 'diamond', 'square'],
    array['beardstache', 'designer-stubble', 'heavy-moustache', 'barber-finish'],
    '[{"name":"Moustache Styling Wax","search_query":"men moustache styling wax beardstache"}]'::jsonb,
    'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=800'
  )
on conflict (id) do update set
  year = excluded.year,
  category = excluded.category,
  title = excluded.title,
  description = excluded.description,
  face_shapes = excluded.face_shapes,
  style_tags = excluded.style_tags,
  recommended_products = excluded.recommended_products,
  image_url = excluded.image_url;
