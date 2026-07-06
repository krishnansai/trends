import type { Garment, Trend } from "@/lib/types";

export const sampleGarments: Garment[] = [
  {
    id: "garment-2022-cobalt",
    image_url:
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=80",
    year: 2022,
    category: "tops",
    demographic: "unisex",
    title: "Cobalt Statement Top",
    style_tags: ["dopamine dressing", "cobalt", "statement color"],
    color_palette: ["#0057b8", "#111111", "#f5f0e8"],
    fit_profile: "regular",
    occasion: ["mall", "street", "casual"],
    season: ["summer", "all-season"],
    age_group: "18-35",
    description: "Saturated color worn against graphic black and white styling.",
    source_url: "https://unsplash.com/photos/1515372039744-b8f02a3ae446",
    created_at: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "garment-2023-quiet-luxury",
    image_url:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
    year: 2023,
    category: "outerwear",
    demographic: "unisex",
    title: "Quiet Luxury Tailored Coat",
    style_tags: ["quiet luxury", "tailored coat", "old money"],
    color_palette: ["#d9d0c1", "#1f1f1f", "#7a6a53"],
    fit_profile: "regular",
    occasion: ["formal", "office", "casual"],
    season: ["winter", "all-season"],
    age_group: "25-45",
    description: "Refined wool coats, restrained branding, and polished neutral palettes.",
    source_url: "https://unsplash.com/photos/1487412720507-e7ab37603c6f",
    created_at: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "garment-2024-sheer-layering",
    image_url:
      "https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=900&q=80",
    year: 2024,
    category: "tops",
    demographic: "womenswear",
    title: "Sheer Mesh Layering Top",
    style_tags: ["sheer layering", "mesh", "transparency"],
    color_palette: ["#f3eee6", "#222222", "#7b1f2a"],
    fit_profile: "slim",
    occasion: ["mall", "street", "casual"],
    season: ["summer", "all-season"],
    age_group: "18-34",
    description: "Lightweight sheer layers used as styling surfaces over tonal bases.",
    source_url: "https://unsplash.com/photos/1520975954732-35dd22299614",
    created_at: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "garment-2025-tech-tailoring",
    image_url:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=900&q=80",
    year: 2025,
    category: "outerwear",
    demographic: "menswear",
    title: "Tech Tailoring Modular Outerwear",
    style_tags: ["tech tailoring", "modular", "performance fabric"],
    color_palette: ["#101820", "#c7d0d8", "#4f6f52"],
    fit_profile: "relaxed",
    occasion: ["mall", "street", "travel"],
    season: ["all-season"],
    age_group: "25-44",
    description: "Tailored shells and modular layers built from performance textiles.",
    source_url: "https://unsplash.com/photos/1469334031218-e382a71b716b",
    created_at: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "garment-2026-artisanal",
    image_url:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
    year: 2026,
    category: "accessories",
    demographic: "unisex",
    title: "Artisanal Textured Accessory",
    style_tags: ["artisanal", "handcrafted", "texture"],
    color_palette: ["#3a2c24", "#d8ccb8", "#b43f2a"],
    fit_profile: "regular",
    occasion: ["mall", "street", "casual"],
    season: ["all-season"],
    age_group: "25-50",
    description: "Craft-forward accessories with visible texture and human-made variation.",
    source_url: "https://unsplash.com/photos/1512436991641-6745cdb1723f",
    created_at: "2026-07-01T00:00:00.000Z"
  }
];

export const sampleTrends: Trend[] = [
  {
    id: "trend-2027-denim",
    title: "Oversized Minimalist Denim",
    description:
      "Clean denim volumes move away from heavy distressing toward architectural jackets, low-detail wide legs, and precise washed-black palettes.",
    forecast_year: 2027,
    confidence_score: 88,
    season: "Spring 2027",
    forecast_image_url:
      "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=80",
    source_url: "https://unsplash.com/photos/1485968579580-b6d095142e6e",
    created_at: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "trend-2027-biochrome",
    title: "Biochrome Utility Layers",
    description:
      "Outdoor codes soften into office-ready separates: algae green, smoked gray, repair seams, and lightweight modular pockets.",
    forecast_year: 2027,
    confidence_score: 74,
    season: "Fall 2027",
    forecast_image_url:
      "https://images.unsplash.com/photo-1506629905607-d405d7d3b0d2?auto=format&fit=crop&w=1200&q=80",
    source_url: "https://unsplash.com/photos/1506629905607-d405d7d3b0d2",
    created_at: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "trend-2028-artisan-tech",
    title: "Artisan Tech Knitwear",
    description:
      "Knitwear absorbs technical language through engineered ribbing, heat-map color accents, and sculptural asymmetric closures.",
    forecast_year: 2028,
    confidence_score: 69,
    season: "Winter 2028",
    forecast_image_url:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
    source_url: "https://unsplash.com/photos/1529139574466-a303027c1d8b",
    created_at: "2026-07-01T00:00:00.000Z"
  }
];
