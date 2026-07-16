import { NextResponse } from "next/server";
import { getGarments, getGroomingTrends } from "@/lib/data";
import {
  buildGroomingRecommendations,
  buildStylistRecommendations,
  getStyleProfile,
  isStyleProfileId,
  type StyleProfileId
} from "@/lib/stylist";
import {
  getOccasionMatches,
  getSeasonMatches,
  isStylingOccasion,
  isStylingSeason,
  type StylingOccasion,
  type StylingSeason
} from "@/lib/types";
import {
  createVisionProfile,
  parseVisionProfile,
  type VisionProfile
} from "@/lib/vision";

type RecommendationRequest = {
  ageBand?: unknown;
  demographic?: unknown;
  faceShape?: unknown;
  occasion?: unknown;
  profileId?: unknown;
  season?: unknown;
  suggestedFitProfile?: unknown;
  visionData?: unknown;
};

const occasionMapping: Record<string, StylingOccasion> = {
  "beach / vacation": "beach",
  "formal / office": "office",
  "gym / athletic": "gym",
  "mall / street": "mall"
};

const seasonMapping: Record<string, StylingSeason> = {
  "all season": "all-season",
  "all-season": "all-season",
  summer: "summer",
  winter: "winter"
};

function normalizeSelection(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}

function normalizeOccasion(value: unknown): StylingOccasion {
  if (isStylingOccasion(value)) {
    return value;
  }

  const normalized = normalizeSelection(value);
  return occasionMapping[normalized] ?? "mall";
}

function normalizeSeason(value: unknown): StylingSeason {
  if (isStylingSeason(value)) {
    return value;
  }

  const normalized = normalizeSelection(value);
  return seasonMapping[normalized] ?? "all-season";
}

function mergeGarments<T extends { id: string }>(primary: T[], secondary: T[]) {
  const garmentMap = new Map(primary.map((garment) => [garment.id, garment]));

  for (const garment of secondary) {
    if (!garmentMap.has(garment.id)) {
      garmentMap.set(garment.id, garment);
    }
  }

  return Array.from(garmentMap.values());
}

function enforceCompatibleContext<T extends { occasion: StylingOccasion[]; season: StylingSeason[] }>(
  garments: T[],
  occasion: StylingOccasion,
  season: StylingSeason
) {
  const occasionMatches = getOccasionMatches(occasion);
  const seasonMatches = getSeasonMatches(season);

  return garments.filter(
    (garment) =>
      garment.occasion.some((itemOccasion) => occasionMatches.includes(itemOccasion)) &&
      garment.season.some((itemSeason) => seasonMatches.includes(itemSeason))
  );
}

async function getStrictClothingMatches(
  visionData: VisionProfile,
  occasion: StylingOccasion,
  season: StylingSeason
) {
  const strictFitMatches = await getGarments({
    demographic: visionData.demographic,
    fitProfile: visionData.suggested_fit_profile,
    includeUnisex: true,
    limit: 60,
    occasion,
    season,
    strictContext: true
  });

  const strictContextMatches = await getGarments({
    demographic: visionData.demographic,
    includeUnisex: true,
    limit: 60,
    occasion,
    season,
    strictContext: false
  });

  return enforceCompatibleContext(
    mergeGarments(strictFitMatches, strictContextMatches),
    occasion,
    season
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RecommendationRequest;
  const occasion = normalizeOccasion(body.occasion);
  const season = normalizeSeason(body.season);

  console.log("[stylist/recommendations] context", {
    incomingOccasion: body.occasion,
    incomingSeason: body.season,
    normalizedOccasion: occasion,
    normalizedSeason: season
  });

  const fallbackVisionData = createVisionProfile({
    age_band: body.ageBand,
    demographic: body.demographic,
    faceShape: body.faceShape,
    primary_color_undertone: body.profileId,
    profileId: body.profileId,
    suggested_fit_profile: body.suggestedFitProfile
  });
  const visionData = parseVisionProfile(body.visionData, fallbackVisionData);
  const profileId: StyleProfileId = isStyleProfileId(visionData.primary_color_undertone)
    ? visionData.primary_color_undertone
    : "neutral";
  const shouldIncludeBeard = visionData.demographic !== "womenswear";

  const [garmentMatches, hairstyleMatches, beardMatches] = await Promise.all([
    getStrictClothingMatches(visionData, occasion, season),
    getGroomingTrends({
      category: "hairstyle",
      faceShape: visionData.detected_face_shape,
      limit: 12
    }),
    shouldIncludeBeard
      ? getGroomingTrends({
          category: "beard",
          faceShape: visionData.detected_face_shape,
          limit: 12
        })
      : Promise.resolve([])
  ]);
  const exactRecommendations = buildStylistRecommendations(
    garmentMatches,
    profileId,
    visionData.demographic,
    {
      occasion,
      season
    },
    {
      ageBand: visionData.age_band,
      faceShape: visionData.detected_face_shape,
      recommendedColorPalette: visionData.recommended_color_palette,
      suggestedFitProfile: visionData.suggested_fit_profile
    }
  );
  const recommendations = exactRecommendations.slice(0, 3);
  const contextWarning =
    recommendations.length === 0
      ? `No compatible ${occasion} + ${season} garments matched the strict context guardrail.`
      : "";
  const grooming = buildGroomingRecommendations(
    [...hairstyleMatches, ...beardMatches],
    visionData.detected_face_shape
  );

  return NextResponse.json({
    demographic: visionData.demographic,
    faceShape: visionData.detected_face_shape,
    grooming,
    contextWarning,
    occasion,
    profile: getStyleProfile(profileId),
    recommendations,
    season,
    visionData
  });
}
