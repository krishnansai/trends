import { generateAffiliateLink } from "@/lib/affiliate";
import { ARCHIVE_END_YEAR, ARCHIVE_START_YEAR } from "@/lib/archive-window";
import {
  getOccasionMatches,
  getSeasonMatches,
  isAllowedForDemographic,
  type Demographic,
  type FaceShape,
  type Garment,
  type GroomingCategory,
  type GroomingProduct,
  type GroomingTrend,
  type StylingOccasion,
  type StylingSeason
} from "@/lib/types";

export type StyleProfileId = "warm" | "cool" | "neutral";

export type StyleProfile = {
  id: StyleProfileId;
  title: string;
  dominantTones: string;
  fitType: string;
  palette: string[];
  tagBias: string[];
  rationale: string;
  trendSignals: string[];
};

export type OutfitRecommendation = {
  id: string;
  title: string;
  garment: Garment;
  supportPieces: string[];
  trendSignal: string;
  score: number;
};

export type GroomingRecommendation = {
  id: string;
  category: GroomingCategory;
  title: string;
  description: string;
  imageUrl: string;
  maintenanceLevel?: string;
  matchedFaceShape: FaceShape;
  product: GroomingProduct;
  affiliateUrl: string;
  rationale: string;
};

export type GroomingRecommendationSet = {
  hairstyle: GroomingRecommendation | null;
  beard: GroomingRecommendation | null;
};

type StylingContext = {
  occasion?: StylingOccasion;
  season?: StylingSeason;
};

const visionFaceShapes = ["oval", "square", "round", "rectangle", "diamond"] as const satisfies readonly FaceShape[];

const faceShapeFallbacks: Partial<Record<FaceShape, FaceShape[]>> = {
  heart: ["heart", "oval"],
  oblong: ["oblong", "rectangle", "diamond"],
  rectangle: ["rectangle", "oblong", "oval"]
};

export const styleProfiles: StyleProfile[] = [
  {
    id: "warm",
    title: "Warm earth undertone",
    dominantTones: "Terracotta, olive, ivory, and warm neutrals",
    fitType: "Relaxed structured fit",
    palette: ["#b43f2a", "#6b705c", "#d8ccb8", "#1f1f1f"],
    tagBias: ["artisanal", "texture", "utility", "quiet luxury", "tailored"],
    rationale:
      "Warm undertones hold textured neutrals well, so the engine prioritizes craft surfaces, olive utility, and relaxed tailoring that keeps contrast controlled.",
    trendSignals: ["craft texture", "soft utility", "quiet tailoring"]
  },
  {
    id: "cool",
    title: "Cool clear undertone",
    dominantTones: "Cobalt, black, optic white, and smoked gray",
    fitType: "Clean oversized fit",
    palette: ["#0057b8", "#111111", "#c7d0d8", "#ffffff"],
    tagBias: ["cobalt", "statement color", "tech tailoring", "monochrome", "mesh"],
    rationale:
      "Cool undertones can carry sharp contrast and saturated blues, so the engine weights cobalt accents, technical layers, and cleaner oversized proportions.",
    trendSignals: ["cobalt contrast", "performance shell layers", "graphic monochrome"]
  },
  {
    id: "neutral",
    title: "Neutral balanced undertone",
    dominantTones: "Stone, black, muted red, and soft beige",
    fitType: "Soft tailored fit",
    palette: ["#f3eee6", "#222222", "#7b1f2a", "#d9d0c1"],
    tagBias: ["sheer layering", "quiet luxury", "minimal", "tailored", "modular"],
    rationale:
      "Neutral undertones work across warm and cool families, so the engine chooses adaptable layers, muted contrast, and polished fits that can shift between casual and work settings.",
    trendSignals: ["transparent layering", "modular tailoring", "polished neutrals"]
  }
];

