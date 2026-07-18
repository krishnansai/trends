import type { StylingSeason } from "@/lib/types";

export type ClimateCondition = "cold" | "hot" | "mild" | "rain" | "snow";

export type ClimateContext = {
  apparentTemperatureC?: number | null;
  condition: ClimateCondition;
  humidity?: number | null;
  locationLabel: string;
  precipitationMm?: number | null;
  rainMm?: number | null;
  snowfallCm?: number | null;
  summary: string;
  temperatureC: number;
  updatedAt: string;
  weatherCode?: number | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function classifyClimate({
  precipitationMm = 0,
  rainMm = 0,
  snowfallCm = 0,
  temperatureC,
  weatherCode
}: {
  precipitationMm?: number | null;
  rainMm?: number | null;
  snowfallCm?: number | null;
  temperatureC: number;
  weatherCode?: number | null;
}): ClimateCondition {
  const code = weatherCode ?? 0;

  if ((snowfallCm ?? 0) > 0 || (code >= 71 && code <= 77) || code === 85 || code === 86) {
    return "snow";
  }

  if (
    (rainMm ?? 0) > 0 ||
    (precipitationMm ?? 0) > 0.1 ||
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    code === 95
  ) {
    return "rain";
  }

  if (temperatureC > 25) {
    return "hot";
  }

  if (temperatureC < 15) {
    return "cold";
  }

  return "mild";
}

export function getSeasonFromClimate(climate: ClimateContext): StylingSeason {
  if (climate.condition === "hot") {
    return "summer";
  }

  if (climate.condition === "cold" || climate.condition === "snow") {
    return "winter";
  }

  return "all-season";
}

export function getClimateDirective(climate: ClimateContext) {
  if (climate.condition === "hot") {
    return "Recommending breathable, lightweight fabrics.";
  }

  if (climate.condition === "cold" || climate.condition === "snow") {
    return "Prioritizing layers, heavier textures, and outerwear.";
  }

  if (climate.condition === "rain") {
    return "Prioritizing weather-resistant layers and darker footwear.";
  }

  return "Keeping all-season fabrics and clean layering available.";
}

export function formatClimateSummary(climate: ClimateContext) {
  const conditionLabel: Record<ClimateCondition, string> = {
    cold: "Cold",
    hot: climate.humidity && climate.humidity >= 65 ? "Humid" : "Warm",
    mild: "Mild",
    rain: "Rain likely",
    snow: "Snow likely"
  };

  return `${climate.locationLabel} - ${Math.round(climate.temperatureC)}C, ${
    conditionLabel[climate.condition]
  }. ${getClimateDirective(climate)}`;
}

export function normalizeClimateContext(value: unknown): ClimateContext | null {
  if (!isObject(value)) {
    return null;
  }

  const temperatureC = numberOrNull(value.temperatureC);

  if (temperatureC === null) {
    return null;
  }

  const apparentTemperatureC = numberOrNull(value.apparentTemperatureC);
  const humidity = numberOrNull(value.humidity);
  const precipitationMm = numberOrNull(value.precipitationMm);
  const rainMm = numberOrNull(value.rainMm);
  const snowfallCm = numberOrNull(value.snowfallCm);
  const weatherCode = numberOrNull(value.weatherCode);
  const condition =
    typeof value.condition === "string" &&
    ["cold", "hot", "mild", "rain", "snow"].includes(value.condition)
      ? (value.condition as ClimateCondition)
      : classifyClimate({
          precipitationMm,
          rainMm,
          snowfallCm,
          temperatureC,
          weatherCode
        });
  const locationLabel =
    typeof value.locationLabel === "string" && value.locationLabel.trim()
      ? value.locationLabel.trim()
      : "Local weather";
  const updatedAt =
    typeof value.updatedAt === "string" && value.updatedAt.trim()
      ? value.updatedAt
      : new Date().toISOString();
  const normalized: ClimateContext = {
    apparentTemperatureC,
    condition,
    humidity,
    locationLabel,
    precipitationMm,
    rainMm,
    snowfallCm,
    summary: "",
    temperatureC,
    updatedAt,
    weatherCode
  };

  return {
    ...normalized,
    summary:
      typeof value.summary === "string" && value.summary.trim()
        ? value.summary.trim()
        : formatClimateSummary(normalized)
  };
}

export function isHotClimate(climate?: ClimateContext | null) {
  return climate?.condition === "hot";
}

export function isColdClimate(climate?: ClimateContext | null) {
  return climate?.condition === "cold" || climate?.condition === "snow";
}

export function isRainClimate(climate?: ClimateContext | null) {
  return climate?.condition === "rain" || climate?.condition === "snow";
}
