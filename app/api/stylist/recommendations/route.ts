import { NextResponse } from "next/server";
import { getGarments, getGroomingTrends } from "@/lib/data";
import {
  buildGroomingRecommendations,
  buildStylistRecommendations,
  bodyArchitectureLabels,
  getStyleProfile,
  isBodyArchitecture,
  isStyleProfileId,
  type BodyArchitecture,
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
  createVisionAnalysis,
  parseVisionAnalysis,
  type VisionAnalysis
} from "@/lib/vision";

type RecommendationRequest = {
  ageBand?: unknown;
  bodyArchitecture?: unknown;
  demographic?: unknown;
  faceShape?: unknown;
  occasion?: unknown;
  profileId?: unknown;
  season?: unknown;
  suggestedFitProfile?: unknown;
  visionData?: unknown;
};

async function readRecommendationRequest(request: Request): Promise<RecommendationRequest> {
  const text = await request.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as RecommendationRequest;
  } catch (error) {
    console.error("[stylist/recommendations] invalid JSON request", {
      error: error instanceof Error ? error.message : "unknown JSON parse error",
      preview: text.slice(0, 160)
    });
    return {};
  }
}

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

const bodyArchitectureMapping: Record<string, BodyArchitecture> = {
  "athletic / tapered": "athletic_tapered",
  "athletic tapered": "athletic_tapered",
  athletic_tapered: "athletic_tapered",
  "curvy / relaxed": "curvy_relaxed",
  "curvy relaxed": "curvy_relaxed",
  curvy_relaxed: "curvy_relaxed",
  "lean / slim": "lean_slim",
  "lean slim": "lean_slim",
  lean_slim: "lean_slim",
  "tall & broad": "tall_broad",
  "tall and broad": "tall_broad",
  tall_broad: "tall_broad"
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

function normalizeBodyArchitecture(value: unknown): BodyArchitecture {
  if (isBodyArchitecture(value)) {
    return value;
  }

  const normalized = normalizeSelection(value).replace(/&/g, "and");
  const mappedValue = bodyArchitectureMapping[normalized];

  if (mappedValue) {
    return mappedValue;
  }

  const matchingLabel = Object.entries(bodyArchitectureLabels).find(([, label]) => {
    return normalizeSelection(label).replace(/&/g, "and") === normalized;
  });

  if (matchingLabel) {
    return matchingLabel[0] as BodyArchitecture;
  }

  return "athletic_tapered";
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
  visionData: VisionAnalysis,
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
  const body = await readRecommendationRequest(request);
  const occasion = normalizeOccasion(body.occasion);
  const season = normalizeSeason(body.season);
  const bodyArchitecture = normalizeBodyArchitecture(body.bodyArchitecture);

  console.log("[stylist/recommendations] context", {
    bodyArchitecture,
    incomingOccasion: body.occasion,
    incomingSeason: body.season,
    normalizedOccasion: occasion,
    normalizedSeason: season
  });

  const fallbackVisionData = createVisionAnalysis({
    age_band: body.ageBand,
    demographic: body.demographic,
    faceShape: body.faceShape,
    primary_color_undertone: body.profileId,
    profileId: body.profileId,
    suggested_fit_profile: body.suggestedFitProfile
  });
  const visionData = parseVisionAnalysis(body.visionData, fallbackVisionData);
  const profileId: StyleProfileId = isStyleProfileId(visionData.primary_color_undertone)
    ? visionData.primary_color_undertone
    : "neutral";
  const shouldIncludeBeard = visionData.demographic !== "womenswear";

  const [garmentMatches, hairstyleMatches, beardMatches] = await Promise.all([
    getStrictClothingMatches(visionData, occasion, season),
    getGroomingTrends({
      category: "hairstyle",
      faceShape: visionData.detected_face_shape,
      limit: 80
    }),
    shouldIncludeBeard
      ? getGroomingTrends({
          category: "beard",
          faceShape: visionData.detected_face_shape,
          limit: 80
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
      bodyArchitecture,
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
    bodyArchitecture,
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
