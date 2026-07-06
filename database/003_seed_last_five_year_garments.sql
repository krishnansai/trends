insert into public.garments (
  image_url,
  year,
  category,
  demographic,
  style_tags,
  color_palette,
  age_group,
  description,
  source_url
) values
(
  'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=80',
  2022,
  'tops',
  'unisex',
  array['dopamine dressing', 'cobalt', 'statement color'],
  array['#0057b8', '#111111', '#f5f0e8'],
  '18-35',
  'Saturated color worn against graphic black and white styling.',
  'https://unsplash.com/photos/1515372039744-b8f02a3ae446'
),
(
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80',
  2023,
  'outerwear',
  'unisex',
  array['quiet luxury', 'tailored coat', 'old money'],
  array['#d9d0c1', '#1f1f1f', '#7a6a53'],
  '25-45',
  'Refined wool coats, restrained branding, and polished neutral palettes.',
  'https://unsplash.com/photos/1487412720507-e7ab37603c6f'
),
(
  'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=900&q=80',
  2024,
  'tops',
  'womenswear',
  array['sheer layering', 'mesh', 'transparency'],
  array['#f3eee6', '#222222', '#7b1f2a'],
  '18-34',
  'Lightweight sheer layers used as styling surfaces over tonal bases.',
  'https://unsplash.com/photos/1520975954732-35dd22299614'
),
(
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=900&q=80',
  2025,
  'outerwear',
  'menswear',
  array['tech tailoring', 'modular', 'performance fabric'],
  array['#101820', '#c7d0d8', '#4f6f52'],
  '25-44',
  'Tailored shells and modular layers built from performance textiles.',
  'https://unsplash.com/photos/1469334031218-e382a71b716b'
),
(
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  2026,
  'accessories',
  'unisex',
  array['artisanal', 'handcrafted', 'texture'],
  array['#3a2c24', '#d8ccb8', '#b43f2a'],
  '25-50',
  'Craft-forward accessories with visible texture and human-made variation.',
  'https://unsplash.com/photos/1512436991641-6745cdb1723f'
);
