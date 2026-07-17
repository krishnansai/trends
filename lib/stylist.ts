import { generateAffiliateLink } from "@/lib/affiliate";
import { ARCHIVE_END_YEAR, ARCHIVE_START_YEAR } from "@/lib/archive-window";
import stylistFilterRules from "@/data/stylist-filter-rules.json";
import type { VisionAgeBand } from "@/lib/vision";
import {
  getOccasionMatches,
  getSeasonMatches,
  isAllowedForDemographic,
  type Demographic,
  type FaceShape,
  type FitProfile,
  type Garment,
  type GroomingCategory,
  type GroomingProduct,
  type GroomingTrend,
  type StylingOccasion,
  type StylingSeason
} from "@/lib/types";

export type StyleProfileId = "warm" | "cool" | "neutral";
export type BodyArchitecture = "tall_broad" | "athletic_tapered" | "lean_slim" | "curvy_relaxed";

export const bodyArchitectureLabels: Record<BodyArchitecture, string> = {
  athletic_tapered: "Athletic / Tapered",
  curvy_relaxed: "Curvy / Relaxed",
  lean_slim: "Lean / Slim",
  tall_broad: "Tall & Broad"
};

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
  fitReason: string;
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

type RecommendationScoringInput = {
  ageBand?: VisionAgeBand;
  bodyArchitecture?: BodyArchitecture;
  faceShape?: FaceShape;
  recommendedColorPalette?: string[];
  suggestedFitProfile?: FitProfile;
};

type StylistFilterRule = {
  id: string;
  demographics: Demographic[];
  age_bands?: VisionAgeBand[];
  occasions: StylingOccasion[];
  seasons: StylingSeason[];
  undertones: StyleProfileId[];
  face_shapes: FaceShape[];
  fit_profiles: FitProfile[];
  category_weights: Partial<Record<Garment["category"], number>>;
  tag_weights: Record<string, number>;
  rationale: string;
};

const visionFaceShapes = ["oval", "square", "round", "rectangle", "diamond"] as const satisfies readonly FaceShape[];

const faceShapeFallbacks: Partial<Record<FaceShape, FaceShape[]>> = {
  heart: ["heart", "oval"],
  oblong: ["oblong", "rectangle", "diamond"],
  rectangle: ["rectangle", "oblong", "oval"]
};
const filterRules = stylistFilterRules as unknown as StylistFilterRule[];
const primaryRecommendationCategories = new Set<Garment["category"]>([
  "blouses",
  "bottoms",
  "dresses",
  "outerwear",
  "skirts",
  "tops"
]);
const beachPrimaryRecommendationCategories = new Set<Garment["category"]>([
  "blouses",
  "bottoms",
  "dresses",
  "skirts",
  "tops"
]);

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

function searchableGarmentText(garment: Garment) {
  return normalize(
    [garment.title, garment.description, garment.category, garment.fit_profile, ...garment.style_tags].join(" ")
  );
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
  const hasExactOccasion = Boolean(context?.occasion && garment.occasion.includes(context.occasion));
  const hasGroupedOccasion =
    occasionMatches.length > 0 &&
    garment.occasion.some((occasion) => occasionMatches.includes(occasion));
  const hasExactSeason = Boolean(context?.season && garment.season.includes(context.season));
  const hasGroupedSeason =
    seasonMatches.length > 0 && garment.season.some((season) => seasonMatches.includes(season));
  const occasionScore = hasExactOccasion ? 42 : hasGroupedOccasion ? 26 : 0;
  const seasonScore = hasExactSeason
    ? 38
    : hasGroupedSeason && garment.season.includes("all-season")
      ? 12
      : 0;
  const seasonPenalty =
    context?.season === "summer" && !garment.season.includes("summer") && garment.season.includes("winter")
      ? -140
      : context?.season === "winter" && !garment.season.includes("winter") && garment.season.includes("summer")
        ? -120
        : 0;

  return occasionScore + seasonScore + seasonPenalty;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return null;
  }

  return {
    b: Number.parseInt(normalized.slice(4, 6), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    r: Number.parseInt(normalized.slice(0, 2), 16)
  };
}

