import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";
import { getLocalGarments, getLocalGroomingTrends, getLocalTrends } from "@/lib/local-data";
import { sampleGarments, sampleTrends } from "@/lib/sample-data";
import {
  getOccasionMatches,
  getSeasonMatches,
  isAllowedForDemographic,
  MENSWEAR_SAFE_CATEGORIES,
  type Demographic,
  type FaceShape,
  type FitProfile,
  type Garment,
  type GarmentCategory,
  type GroomingCategory,
  type GroomingTrend,
  type StylingOccasion,
  type StylingSeason,
  type Trend
} from "@/lib/types";
import { ARCHIVE_END_YEAR, ARCHIVE_START_YEAR, isInArchiveWindow } from "@/lib/archive-window";

type GarmentQueryOptions = {
  demographic?: Demographic;
  includeUnisex?: boolean;
  categories?: GarmentCategory[];
  fitProfile?: FitProfile;
  occasion?: StylingOccasion;
  season?: StylingSeason;
  strictContext?: boolean;
  limit?: number;
};

type GroomingQueryOptions = {
  category?: GroomingCategory;
  faceShape?: FaceShape;
  limit?: number;
};

function shouldUseSampleData() {
  return process.env.NEXT_PUBLIC_ALLOW_SAMPLE_DATA === "true";
}

function filterGroomingTrends(
  groomingTrends: GroomingTrend[],
  options: GroomingQueryOptions = {}
) {
  return groomingTrends.filter((trend) => {
    const inCategory = !options.category || trend.category === options.category;
    const inFaceShape =
      !options.faceShape || trend.face_shapes.includes(options.faceShape);

    return inCategory && inFaceShape;
  });
}

function filterSampleGarments(options: GarmentQueryOptions = {}) {
  const categories =
    options.demographic === "menswear" ? MENSWEAR_SAFE_CATEGORIES : options.categories;
  const occasionMatches = getOccasionMatches(options.occasion);
  const seasonMatches = getSeasonMatches(options.season);

  return sampleGarments.filter((garment) => {
    const inWindow = isInArchiveWindow(garment.year);
    const inCategory = !categories || categories.includes(garment.category);
    const inFitProfile = !options.fitProfile || garment.fit_profile === options.fitProfile;
    const inDemographic = options.demographic
      ? isAllowedForDemographic(garment, options.demographic, options.includeUnisex ?? true)
      : true;
    const inOccasion = options.strictContext
      ? !options.occasion || garment.occasion.includes(options.occasion)
      : occasionMatches.length === 0 ||
        garment.occasion.some((occasion) => occasionMatches.includes(occasion));
    const inSeason = options.strictContext
      ? !options.season || garment.season.includes(options.season)
      : seasonMatches.length === 0 ||
        garment.season.some((season) => seasonMatches.includes(season));

    return inWindow && inCategory && inFitProfile && inDemographic && inOccasion && inSeason;
  });
}

async function getGarmentFallback(options: GarmentQueryOptions = {}) {
  if (shouldUseSampleData()) {
    return filterSampleGarments(options);
  }

  const categories =
    options.demographic === "menswear" ? MENSWEAR_SAFE_CATEGORIES : options.categories;
  const occasionMatches = getOccasionMatches(options.occasion);
  const seasonMatches = getSeasonMatches(options.season);
  const localGarments = await getLocalGarments();

  return localGarments.filter((garment) => {
    const inWindow = isInArchiveWindow(garment.year);
    const inCategory = !categories || categories.includes(garment.category);
    const inFitProfile = !options.fitProfile || garment.fit_profile === options.fitProfile;
    const inDemographic = options.demographic
      ? isAllowedForDemographic(garment, options.demographic, options.includeUnisex ?? true)
      : true;
    const inOccasion = options.strictContext
      ? !options.occasion || garment.occasion.includes(options.occasion)
      : occasionMatches.length === 0 ||
        garment.occasion.some((occasion) => occasionMatches.includes(occasion));
    const inSeason = options.strictContext
      ? !options.season || garment.season.includes(options.season)
      : seasonMatches.length === 0 ||
        garment.season.some((season) => seasonMatches.includes(season));

    return inWindow && inCategory && inFitProfile && inDemographic && inOccasion && inSeason;
  });
}

