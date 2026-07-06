export type Demographic = "menswear" | "womenswear" | "unisex";

export type GarmentCategory =
  | "tops"
  | "bottoms"
  | "outerwear"
  | "dresses"
  | "skirts"
  | "blouses"
  | "footwear"
  | "accessories"
  | "accessory_watch"
  | "accessory_jewelry"
  | "accessory_bag"
  | "accessory_headwear"
  | "accessory_sunglasses";

export type FitProfile = "slim" | "regular" | "relaxed" | "oversized" | "straight" | "boxy";

export type StylingOccasion =
  | "mall"
  | "street"
  | "beach"
  | "vacation"
  | "gym"
  | "athletic"
  | "sporty"
  | "formal"
  | "office"
  | "casual"
  | "pool"
  | "outdoor"
  | "travel";

export type StylingSeason = "summer" | "winter" | "all-season";

export type FaceShape = "oval" | "square" | "round" | "heart" | "rectangle" | "diamond" | "oblong";

export type GroomingCategory = "hairstyle" | "beard";

export type GroomingProduct = {
  name: string;
  search_query: string;
};

export type GroomingTrend = {
  id: string;
  year: number;
  category: GroomingCategory;
  title: string;
  description: string;
  face_shapes: FaceShape[];
  style_tags: string[];
  maintenance_level?: string;
  recommended_products: GroomingProduct[];
  image_url: string;
};

export type Garment = {
  id: string;
  image_url: string;
  year: number;
  category: GarmentCategory;
  demographic: Demographic;
  title: string;
  style_tags: string[];
  color_palette: string[];
  fit_profile: FitProfile;
  occasion: StylingOccasion[];
  season: StylingSeason[];
  age_group: string;
  description: string;
  source_url: string;
  created_at: string;
};

export type Trend = {
  id: string;
  title: string;
  description: string;
  forecast_year: number;
  confidence_score: number;
  season: string;
  forecast_image_url: string;
  source_url: string;
  created_at: string;
};

export const demographics = ["menswear", "womenswear", "unisex"] as const satisfies readonly Demographic[];

export const MENSWEAR_BLOCKED_CATEGORIES = ["dresses", "skirts", "blouses"] as const;

export const MENSWEAR_SAFE_CATEGORIES: GarmentCategory[] = [
  "tops",
  "bottoms",
  "outerwear",
  "footwear",
  "accessories",
  "accessory_watch",
  "accessory_jewelry",
  "accessory_bag",
  "accessory_headwear",
  "accessory_sunglasses"
];

export const stylingOccasions = [
  "mall",
  "street",
  "beach",
  "vacation",
  "gym",
  "athletic",
  "sporty",
  "formal",
  "office",
  "casual",
  "pool",
  "outdoor",
  "travel"
] as const satisfies readonly StylingOccasion[];

export const stylingSeasons = ["summer", "winter", "all-season"] as const satisfies readonly StylingSeason[];

export const faceShapes = [
  "oval",
  "square",
  "round",
  "heart",
  "rectangle",
  "diamond",
  "oblong"
] as const satisfies readonly FaceShape[];

export const occasionFilterGroups: Record<
  "mall" | "beach" | "gym" | "formal",
  StylingOccasion[]
> = {
  beach: ["beach", "vacation", "pool"],
  formal: ["formal", "office"],
  gym: ["gym", "athletic", "sporty"],
  mall: ["mall", "street", "casual"]
};

export function getOccasionMatches(occasion?: StylingOccasion): StylingOccasion[] {
  if (!occasion) {
    return [];
  }

  if (occasion === "mall" || occasion === "beach" || occasion === "gym" || occasion === "formal") {
    return occasionFilterGroups[occasion];
  }

  return [occasion];
}

export function getSeasonMatches(season?: StylingSeason): StylingSeason[] {
  if (!season) {
    return [];
  }

  if (season === "summer") {
    return ["summer", "all-season"];
  }

  if (season === "winter") {
    return ["winter", "all-season"];
  }

  return ["all-season"];
}

export function isDemographic(value: unknown): value is Demographic {
  return typeof value === "string" && demographics.includes(value as Demographic);
}

export function isStylingOccasion(value: unknown): value is StylingOccasion {
  return typeof value === "string" && stylingOccasions.includes(value as StylingOccasion);
}

export function isStylingSeason(value: unknown): value is StylingSeason {
  return typeof value === "string" && stylingSeasons.includes(value as StylingSeason);
}

export function isFaceShape(value: unknown): value is FaceShape {
  return typeof value === "string" && faceShapes.includes(value as FaceShape);
}

export function isMenswearSafeCategory(category: GarmentCategory) {
  return !MENSWEAR_BLOCKED_CATEGORIES.includes(
    category as (typeof MENSWEAR_BLOCKED_CATEGORIES)[number]
  );
}

export function isAllowedForDemographic(
  garment: Garment,
  demographic: Demographic,
  includeUnisex = true
) {
  const allowedDemographics = includeUnisex ? [demographic, "unisex"] : [demographic];
  const matchesDemographic = allowedDemographics.includes(garment.demographic);

  if (demographic === "menswear") {
    return matchesDemographic && isMenswearSafeCategory(garment.category);
  }

  return matchesDemographic;
}