type RgbColor = NonNullable<ReturnType<typeof hexToRgb>>;

function isRgbColor(value: ReturnType<typeof hexToRgb>): value is RgbColor {
  return value !== null;
}

function rgbDistance(first: RgbColor, second: RgbColor) {
  return Math.sqrt(
    (first.r - second.r) ** 2 + (first.g - second.g) ** 2 + (first.b - second.b) ** 2
  );
}

function scorePaletteMatch(garment: Garment, preferredPalette?: string[]) {
  if (!preferredPalette?.length || garment.color_palette.length === 0) {
    return 0;
  }

  const garmentColors = garment.color_palette.map(hexToRgb).filter(isRgbColor);
  const preferredColors = preferredPalette.map(hexToRgb).filter(isRgbColor);

  if (garmentColors.length === 0 || preferredColors.length === 0) {
    return 0;
  }

  const averageClosestDistance =
    preferredColors.reduce((total, preferred) => {
      const closest = Math.min(...garmentColors.map((color) => rgbDistance(preferred, color)));
      return total + closest;
    }, 0) / preferredColors.length;

  return Math.max(0, 48 - (averageClosestDistance / 441) * 48);
}

function scoreFitMatch(garment: Garment, preferredFit?: FitProfile) {
  if (!preferredFit) {
    return 0;
  }

  if (garment.fit_profile === preferredFit) {
    return 36;
  }

  const compatibleFits: Record<FitProfile, FitProfile[]> = {
    boxy: ["oversized", "relaxed", "straight"],
    oversized: ["boxy", "relaxed", "straight"],
    regular: ["straight", "relaxed", "slim"],
    relaxed: ["straight", "boxy", "regular", "oversized"],
    slim: ["straight", "regular"],
    straight: ["regular", "relaxed", "slim", "boxy"]
  };

  const index = compatibleFits[preferredFit].indexOf(garment.fit_profile);

  if (index === -1) {
    return 0;
  }

  return Math.max(10, 28 - index * 6);
}

function scoreKeywordMatches(searchable: string, keywords: string[], points: number, cap: number) {
  const score = keywords.reduce((total, keyword) => {
    return searchable.includes(normalize(keyword)) ? total + points : total;
  }, 0);

  return Math.min(score, cap);
}

function scoreBodyArchitectureMatch(garment: Garment, bodyArchitecture?: BodyArchitecture) {
  if (!bodyArchitecture) {
    return 0;
  }

  const searchable = searchableGarmentText(garment);

  if (bodyArchitecture === "tall_broad" || bodyArchitecture === "athletic_tapered") {
    const structureBoost = scoreKeywordMatches(
      searchable,
      [
        "boxy",
        "heavyweight",
        "gsm",
        "structured",
        "relaxed taper",
        "relaxed",
        "straight",
        "drop shoulder",
        "dropped shoulders",
        "wide-leg",
        "pleated"
      ],
      8,
      48
    );
    const categoryBoost = garment.category === "outerwear" || garment.category === "tops" || garment.category === "bottoms" ? 10 : 0;
    const clingPenalty = scoreKeywordMatches(searchable, ["skinny", "clingy", "cropped", "ultra slim"], 16, 34);

    return structureBoost + categoryBoost - clingPenalty;
  }

  if (bodyArchitecture === "lean_slim") {
    const densityBoost = scoreKeywordMatches(
      searchable,
      [
        "layer",
        "layering",
        "textured",
        "texture",
        "knit",
        "corduroy",
        "structured shoulder",
        "overshirt",
        "jacket",
        "wool",
        "cable",
        "boxy"
      ],
      8,
      50
    );
    const overwhelmPenalty = scoreKeywordMatches(searchable, ["balloon", "very oversized", "extra wide"], 12, 24);

    return densityBoost - overwhelmPenalty;
  }

  const drapeBoost = scoreKeywordMatches(
    searchable,
    [
      "relaxed",
      "drape",
      "draped",
      "wide-leg",
      "straight",
      "soft",
      "stretch",
      "fluid",
      "wrap",
      "a-line",
      "oversized"
    ],
    8,
    52
  );
  const clingPenalty = scoreKeywordMatches(searchable, ["bodycon", "skinny", "clingy", "ultra slim"], 14, 34);

  return drapeBoost - clingPenalty;
}