export async function getGarments(options: GarmentQueryOptions = {}): Promise<Garment[]> {
  if (!hasSupabaseConfig()) {
    return getGarmentFallback(options);
  }

  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return getGarmentFallback(options);
  }

  const demographics = options.demographic
    ? Array.from(new Set([options.demographic, ...(options.includeUnisex ?? true ? ["unisex" as const] : [])]))
    : undefined;
  const categories =
    options.demographic === "menswear" ? MENSWEAR_SAFE_CATEGORIES : options.categories;
  const occasionMatches = getOccasionMatches(options.occasion);
  const seasonMatches = getSeasonMatches(options.season);

  let query = supabase
    .from("garments")
    .select("*")
    .gte("year", ARCHIVE_START_YEAR)
    .lte("year", ARCHIVE_END_YEAR)
    .order("year", { ascending: false });

  if (demographics?.length) {
    query = query.in("demographic", demographics);
  }

  if (categories?.length) {
    query = query.in("category", categories);
  }

  if (options.fitProfile) {
    query = query.eq("fit_profile", options.fitProfile);
  }

  if (options.strictContext && options.occasion) {
    query = query.contains("occasion", [options.occasion]);
  } else if (occasionMatches.length) {
    query = query.overlaps("occasion", occasionMatches);
  }

  if (options.strictContext && options.season) {
    query = query.contains("season", [options.season]);
  } else if (seasonMatches.length) {
    query = query.overlaps("season", seasonMatches);
  }

  const { data, error } = await query.limit(options.limit ?? 250);

  if (error) {
    console.error("Unable to fetch garments from Supabase", error);
    return getGarmentFallback(options);
  }

  const fallback = await getGarmentFallback(options);

  return ((data ?? fallback) as Garment[]).filter((garment) => {
    const inWindow = isInArchiveWindow(garment.year);
    const inDemographic = options.demographic
      ? isAllowedForDemographic(garment, options.demographic, options.includeUnisex ?? true)
      : true;
    const inCategory = !categories || categories.includes(garment.category);
    const inFitProfile = !options.fitProfile || garment.fit_profile === options.fitProfile;
    const inOccasion = options.strictContext
      ? !options.occasion || garment.occasion.includes(options.occasion)
      : occasionMatches.length === 0 ||
        garment.occasion.some((occasion) => occasionMatches.includes(occasion));
    const inSeason = options.strictContext
      ? !options.season || garment.season.includes(options.season)
      : seasonMatches.length === 0 ||
        garment.season.some((season) => seasonMatches.includes(season));

    return inWindow && inDemographic && inCategory && inFitProfile && inOccasion && inSeason;
  });
}

export async function getTrends(): Promise<Trend[]> {
  if (!hasSupabaseConfig()) {
    return shouldUseSampleData() ? sampleTrends : getLocalTrends();
  }

  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return shouldUseSampleData() ? sampleTrends : getLocalTrends();
  }

  const { data, error } = await supabase
    .from("trends")
    .select("*")
    .order("forecast_year", { ascending: true });

  if (error) {
    console.error("Unable to fetch trends from Supabase", error);
    return shouldUseSampleData() ? sampleTrends : getLocalTrends();
  }

  const fallback = shouldUseSampleData() ? sampleTrends : await getLocalTrends();

  return (data ?? fallback) as Trend[];
}

async function getGroomingFallback(options: GroomingQueryOptions = {}) {
  const groomingTrends = await getLocalGroomingTrends();
  return filterGroomingTrends(groomingTrends, options).slice(0, options.limit ?? 50);
}

export async function getGroomingTrends(
  options: GroomingQueryOptions = {}
): Promise<GroomingTrend[]> {
  if (!hasSupabaseConfig()) {
    return getGroomingFallback(options);
  }

  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return getGroomingFallback(options);
  }

  let query = supabase
    .from("grooming_trends")
    .select("*")
    .order("year", { ascending: false });

  if (options.category) {
    query = query.eq("category", options.category);
  }

  if (options.faceShape) {
    query = query.contains("face_shapes", [options.faceShape]);
  }

  const { data, error } = await query.limit(options.limit ?? 50);

  if (error) {
    console.error("Unable to fetch grooming trends from Supabase", error);
    return getGroomingFallback(options);
  }

  const fallback = await getGroomingFallback(options);

  return filterGroomingTrends((data ?? fallback) as GroomingTrend[], options);
}

export function isUsingSampleData() {
  return shouldUseSampleData() && !hasSupabaseConfig();
}

export function getDataSourceLabel() {
  if (isUsingSampleData()) {
    return "Sample data";
  }

  return hasSupabaseConfig() ? "Supabase live" : "Local JSON data";
}
