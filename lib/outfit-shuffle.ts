import {
  getOccasionMatches,
  getSeasonMatches,
  isAllowedForDemographic,
  type Demographic,
  type Garment,
  type GarmentCategory,
  type StylingOccasion,
  type StylingSeason
} from "@/lib/types";

export type OutfitSlotRole = "Top / Layer" | "Bottom" | "Footwear";

type PickAlternativeInput = {
  demographic: Demographic;
  excludeIds?: string[];
  garments: Garment[];
  occasion: StylingOccasion;
  palette?: string[];
  role: OutfitSlotRole;
  season: StylingSeason;
};

const categoriesByRole: Record<OutfitSlotRole, GarmentCategory[]> = {
  Bottom: ["bottoms", "skirts"],
  Footwear: ["footwear"],
  "Top / Layer": ["tops", "outerwear", "blouses", "dresses"]
};

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

function colorDistance(first: RgbColor, second: RgbColor) {
  return Math.sqrt(
    (first.r - second.r) ** 2 + (first.g - second.g) ** 2 + (first.b - second.b) ** 2
  );
}

function scorePalette(garment: Garment, palette: string[] = []) {
  const garmentColors = garment.color_palette.map(hexToRgb).filter(isRgbColor);
  const targetColors = palette.map(hexToRgb).filter(isRgbColor);

  if (garmentColors.length === 0 || targetColors.length === 0) {
    return 0;
  }

  const closestDistance = Math.min(
    ...targetColors.flatMap((target) =>
      garmentColors.map((garmentColor) => colorDistance(target, garmentColor))
    )
  );

  return Math.max(0, 42 - (closestDistance / 441) * 42);
}

function scoreGarment(garment: Garment, input: PickAlternativeInput) {
  const searchable = [garment.title, garment.description, ...garment.style_tags].join(" ").toLowerCase();
  const contextScore = garment.occasion.includes(input.occasion) ? 34 : 22;
  const seasonScore = garment.season.includes(input.season) ? 30 : 16;
  const recencyScore = Math.max(0, garment.year - 2022) * 4;
  const textureScore = /(linen|wool|cotton|leather|nylon|knit|textured|heavyweight|breathable)/.test(searchable)
    ? 10
    : 0;

  return contextScore + seasonScore + recencyScore + textureScore + scorePalette(garment, input.palette);
}

export function getCategoriesForOutfitRole(role: OutfitSlotRole) {
  return categoriesByRole[role] ?? categoriesByRole["Top / Layer"];
}

export function pickAlternativeGarment(input: PickAlternativeInput) {
  const excludedIds = new Set(input.excludeIds ?? []);
  const occasionMatches = getOccasionMatches(input.occasion);
  const seasonMatches = getSeasonMatches(input.season);
  const categories = getCategoriesForOutfitRole(input.role);

  return input.garments
    .filter((garment) => {
      if (excludedIds.has(garment.id)) {
        return false;
      }

      if (!categories.includes(garment.category)) {
        return false;
      }

      if (!isAllowedForDemographic(garment, input.demographic, true)) {
        return false;
      }

      if (!garment.occasion.some((occasion) => occasionMatches.includes(occasion))) {
        return false;
      }

      if (!garment.season.some((season) => seasonMatches.includes(season))) {
        return false;
      }

      return true;
    })
    .map((garment) => ({
      garment,
      score: scoreGarment(garment, input)
    }))
    .sort((first, second) => second.score - first.score || second.garment.year - first.garment.year)
    .at(0)?.garment ?? null;
}