const supportPieceMap: Record<Demographic, Record<StyleProfileId, string[][]>> = {
  menswear: {
    warm: [
      ["ivory heavyweight tee", "olive relaxed trouser", "brushed leather sandal"],
      ["cream poplin overshirt", "warm gray utility pant", "woven crossbody"],
      ["terracotta knit polo", "stone relaxed denim", "minimal metal watch"]
    ],
    cool: [
      ["white technical tee", "washed-black straight denim", "silver hardware"],
      ["cobalt knit layer", "charcoal tailored trouser", "black loafer"],
      ["mesh base layer", "smoked-gray shell jacket", "optic white sneaker"]
    ],
    neutral: [
      ["stone tank", "black fluid trouser", "deep red cap"],
      ["ivory lightweight layer", "tailored charcoal short", "low-profile loafer"],
      ["soft beige overshirt", "tonal knit base", "minimal black belt"]
    ]
  },
  womenswear: {
    warm: [
      ["ivory rib tank", "olive wide-leg trouser", "brushed leather sandal"],
      ["cream poplin blouse", "warm gray utility skirt", "woven tote"],
      ["terracotta knit shell", "stone relaxed denim", "minimal gold hardware"]
    ],
    cool: [
      ["white technical tee", "washed-black straight denim", "silver hardware"],
      ["cobalt knit layer", "charcoal tailored trouser", "black slingback"],
      ["mesh long sleeve", "smoked-gray shell jacket", "optic white sneaker"]
    ],
    neutral: [
      ["stone tank", "black fluid trouser", "deep red accent bag"],
      ["sheer ivory layer", "tailored charcoal short", "low-profile loafer"],
      ["soft beige blazer", "tonal knit base", "minimal black belt"]
    ]
  },
  unisex: {
    warm: [
      ["ivory rib tank", "olive wide-leg trouser", "brushed leather sandal"],
      ["cream poplin overshirt", "warm gray utility pant", "woven tote"],
      ["terracotta knit shell", "stone relaxed denim", "minimal hardware"]
    ],
    cool: [
      ["white technical tee", "washed-black straight denim", "silver hardware"],
      ["cobalt knit layer", "charcoal tailored trouser", "black loafer"],
      ["mesh base layer", "smoked-gray shell jacket", "optic white sneaker"]
    ],
    neutral: [
      ["stone tank", "black fluid trouser", "deep red accent bag"],
      ["sheer ivory layer", "tailored charcoal short", "low-profile loafer"],
      ["soft beige overshirt", "tonal knit base", "minimal black belt"]
    ]
  }
};