export function getBodyArchitectureFitReason(
  garment: Garment,
  bodyArchitecture: BodyArchitecture = "athletic_tapered"
) {
  const searchable = searchableGarmentText(garment);

  if (bodyArchitecture === "tall_broad") {
    if (/(boxy|heavyweight|structured|dropped shoulders|drop shoulder|straight|wide-leg)/.test(searchable)) {
      return "Structured volume balances height and shoulder width without making the outfit cling.";
    }

    return "Clean proportions keep a taller or broader frame balanced from shoulder to hem.";
  }

  if (bodyArchitecture === "athletic_tapered") {
    if (/(relaxed|straight|taper|pleated|boxy|structured)/.test(searchable)) {
      return "Room through the shoulder and thigh keeps the athletic line sharp without pulling tight.";
    }

    return "The silhouette keeps definition while avoiding overly slim proportions.";
  }

  if (bodyArchitecture === "lean_slim") {
    if (/(texture|textured|knit|corduroy|wool|layer|overshirt|jacket|boxy)/.test(searchable)) {
      return "Texture and light structure add visual density without overwhelming a lean frame.";
    }

    return "The cleaner line adds shape while staying light enough for a slimmer frame.";
  }

  if (/(relaxed|drape|draped|wide-leg|straight|soft|stretch|fluid|wrap|a-line)/.test(searchable)) {
    return "A relaxed, fluid cut gives movement while keeping the silhouette clean.";
  }

  return "The fit avoids harsh cling and keeps the profile balanced.";
}

function scoreAgeBandMatch(garment: Garment, ageBand?: VisionAgeBand) {
  if (!ageBand) {
    return 0;
  }

  const ranges: Record<VisionAgeBand, [number, number]> = {
    adult: [25, 44],
    mature: [40, 70],
    young_adult: [16, 29]
  };
  const values = garment.age_group.match(/\d+/g)?.map(Number) ?? [];

  if (values.length < 2) {
    return 0;
  }

  const [minAge, maxAge] = [Math.min(values[0], values[1]), Math.max(values[0], values[1])];
  const [bandMin, bandMax] = ranges[ageBand];
  const overlaps = minAge <= bandMax && maxAge >= bandMin;

  if (!overlaps) {
    return 0;
  }

  const bandMid = (bandMin + bandMax) / 2;
  const garmentMid = (minAge + maxAge) / 2;
  const distance = Math.abs(bandMid - garmentMid);

  return Math.max(8, 22 - distance * 0.45);
}

function matchesRuleContext(
  rule: StylistFilterRule,
  demographic: Demographic,
  profileId: StyleProfileId,
  context?: StylingContext,
  scoringInput: RecommendationScoringInput = {}
) {
  if (!rule.demographics.includes(demographic)) {
    return false;
  }

  if (rule.age_bands?.length && scoringInput.ageBand && !rule.age_bands.includes(scoringInput.ageBand)) {
    return false;
  }

  if (context?.occasion) {
    const occasionMatches = getOccasionMatches(context.occasion);

    if (!rule.occasions.some((occasion) => occasionMatches.includes(occasion))) {
      return false;
    }
  }

  if (context?.season) {
    const seasonMatches = getSeasonMatches(context.season);

    if (!rule.seasons.some((season) => seasonMatches.includes(season))) {
      return false;
    }
  }

  if (!rule.undertones.includes(profileId)) {
    return false;
  }

  if (scoringInput.faceShape && !rule.face_shapes.includes(scoringInput.faceShape)) {
    return false;
  }

  if (
    scoringInput.suggestedFitProfile &&
    !rule.fit_profiles.includes(scoringInput.suggestedFitProfile)
  ) {
    return false;
  }

  return true;
}

