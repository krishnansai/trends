alter table public.grooming_trends
  add column if not exists maintenance_level text not null default '';

insert into public.grooming_trends (
  id,
  year,
  category,
  title,
  description,
  face_shapes,
  style_tags,
  maintenance_level,
  recommended_products,
  image_url
)
values
  (
    'groom-hair-2026-01',
    2026,
    'hairstyle',
    'Textured Crop with Low Skin Fade',
    'Short, choppy, piece-y texture on top paired with a seamless low skin fade on the sides. Effortless, low-maintenance, and designed to add structure without heavy shine.',
    array['oval', 'round', 'square', 'heart'],
    array['streetwear', 'casual', 'low-maintenance', 'modern'],
    'Low (Trim every 3-4 weeks)',
    '[{"name":"Matte Texture Styling Powder","search_query":"mens hair styling volume powder matte finish"},{"name":"Sea Salt Spray","search_query":"sea salt texturizing hair spray for men"}]'::jsonb,
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800'
  ),
  (
    'groom-hair-2026-02',
    2026,
    'hairstyle',
    'Modern Burr Cut with Taper Fade',
    'An evolved, sharp buzz cut leaving slightly more length (#3 or #4 guard) on the crown, contrasted with a crisp temple taper and soft lineup.',
    array['square', 'oval', 'diamond', 'rectangle'],
    array['minimalist', 'athletic', 'clean', 'quiet-luxury'],
    'Medium (Trim every 2 weeks)',
    '[{"name":"Daily Scalp Moisturizer","search_query":"mens lightweight scalp moisturizer SPF"},{"name":"Professional Cordless Taper Clipper","search_query":"professional cordless hair clipper taper fade"}]'::jsonb,
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800'
  ),
  (
    'groom-hair-2026-03',
    2026,
    'hairstyle',
    'Medium Bro Flow & Soft Shaggy Layers',
    'Natural, pushed-back medium-length waves skimming the collar with soft layered movement. Perfect for naturally wavy or coarse hair types.',
    array['oval', 'rectangle', 'heart', 'diamond'],
    array['resort', 'old-money', 'casual', 'poet-core'],
    'Low (Trim every 6-8 weeks)',
    '[{"name":"Lightweight Styling Cream","search_query":"lightweight medium hold hair styling cream men"},{"name":"Argan Leave-In Conditioner","search_query":"argan oil leave in conditioner frizz control men"}]'::jsonb,
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
  ),
  (
    'groom-hair-2026-04',
    2026,
    'hairstyle',
    'Textured Quiff / Evolved Ivy League',
    'Slightly longer top swept upward and back with dry texture, paired with clean tapered sides. Delivers professional height without stiff gel.',
    array['round', 'oval', 'square'],
    array['office', 'smart-casual', 'tailoring'],
    'Medium (Trim every 4 weeks)',
    '[{"name":"Matte Styling Clay","search_query":"high hold matte clay hair styling men"}]'::jsonb,
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800'
  ),
  (
    'groom-hair-2026-05',
    2026,
    'hairstyle',
    'Modern Textured Mullet / Shaggy Fringe',
    'Short buzzed sides with a heavy forward-flowing textured fringe and slightly extended nape. A staple for urban and gorpcore aesthetics.',
    array['oval', 'diamond', 'heart'],
    array['streetwear', 'gorpcore', 'y2k', 'urban'],
    'Medium (Trim every 4-5 weeks)',
    '[{"name":"Texturizing Paste","search_query":"choppy texture hair paste matte men"}]'::jsonb,
    'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=800'
  ),
  (
    'groom-beard-2026-06',
    2026,
    'beard',
    'The Precise Fade Beard',
    'Sideburns seamlessly blended from a skin fade into denser facial hair along the jawline. Instantly creates sharp facial architecture and jaw definition.',
    array['round', 'oval', 'square', 'heart'],
    array['modern', 'sharp', 'streetwear', 'smart-casual'],
    'High (Touch-up every 7-10 days)',
    '[{"name":"Precision T-Blade Beard Trimmer","search_query":"precision zero gap t blade beard trimmer zero foil"},{"name":"Sandalwood Beard Conditioning Oil","search_query":"organic beard softening conditioning oil men"}]'::jsonb,
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
  ),
  (
    'groom-beard-2026-07',
    2026,
    'beard',
    'The Short Boxed Revival',
    'Structured corporate stubble/short beard with slightly lowered cheek lines and softened natural contours. Professional, highly tailored, and versatile.',
    array['square', 'heart', 'oval', 'rectangle'],
    array['office', 'tailoring', 'quiet-luxury', 'smart-casual'],
    'Medium (Weekly edging)',
    '[{"name":"Transparent Shaving Gel for Edging","search_query":"clear precision shaving gel beard edging"},{"name":"Beard Balm Softener","search_query":"light hold nourishing beard balm butter"}]'::jsonb,
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'
  ),
  (
    'groom-beard-2026-08',
    2026,
    'beard',
    'The Beardstache (Heavy Chevron + Stubble)',
    'A prominent, well-groomed chevron moustache contrasted against 3-day designer stubble across the cheeks and chin. High personality and bold contrast.',
    array['oblong', 'diamond', 'square', 'oval'],
    array['streetwear', 'vintage', 'resort', 'bold'],
    'Medium (Frequent moustache shaping)',
    '[{"name":"Moustache Styling Wax","search_query":"medium hold natural moustache styling wax"},{"name":"Adjustable Stubble Trimmer","search_query":"0.5mm precision dial stubble beard trimmer"}]'::jsonb,
    'https://images.unsplash.com/photo-1541577141970-eebc83ebe30e?w=800'
  ),
  (
    'groom-beard-2026-09',
    2026,
    'beard',
    'Model Designer Stubble (Heavy Shadow)',
    'An even 2mm-3mm facial shadow with impeccably cleaned neck and cheek lines. Enhances bone structure without heavy maintenance.',
    array['round', 'oval', 'square', 'heart', 'diamond'],
    array['casual', 'minimalist', 'universal'],
    'Low (Trim every 3 days)',
    '[{"name":"Exfoliating Face Scrub","search_query":"mens exfoliating salicylic face scrub ingrown hair"}]'::jsonb,
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800'
  ),
  (
    'groom-beard-2026-10',
    2026,
    'beard',
    'Sculpted Goatee / Balbo Revival',
    'Clean cheeks paired with a structured, lean goatee and disconnected moustache. Ideal for men with patchy cheek growth wanting strong chin definition.',
    array['round', 'diamond', 'heart'],
    array['modern', 'sharp', 'athletic'],
    'Medium (Weekly contouring)',
    '[{"name":"Foil Detail Shaver","search_query":"mini electric foil detail shaver clean cheek lines"}]'::jsonb,
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800'
  )
on conflict (id) do update set
  year = excluded.year,
  category = excluded.category,
  title = excluded.title,
  description = excluded.description,
  face_shapes = excluded.face_shapes,
  style_tags = excluded.style_tags,
  maintenance_level = excluded.maintenance_level,
  recommended_products = excluded.recommended_products,
  image_url = excluded.image_url;
