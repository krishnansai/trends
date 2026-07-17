import {
  getOccasionMatches,
  getSeasonMatches,
  type Garment,
  type GarmentCategory,
  type StylingOccasion,
  type StylingSeason
} from "@/lib/types";

export type VibeSearchIntent = {
  categories: GarmentCategory[];
  colorHexes: string[];
  colorTerms: string[];
  fabricTags: string[];
  hasIntent: boolean;
  matchedKeywords: string[];
  occasions: StylingOccasion[];
  query: string;
  seasons: StylingSeason[];
  styleTags: string[];
  summary: string;
  tokens: string[];
};

type VibeRule = {
  categories?: GarmentCategory[];
  colorHexes?: string[];
  colorTerms?: string[];
  fabricTags?: string[];
  keywords: string[];
  occasions?: StylingOccasion[];
  seasons?: StylingSeason[];
  styleTags?: string[];
};

const vibeRules: VibeRule[] = [
  {
    fabricTags: ["heavyweight", "wool", "puffer", "insulated", "thermal", "fleece"],
    keywords: ["rainy", "freezing", "snow", "snowy", "cold", "winter", "storm"],
    seasons: ["winter", "all-season"],
    styleTags: ["winterwear", "layering", "utility", "gorpcore"]
  },
  {
    fabricTags: ["linen", "seersucker", "lightweight cotton", "breathable"],
    keywords: ["hot", "humid", "heat", "summer", "breathable", "linen", "lightweight"],
    seasons: ["summer", "all-season"],
    styleTags: ["summer", "resort", "relaxed"]
  },
  {
    keywords: ["beach", "pool", "coastal", "resort", "vacation"],
    occasions: ["beach", "vacation", "pool"],
    seasons: ["summer"],
    styleTags: ["resort", "beachwear", "relaxed"]
  },
  {
    keywords: ["wedding", "ceremony", "reception"],
    occasions: ["formal", "office"],
    styleTags: ["tailoring", "smart-casual", "quiet-luxury"]
  },
  {
    keywords: ["office", "client meeting", "meeting", "business", "formal", "presentation"],
    occasions: ["formal", "office"],
    styleTags: ["tailoring", "smart-casual", "quiet-luxury"]
  },
  {
    keywords: ["mall", "shopping", "street", "streetwear", "date night", "date"],
    occasions: ["mall", "street", "casual"],
    styleTags: ["streetwear", "casual", "urban"]
  },
  {
    keywords: ["gym", "workout", "athletic", "training", "sporty"],
    occasions: ["gym", "athletic", "sporty"],
    styleTags: ["athleisure", "sporty", "performance"]
  },
  {
    colorHexes: ["#111111", "#222222", "#F7F7F7"],
    colorTerms: ["black", "white", "charcoal", "gray"],
    keywords: ["monochrome", "all black", "black and white", "minimalist"],
    styleTags: ["minimalist", "monochrome", "quiet-luxury"]
  },
  {
    colorHexes: ["#6B705C", "#B43F2A", "#D8CCB8", "#8A6A4F"],
    colorTerms: ["olive", "terracotta", "ivory", "beige", "stone", "brown"],
    keywords: ["earth tones", "earthy", "warm neutrals", "neutral warm"],
    styleTags: ["artisanal", "texture", "utility", "quiet-luxury"]
  },
  {
    colorHexes: ["#0057B8", "#C7D0D8", "#111111", "#FFFFFF"],
    colorTerms: ["cobalt", "blue", "silver", "optic white"],
    keywords: ["cool tone", "cool tones", "cobalt", "blue accent"],
    styleTags: ["cobalt", "statement color", "tech tailoring"]
  },
  {
    categories: ["tops"],
    keywords: ["shirt", "tee", "t-shirt", "polo", "hoodie", "sweater", "top"]
  },
  {
    categories: ["bottoms"],
    keywords: ["pant", "pants", "trouser", "trousers", "jeans", "denim", "shorts"]
  },
  {
    categories: ["outerwear"],
    keywords: ["jacket", "coat", "parka", "overshirt", "layer"]
  },
  {
    categories: ["footwear"],
    keywords: ["shoe", "shoes", "sneaker", "sneakers", "loafer", "sandal", "boot"]
  }
];

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function hasKeyword(query: string, keyword: string) {
  return query.includes(normalize(keyword));
}

function tokenize(query: string) {
  return normalize(query)
    .split(" ")
    .filter((token) => token.length > 2 && !["and", "for", "the", "with"].includes(token));
}

function garmentSearchText(garment: Garment) {
  return normalize(
    [
      garment.title,
      garment.description,
      garment.category,
      garment.fit_profile,
      garment.demographic,
      ...garment.style_tags,
      ...garment.occasion,
      ...garment.season
    ].join(" ")
  );
}

function colorDistance(first: string, second: string) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);

  if (!a || !b) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
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