function scoreJsonFilterRules(
  garment: Garment,
  demographic: Demographic,
  profileId: StyleProfileId,
  context?: StylingContext,
  scoringInput: RecommendationScoringInput = {}
) {
  const searchable = normalize(
    [garment.title, garment.description, garment.category, ...garment.style_tags].join(" ")
  );

  return filterRules.reduce((score, rule) => {
    if (!matchesRuleContext(rule, demographic, profileId, context, scoringInput)) {
      return score;
    }

    const categoryScore = rule.category_weights[garment.category] ?? 0;
    const tagScore = Object.entries(rule.tag_weights).reduce((tagTotal, [tag, value]) => {
      return searchable.includes(normalize(tag)) ? tagTotal + value : tagTotal;
    }, 0);

    return score + 18 + categoryScore + Math.min(tagScore, 54);
  }, 0);
}

function getJsonFilterRuleSignal(
  garment: Garment,
  demographic: Demographic,
  profileId: StyleProfileId,
  context?: StylingContext,
  scoringInput: RecommendationScoringInput = {}
) {
  const matchingRule = filterRules.find((rule) => {
    if (!matchesRuleContext(rule, demographic, profileId, context, scoringInput)) {
      return false;
    }

    const searchable = normalize(
      [garment.title, garment.description, garment.category, ...garment.style_tags].join(" ")
    );

    return (
      Boolean(rule.category_weights[garment.category]) ||
      Object.keys(rule.tag_weights).some((tag) => searchable.includes(normalize(tag)))
    );
  });

  if (!matchingRule) {
    return null;
  }

  return `${ARCHIVE_END_YEAR} accuracy rule: ${matchingRule.rationale}`;
}

function isPrimaryRecommendationCategory(category: Garment["category"], context?: StylingContext) {
  if (context?.occasion === "beach") {
    return beachPrimaryRecommendationCategories.has(category);
  }

  return primaryRecommendationCategories.has(category);
}

function pickDiverseRecommendations<T extends { garment: Garment; score: number }>(
  items: T[],
  context?: StylingContext
) {
  const selected: T[] = [];
  const selectedCategories = new Set<string>();

  function selectFrom(candidates: T[], requireNewCategory: boolean) {
    for (const item of candidates) {
      if (selected.length >= 3) {
        break;
      }

      if (selected.some((selectedItem) => selectedItem.garment.id === item.garment.id)) {
        continue;
      }

      if (requireNewCategory && selectedCategories.has(item.garment.category)) {
        continue;
      }

      selected.push(item);
      selectedCategories.add(item.garment.category);
    }
  }

  const primaryItems = items.filter((item) =>
    isPrimaryRecommendationCategory(item.garment.category, context)
  );

  selectFrom(primaryItems, true);
  selectFrom(primaryItems, false);
  selectFrom(items, false);

  return selected;
}

