import { isHotClimate, type ClimateContext } from "@/lib/climate";
import {
  garmentMatchesAvoidedTone,
  getPreferredFitProfiles,
  type StylistPreferences
} from "@/lib/stylist-preferences";
import { isMenswearSafeFootwear, type Demographic, type Garment } from "@/lib/types";

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

function isFitSensitiveGarment(garment: Garment) {
  return ["blouses", "bottoms", "dresses", "outerwear", "skirts", "tops"].includes(
    garment.category
  );
}

export function applyClimateGarmentGuardrails(garments: Garment[], climate?: ClimateContext | null) {
  if (!climate || !isHotClimate(climate)) {
    return garments;
  }

  return garments.filter((garment) => {
    const searchable = searchableGarmentText(garment);
    const blocksHeat =
      /heavyweight|240gsm|300gsm|450gsm|wool|wool-blend|fleece|puffer|parka|thermal/.test(
        searchable
      );
    const isWinterOnly = garment.season.includes("winter") && !garment.season.includes("summer");

    return !blocksHeat && !isWinterOnly;
  });
}

export function applyPreferenceGarmentGuardrails(
  garments: Garment[],
  preferences?: StylistPreferences
) {
  if (!preferences?.completed) {
    return garments;
  }

  const toneFiltered = garments.filter(
    (garment) => !preferences.avoidTones.some((tone) => garmentMatchesAvoidedTone(garment, tone))
  );
  const preferredFits = getPreferredFitProfiles(preferences.fitPreference);
  const fitFiltered = toneFiltered.filter((garment) => {
    return !isFitSensitiveGarment(garment) || preferredFits.includes(garment.fit_profile);
  });

  return fitFiltered.length >= 3 ? fitFiltered : toneFiltered;
}

export function applyDemographicGarmentGuardrails(garments: Garment[], demographic: Demographic) {
  if (demographic === "womenswear") {
    return garments.filter((garment) => {
      const searchable = [
        garment.title,
        garment.description,
        garment.category,
        garment.source_url,
        ...garment.style_tags
      ]
        .join(" ")
        .toLowerCase();
      const hasMenswearLeak =
        /\b(menswear|mens|men's|hommes|male model|beard|barber|gentleman)\b/.test(searchable);

      return garment.demographic === "womenswear" && !hasMenswearLeak;
    });
  }

  if (demographic === "unisex") {
    return garments.filter((garment) => garment.demographic === "unisex");
  }

  return garments.filter((garment) => garment.demographic === "menswear" && isMenswearSafeFootwear(garment));
}