function scoreColorMatch(garment: Garment, colorHexes: string[]) {
  if (colorHexes.length === 0 || garment.color_palette.length === 0) {
    return 0;
  }

  const closestDistance = Math.min(
    ...colorHexes.flatMap((targetColor) =>
      garment.color_palette.map((garmentColor) => colorDistance(targetColor, garmentColor))
    )
  );

  if (!Number.isFinite(closestDistance)) {
    return 0;
  }

  return Math.max(0, 28 - (closestDistance / 441) * 28);
}

export function parseVibeSearch(rawQuery: string): VibeSearchIntent {
  const query = normalize(rawQuery);
  const matchedRules = vibeRules.filter((rule) =>
    rule.keywords.some((keyword) => hasKeyword(query, keyword))
  );
  const matchedKeywords = matchedRules.flatMap((rule) =>
    rule.keywords.filter((keyword) => hasKeyword(query, keyword))
  );
  const occasions = unique(matchedRules.flatMap((rule) => rule.occasions ?? []));
  const seasons = unique(matchedRules.flatMap((rule) => rule.seasons ?? []));
  const styleTags = unique(matchedRules.flatMap((rule) => rule.styleTags ?? []));
  const fabricTags = unique(matchedRules.flatMap((rule) => rule.fabricTags ?? []));
  const colorTerms = unique(matchedRules.flatMap((rule) => rule.colorTerms ?? []));
  const colorHexes = unique(matchedRules.flatMap((rule) => rule.colorHexes ?? []));
  const categories = unique(matchedRules.flatMap((rule) => rule.categories ?? []));
  const tokens = tokenize(query);
  const summaryParts = [
    occasions.length ? `occasion: ${occasions.join(", ")}` : "",
    seasons.length ? `season: ${seasons.join(", ")}` : "",
    styleTags.length ? `tags: ${styleTags.slice(0, 4).join(", ")}` : "",
    colorTerms.length ? `colors: ${colorTerms.slice(0, 4).join(", ")}` : ""
  ].filter(Boolean);

  return {
    categories,
    colorHexes,
    colorTerms,
    fabricTags,
    hasIntent: query.length > 1,
    matchedKeywords: unique(matchedKeywords),
    occasions,
    query,
    seasons,
    styleTags,
    summary: summaryParts.join(" · ") || "ranking by typed vibe",
    tokens
  };
}

export function scoreGarmentForVibe(garment: Garment, intent: VibeSearchIntent) {
  if (!intent.hasIntent) {
    return 0;
  }

  const searchText = garmentSearchText(garment);
  const occasionMatches = intent.occasions.flatMap(getOccasionMatches);
  const seasonMatches = intent.seasons.flatMap(getSeasonMatches);
  const occasionScore =
    occasionMatches.length > 0 && garment.occasion.some((occasion) => occasionMatches.includes(occasion))
      ? 34
      : 0;
  const seasonScore =
    seasonMatches.length > 0 && garment.season.some((season) => seasonMatches.includes(season))
      ? 28
      : 0;
  const categoryScore = intent.categories.includes(garment.category) ? 20 : 0;
  const tagScore = [...intent.styleTags, ...intent.fabricTags].reduce(
    (score, tag) => score + (searchText.includes(normalize(tag)) ? 9 : 0),
    0
  );
  const colorTermScore = intent.colorTerms.reduce(
    (score, color) => score + (searchText.includes(normalize(color)) ? 7 : 0),
    0
  );
  const tokenScore = intent.tokens.reduce(
    (score, token) => score + (searchText.includes(token) ? 4 : 0),
    0
  );
  const recencyScore = Math.max(0, garment.year - 2022) * 2;

  return (
    occasionScore +
    seasonScore +
    categoryScore +
    tagScore +
    colorTermScore +
    scoreColorMatch(garment, intent.colorHexes) +
    tokenScore +
    recencyScore
  );
}

export function filterAndRankGarmentsByVibe(garments: Garment[], intent: VibeSearchIntent) {
  if (!intent.hasIntent) {
    return garments;
  }

  const occasionMatches = intent.occasions.flatMap(getOccasionMatches);
  const seasonMatches = intent.seasons.flatMap(getSeasonMatches);

  return garments
    .map((garment) => ({
      garment,
      score: scoreGarmentForVibe(garment, intent)
    }))
    .filter(({ garment, score }) => {
      if (score <= 0) {
        return false;
      }

      if (
        occasionMatches.length > 0 &&
        !garment.occasion.some((occasion) => occasionMatches.includes(occasion))
      ) {
        return false;
      }

      if (seasonMatches.length > 0 && !garment.season.some((season) => seasonMatches.includes(season))) {
        return false;
      }

      if (intent.categories.length > 0 && !intent.categories.includes(garment.category)) {
        return false;
      }

      return true;
    })
    .sort((first, second) => second.score - first.score || second.garment.year - first.garment.year)
    .map(({ garment }) => garment);
}
