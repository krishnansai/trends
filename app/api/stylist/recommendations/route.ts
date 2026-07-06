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
  isStylingOccasion,
  isStylingSeason,
  type Garment,
  type StylingOccasion,
  type StylingSeason
} from "@/lib/types";
import {
  createVisionProfile,
  parseVisionProfile,
  type VisionProfile
} from "@/lib/vision";

type RecommendationRequest = {
  demographic?: unknown;
  faceShape?: unknown;
  occasion?: unknown;
  profileId?: unknown;
  season?: unknown;
  suggestedFitProfile?: unknown;
  visionData?: unknown;
};

function mergeGarments(primary: Garment[], secondary: Garment[]) {
  const garmentMap = new Map(primary.map((garment) => [garment.id, garment]));

  for (const garment of secondary) {
    if (!garmentMap.has(garment.id)) {
      garmentMap.set(garment.id, garment);
    }
  }

  return Array.from(garmentMap.values());
}

async function getStrictClothingMatches(
  visionData: VisionProfile,
  occasion: StylingOccasion,
  season: StylingSeason
) {
  const strictMatches = await getGarments({
    demographic: visionData.demographic,
    fitProfile: visionData.suggested_fit_profile,
    includeUnisex: false,
    limit: 20,
    occasion,
    season,
    strictContext: true
  });

  const fitContextMatches = await getGarments({
    demographic: visionData.demographic,
    fitProfile: visionData.suggested_fit_profile,
    includeUnisex: false,
    limit: 20,
    occasion,
    season
  });

  const contextMatches = await getGarments({
    demographic: visionData.demographic,
    includeUnisex: false,
    limit: 20,
    occasion,
    season
  });

  const demographicMatches = await getGarments({
    demographic: visionData.demographic,
    includeUnisex: false,
    limit: 20
  });

  return {
    fallbackMatches: mergeGarments(fitContextMatches, mergeGarments(contextMatches, demographicMatches))
      .filter((garment) => !strictMatches.some((strictGarment) => strictGarment.id === garment.id)),
    strictMatches
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RecommendationRequest;
  const occasion: StylingOccasion = isStylingOccasion(body.occasion) ? body.occasion : "mall";
  const season: StylingSeason = isStylingSeason(body.season) ? body.season : "all-season";
  const fallbackVisionData = createVisionProfile({
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

  const [garmentMatches, hairstyleMatches, beardMatches] = await Promise.all([
    getStrictClothingMatches(visionData, occasion, season),
    getGroomingTrends({
      category: "hairstyle",
      faceShape: visionData.detected_face_shape,
      limit: 12
    }),
    getGroomingTrends({
      category: "beard",
      faceShape: visionData.detected_face_shape,
      limit: 12
    })
  ]);
  const exactRecommendations = buildStylistRecommendations(
    garmentMatches.strictMatches,
    profileId,
    visionData.demographic,
    {
      occasion,
      season
    }
  );
  const fallbackRecommendations = buildStylistRecommendations(
    garmentMatches.fallbackMatches,
    profileId,
    visionData.demographic,
    {
      occasion,
      season
    }
  );
  const recommendations = [...exactRecommendations, ...fallbackRecommendations].slice(0, 3);
  const grooming = buildGroomingRecommendations(
    [...hairstyleMatches, ...beardMatches],
    visionData.detected_face_shape
  );

  return NextResponse.json({
    demographic: visionData.demographic,
    faceShape: visionData.detected_face_shape,
    grooming,
    occasion,
    profile: getStyleProfile(profileId),
    recommendations,
    season,
    visionData
  });
}