function supportPiecesForContext(
  demographic: Demographic,
  profileId: StyleProfileId,
  index: number,
  context?: StylingContext
) {
  if (context?.occasion === "beach") {
    if (demographic === "womenswear") {
      return [
        ["relaxed resort shirt", "wide-leg linen pant", "raffia tote"],
        ["crochet cover-up", "woven sandal", "oval sunglasses"],
        ["floral midi dress", "market tote", "soft gold jewelry"]
      ][index] ?? ["relaxed resort shirt", "wide-leg linen pant", "raffia tote"];
    }

    if (demographic === "unisex") {
      return [
        ["linen resort shirt", "drawstring beach pant", "polarized sunglasses"],
        ["rib tank", "wide-leg linen pant", "canvas tote"],
        ["UPF swim layer", "straw sun hat", "minimal sandal"]
      ][index] ?? ["linen resort shirt", "drawstring beach pant", "polarized sunglasses"];
    }

    return [
      ["linen resort shirt", "quick-dry swim short", "polarized sunglasses"],
      ["open-collar knit", "tailored swim short", "raffia bucket hat"],
      ["camp collar shirt", "leather sandal", "UV sunglasses"]
    ][index] ?? ["linen resort shirt", "quick-dry swim short", "polarized sunglasses"];
  }

  if (context?.occasion === "gym") {
    if (demographic === "womenswear") {
      return [
        ["sculpted rib tank", "performance skort", "court sneaker"],
        ["training tee", "stretch short", "nylon duffel"],
        ["studio jacket", "supportive trainer", "sports watch"]
      ][index] ?? ["sculpted rib tank", "performance skort", "court sneaker"];
    }

    return [
      ["compression training top", "stretch short", "low-profile trainer"],
      ["moisture-wicking tee", "technical jogger", "training duffel"],
      ["mesh base layer", "performance sock", "sports watch"]
    ][index] ?? ["compression training top", "stretch short", "low-profile trainer"];
  }

  if (context?.occasion === "formal" || context?.occasion === "office") {
    if (demographic === "womenswear") {
      return [
        ["soft-volume blouse", "satin midi skirt", "structured shoulder bag"],
        ["power blazer", "tailored short", "square-toe flat"],
        ["column knit dress", "silk scarf", "minimal watch"]
      ][index] ?? ["soft-volume blouse", "satin midi skirt", "structured shoulder bag"];
    }

    return [
      ["pleated trouser", "fine-gauge knit polo", "brushed steel watch"],
      ["soft blazer", "straight-leg trouser", "minimal loafer"],
      ["structured shirt", "tailored belt", "matte chain detail"]
    ][index] ?? ["pleated trouser", "fine-gauge knit polo", "brushed steel watch"];
  }

  if (context?.season === "winter") {
    if (demographic === "womenswear") {
      return [
        ["belted trench", "column knit dress", "ballet flat"],
        ["soft suede jacket", "utility maxi skirt", "structured tote"],
        ["power blazer", "rib knit base", "compact shoulder bag"]
      ][index] ?? ["belted trench", "column knit dress", "ballet flat"];
    }

    return [
      ["insulated parka", "thermal knit base", "straight denim"],
      ["chunky sweater", "wool bomber", "weather-resistant boot"],
      ["hoodie layer", "field jacket", "brushed metal watch"]
    ][index] ?? ["insulated parka", "thermal knit base", "straight denim"];
  }

  if (context?.occasion === "mall") {
    if (demographic === "womenswear") {
      return [
        ["graphic baby tee", "straight denim", "platform sneaker"],
        ["soft blouse", "utility maxi skirt", "compact shoulder bag"],
        ["cropped jacket", "rib tank", "oval sunglasses"]
      ][index] ?? ["graphic baby tee", "straight denim", "platform sneaker"];
    }

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

export function isBodyArchitecture(value: unknown): value is BodyArchitecture {
  return typeof value === "string" && value in bodyArchitectureLabels;
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
  context?: StylingContext,
  scoringInput: RecommendationScoringInput = {}
): OutfitRecommendation[] {
  const profile = getStyleProfile(profileId);
  const scoredGarments = garments
    .filter((garment) => isAllowedForDemographic(garment, demographic))
    .map((garment) => ({
      garment,
      score:
        scoreGarment(garment, profile) +
        scoreContext(garment, context) +
        scoreAgeBandMatch(garment, scoringInput.ageBand) +
        scoreBodyArchitectureMatch(garment, scoringInput.bodyArchitecture) +
        scoreFitMatch(garment, scoringInput.suggestedFitProfile) +
        scorePaletteMatch(garment, scoringInput.recommendedColorPalette) +
        scoreJsonFilterRules(garment, demographic, profile.id, context, scoringInput)
    }))
    .sort((first, second) => second.score - first.score || second.garment.year - first.garment.year);

  return pickDiverseRecommendations(scoredGarments, context)
    .map(({ garment, score }, index) => ({
      id: `${profile.id}-${garment.id}`,
      title: garment.title || `${titleCase(garment.style_tags[0] ?? garment.category)} Outfit`,
      fitReason: getBodyArchitectureFitReason(garment, scoringInput.bodyArchitecture),
      garment,
      score,
      supportPieces: supportPiecesForContext(demographic, profile.id, index, context),
      trendSignal:
        getJsonFilterRuleSignal(garment, demographic, profile.id, context, scoringInput) ??
        `${ARCHIVE_END_YEAR} signal: ${profile.trendSignals[index] ?? profile.trendSignals[0]}`
    }));
}