function normalize(value: string) {
  return value.toLowerCase();
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function dedupe<T>(values: T[]) {
  return Array.from(new Set(values));
}

function scoreGarment(garment: Garment, profile: StyleProfile) {
  const searchable = normalize(
    [garment.description, garment.category, ...garment.style_tags].join(" ")
  );
  const tagScore = profile.tagBias.reduce((score, tag) => {
    return searchable.includes(normalize(tag)) ? score + 18 : score;
  }, 0);
  const recencyScore = (garment.year - ARCHIVE_START_YEAR) * 4;
  const currentYearBoost = garment.year === ARCHIVE_END_YEAR ? 14 : 0;
  const categoryBoost = garment.category === "outerwear" || garment.category === "tops" ? 8 : 4;

  return tagScore + recencyScore + currentYearBoost + categoryBoost;
}

function scoreContext(garment: Garment, context?: StylingContext) {
  const occasionMatches = getOccasionMatches(context?.occasion);
  const seasonMatches = getSeasonMatches(context?.season);
  const occasionScore =
    occasionMatches.length > 0 &&
    garment.occasion.some((occasion) => occasionMatches.includes(occasion))
      ? 28
      : 0;
  const seasonScore =
    seasonMatches.length > 0 && garment.season.some((season) => seasonMatches.includes(season))
      ? 22
      : 0;

  return occasionScore + seasonScore;
}

function supportPiecesForContext(
  demographic: Demographic,
  profileId: StyleProfileId,
  index: number,
  context?: StylingContext
) {
  if (context?.occasion === "beach") {
    return [
      ["linen resort shirt", "quick-dry swim short", "polarized sunglasses"],
      ["open-collar knit", "tailored swim short", "raffia bucket hat"],
      ["camp collar shirt", "leather sandal", "UV sunglasses"]
    ][index] ?? ["linen resort shirt", "quick-dry swim short", "polarized sunglasses"];
  }

  if (context?.occasion === "gym") {
    return [
      ["compression training top", "stretch short", "low-profile trainer"],
      ["moisture-wicking tee", "technical jogger", "training duffel"],
      ["mesh base layer", "performance sock", "sports watch"]
    ][index] ?? ["compression training top", "stretch short", "low-profile trainer"];
  }

  if (context?.occasion === "formal") {
    return [
      ["pleated trouser", "fine-gauge knit polo", "brushed steel watch"],
      ["soft blazer", "straight-leg trouser", "minimal loafer"],
      ["structured shirt", "tailored belt", "matte chain detail"]
    ][index] ?? ["pleated trouser", "fine-gauge knit polo", "brushed steel watch"];
  }

  if (context?.season === "winter") {
    return [
      ["insulated parka", "thermal knit base", "straight denim"],
      ["chunky sweater", "wool bomber", "weather-resistant boot"],
      ["hoodie layer", "field jacket", "brushed metal watch"]
    ][index] ?? ["insulated parka", "thermal knit base", "straight denim"];
  }

  if (context?.occasion === "mall") {
    return [
      ["boxy streetwear tee", "wide-leg cargo pant", "acetate sunglasses"],
      ["oversized hoodie", "straight denim", "crossbody sling"],
      ["cropped bomber", "graphic tee", "cuboid pendant"]
    ][index] ?? ["boxy streetwear tee", "wide-leg cargo pant", "acetate sunglasses"];
  }

  return supportPieceMap[demographic][profileId][index] ?? supportPieceMap[demographic][profileId][0];
}

export function getStyleProfile(profileId: StyleProfileId) {
  return styleProfiles.find((profile) => profile.id === profileId) ?? styleProfiles[0];
}

export function pickStyleProfileId(seed: string): StyleProfileId {
  const hash = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return styleProfiles[hash % styleProfiles.length].id;
}

export function isStyleProfileId(value: unknown): value is StyleProfileId {
  return typeof value === "string" && styleProfiles.some((profile) => profile.id === value);
}

export function detectDemographicFromImageSignal(seed: string, fallback: Demographic): Demographic {
  const normalizedSeed = normalize(seed);

  if (/(^|[^a-z])(male|man|men|mens|menswear|boy)([^a-z]|$)/.test(normalizedSeed)) {
    return "menswear";
  }

  if (/(^|[^a-z])(female|woman|women|womens|womenswear|girl)([^a-z]|$)/.test(normalizedSeed)) {
    return "womenswear";
  }

  return fallback;
}

export function detectFaceShapeFromImageSignal(seed: string): FaceShape {
  const normalizedSeed = normalize(seed);

  if (/(^|[^a-z])(oval)([^a-z]|$)/.test(normalizedSeed)) {
    return "oval";
  }

  if (/(^|[^a-z])(square)([^a-z]|$)/.test(normalizedSeed)) {
    return "square";
  }

  if (/(^|[^a-z])(round)([^a-z]|$)/.test(normalizedSeed)) {
    return "round";
  }

  if (/(^|[^a-z])(rectangle|rectangular|oblong|long)([^a-z]|$)/.test(normalizedSeed)) {
    return "rectangle";
  }

  if (/(^|[^a-z])(diamond)([^a-z]|$)/.test(normalizedSeed)) {
    return "diamond";
  }

  const hash = normalizedSeed.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return visionFaceShapes[hash % visionFaceShapes.length];
}

export function getFaceShapeQueryOrder(faceShape: FaceShape): FaceShape[] {
  return dedupe([faceShape, ...(faceShapeFallbacks[faceShape] ?? [])]);
}

function scoreGroomingTrend(trend: GroomingTrend, faceShape: FaceShape) {
  const queryOrder = getFaceShapeQueryOrder(faceShape);
  const faceShapeScore = trend.face_shapes.includes(faceShape)
    ? 100
    : trend.face_shapes.some((shape) => queryOrder.includes(shape))
      ? 70
      : 0;
  const recencyScore = trend.year === ARCHIVE_END_YEAR ? 20 : 0;
  const productScore = Math.min(trend.recommended_products.length, 2) * 5;
  const maintenanceScore = trend.maintenance_level ? 8 : 0;

  return faceShapeScore + recencyScore + productScore + maintenanceScore;
}

function buildGroomingCard(trend: GroomingTrend, faceShape: FaceShape): GroomingRecommendation {
  const product = trend.recommended_products[0] ?? {
    name: "Styling Product",
    search_query: trend.title
  };
  const matchedFaceShape = trend.face_shapes.includes(faceShape)
    ? faceShape
    : (trend.face_shapes.find((shape) => getFaceShapeQueryOrder(faceShape).includes(shape)) ??
      trend.face_shapes[0] ??
      faceShape);

  return {
    id: `${trend.category}-${trend.id}`,
    affiliateUrl: generateAffiliateLink(product.search_query),
    category: trend.category,
    description: trend.description,
    imageUrl: trend.image_url,
    maintenanceLevel: trend.maintenance_level,
    matchedFaceShape,
    product,
    rationale: `${titleCase(matchedFaceShape)} face structure pairs well with ${trend.title.toLowerCase()} because the style adds proportion control without fighting the natural outline.`,
    title: trend.title
  };
}

export function buildGroomingRecommendations(
  groomingTrends: GroomingTrend[],
  faceShape: FaceShape
): GroomingRecommendationSet {
  function pick(category: GroomingCategory) {
    const trend = groomingTrends
      .filter((item) => item.category === category)
      .sort((first, second) => {
        return (
          scoreGroomingTrend(second, faceShape) -
            scoreGroomingTrend(first, faceShape) ||
          second.year - first.year ||
          first.title.localeCompare(second.title)
        );
      })[0];

    return trend ? buildGroomingCard(trend, faceShape) : null;
  }

  return {
    beard: pick("beard"),
    hairstyle: pick("hairstyle")
  };
}

export function buildStylistRecommendations(
  garments: Garment[],
  profileId: StyleProfileId,
  demographic: Demographic,
  context?: StylingContext
): OutfitRecommendation[] {
  const profile = getStyleProfile(profileId);

  return garments
    .filter((garment) => isAllowedForDemographic(garment, demographic))
    .map((garment) => ({ garment, score: scoreGarment(garment, profile) + scoreContext(garment, context) }))
    .sort((first, second) => second.score - first.score || second.garment.year - first.garment.year)
    .slice(0, 3)
    .map(({ garment, score }, index) => ({
      id: `${profile.id}-${garment.id}`,
      title: garment.title || `${titleCase(garment.style_tags[0] ?? garment.category)} Outfit`,
      garment,
      score,
      supportPieces: supportPiecesForContext(demographic, profile.id, index, context),
      trendSignal: `${ARCHIVE_END_YEAR} signal: ${profile.trendSignals[index] ?? profile.trendSignals[0]}`
    }));
}
