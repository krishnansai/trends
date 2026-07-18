import type { FitProfile, Garment } from "@/lib/types";

export type FitPreference = "boxy_oversized" | "relaxed_straight" | "tailored_slim";
export type AvoidTone = "all_black" | "earth_tones" | "neons" | "pastels";
export type BudgetTier = "archive_designer" | "fast_fashion" | "premium_basics";

export type StylistPreferences = {
  avoidTones: AvoidTone[];
  budgetTier: BudgetTier;
  completed: boolean;
  fitPreference: FitPreference;
};

export const fitPreferenceLabels: Record<FitPreference, string> = {
  boxy_oversized: "Boxy & Oversized",
  relaxed_straight: "Relaxed & Straight",
  tailored_slim: "Tailored & Slim"
};

export const avoidToneLabels: Record<AvoidTone, string> = {
  all_black: "All Black",
  earth_tones: "Earth Tones",
  neons: "Neons",
  pastels: "Pastels"
};

export const budgetTierLabels: Record<BudgetTier, string> = {
  archive_designer: "Archive Designer",
  fast_fashion: "Fast Fashion",
  premium_basics: "Premium Basics"
};

export const defaultStylistPreferences: StylistPreferences = {
  avoidTones: [],
  budgetTier: "premium_basics",
  completed: false,
  fitPreference: "relaxed_straight"
};

const fitPreferences = Object.keys(fitPreferenceLabels) as FitPreference[];
const avoidTones = Object.keys(avoidToneLabels) as AvoidTone[];
const budgetTiers = Object.keys(budgetTierLabels) as BudgetTier[];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeStylistPreferences(value: unknown): StylistPreferences {
  if (!isObject(value)) {
    return defaultStylistPreferences;
  }

  const fitPreference = fitPreferences.includes(value.fitPreference as FitPreference)
    ? (value.fitPreference as FitPreference)
    : defaultStylistPreferences.fitPreference;
  const budgetTier = budgetTiers.includes(value.budgetTier as BudgetTier)
    ? (value.budgetTier as BudgetTier)
    : defaultStylistPreferences.budgetTier;
  const normalizedAvoidTones = Array.isArray(value.avoidTones)
    ? value.avoidTones.filter((tone): tone is AvoidTone => avoidTones.includes(tone as AvoidTone))
    : [];

  return {
    avoidTones: Array.from(new Set(normalizedAvoidTones)),
    budgetTier,
    completed: Boolean(value.completed),
    fitPreference
  };
}

export function getPreferredFitProfiles(preference: FitPreference): FitProfile[] {
  if (preference === "tailored_slim") {
    return ["slim", "regular", "straight"];
  }

  if (preference === "boxy_oversized") {
    return ["boxy", "oversized", "relaxed", "straight"];
  }

  return ["relaxed", "straight", "regular", "boxy"];
}

function searchableGarmentText(garment: Garment) {
  return [
    garment.title,
    garment.description,
    garment.category,
    garment.fit_profile,
    ...garment.style_tags,
    ...garment.color_palette
  ]
    .join(" ")
    .toLowerCase();
}

export function garmentMatchesAvoidedTone(garment: Garment, avoidTone: AvoidTone) {
  const searchable = searchableGarmentText(garment);

  if (avoidTone === "neons") {
    return /neon|fluorescent|electric|highlighter|acid/.test(searchable);
  }

  if (avoidTone === "earth_tones") {
    return /olive|khaki|sand|tan|beige|brown|terracotta|rust|camel|stone|cream/.test(searchable);
  }

  if (avoidTone === "all_black") {
    return /all black|monochrome black|blackout|#000000|#111111|#1a1a1a/.test(searchable);
  }

  return /pastel|powder|baby pink|soft pink|lavender|mint|sky blue/.test(searchable);
}

export function scorePreferenceMatch(garment: Garment, preferences?: StylistPreferences) {
  if (!preferences) {
    return 0;
  }

  const searchable = searchableGarmentText(garment);
  let score = getPreferredFitProfiles(preferences.fitPreference).includes(garment.fit_profile) ? 24 : -12;

  if (preferences.avoidTones.some((tone) => garmentMatchesAvoidedTone(garment, tone))) {
    score -= 160;
  }

  if (preferences.budgetTier === "fast_fashion") {
    score += /basic|casual|tee|denim|cotton|minimal|simple/.test(searchable) ? 10 : 0;
  } else if (preferences.budgetTier === "premium_basics") {
    score += /quiet|minimal|premium|heavyweight|structured|tailored|linen|cotton/.test(searchable) ? 12 : 0;
  } else {
    score += /archive|designer|tailoring|statement|wool|leather|silk|structured/.test(searchable) ? 14 : 0;
  }

  return score;
}
