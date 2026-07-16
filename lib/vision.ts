import {
  isFaceShape,
  type Demographic,
  type FaceShape,
  type FitProfile
} from "@/lib/types";

export type VisionDemographic = Demographic;
export type VisionAgeBand = "young_adult" | "adult" | "mature";
export type VisionUndertone = "warm" | "cool" | "neutral";
export type VisionFitProfile = Extract<FitProfile, "relaxed" | "oversized" | "straight" | "slim">;

export type VisionProfile = {
  age_band: VisionAgeBand;
  demographic: VisionDemographic;
  detected_face_shape: Exclude<FaceShape, "heart" | "oblong">;
  primary_color_undertone: VisionUndertone;
  suggested_fit_profile: VisionFitProfile;
  recommended_color_palette: [string, string, string];
};

export const VISION_IMAGE_ANALYZER_SYSTEM_PROMPT = `You are the core computer vision engine for a premium fashion and grooming platform. Analyze the uploaded user image and return a strict, minified JSON object. Do not include any markdown formatting, code blocks, or conversational text. Only return the JSON object.

Analyze and extract these exact keys:

demographic: Value must strictly be one of "menswear", "womenswear", or "unisex". Classify the requested wardrobe presentation, then keep recommendations inside that wardrobe category plus unisex items only.

age_band: Choose exactly one broad styling band from: ["young_adult", "adult", "mature"]. Do not estimate exact age. Use this only as a fashion styling band based on visual presentation; if uncertain, return "adult".

detected_face_shape: Choose exactly one from: ["oval", "square", "round", "rectangle", "diamond"]. Base this on their jawline, cheekbones, and facial proportions.

primary_color_undertone: Analyze the user's skin, hair, and existing clothing tones. Classify as "warm", "cool", or "neutral".

suggested_fit_profile: Based on their physical frame, determine if they look best in "relaxed", "oversized", "straight", or "slim" garments.

recommended_color_palette: Provide an array of 3 hex color codes that would look exceptionally flattering on them based on their undertone.

Example JSON Output:
{"demographic":"womenswear","age_band":"adult","detected_face_shape":"oval","primary_color_undertone":"warm","suggested_fit_profile":"relaxed","recommended_color_palette":["#1A1A1A","#4F5D4E","#D8C3A5"]}`;

export const visionAgeBands = ["young_adult", "adult", "mature"] as const satisfies readonly VisionAgeBand[];
export const visionDemographics = ["menswear", "womenswear", "unisex"] as const satisfies readonly VisionDemographic[];
export const visionFaceShapes = ["oval", "square", "round", "rectangle", "diamond"] as const satisfies readonly VisionProfile["detected_face_shape"][];
export const visionUndertones = ["warm", "cool", "neutral"] as const satisfies readonly VisionUndertone[];
export const visionFitProfiles = ["relaxed", "oversized", "straight", "slim"] as const satisfies readonly VisionFitProfile[];

const undertonePalettes: Record<VisionUndertone, [string, string, string]> = {
  cool: ["#111111", "#C7D0D8", "#0057B8"],
  neutral: ["#222222", "#D9D0C1", "#7B1F2A"],
  warm: ["#1A1A1A", "#4F5D4E", "#D8C3A5"]
};

function isVisionDemographic(value: unknown): value is VisionDemographic {
  return typeof value === "string" && visionDemographics.includes(value as VisionDemographic);
}

function isVisionAgeBand(value: unknown): value is VisionAgeBand {
  return typeof value === "string" && visionAgeBands.includes(value as VisionAgeBand);
}

function isVisionFaceShape(value: unknown): value is VisionProfile["detected_face_shape"] {
  return typeof value === "string" && visionFaceShapes.includes(value as VisionProfile["detected_face_shape"]);
}

function isVisionUndertone(value: unknown): value is VisionUndertone {
  return typeof value === "string" && visionUndertones.includes(value as VisionUndertone);
}

function isVisionFitProfile(value: unknown): value is VisionFitProfile {
  return typeof value === "string" && visionFitProfiles.includes(value as VisionFitProfile);
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function normalizePalette(value: unknown, undertone: VisionUndertone): [string, string, string] {
  if (Array.isArray(value) && value.length === 3 && value.every(isHexColor)) {
    return value as [string, string, string];
  }

  return undertonePalettes[undertone];
}

function normalizeFaceShape(value: unknown): VisionProfile["detected_face_shape"] {
  if (isVisionFaceShape(value)) {
    return value;
  }

  if (isFaceShape(value) && value === "oblong") {
    return "rectangle";
  }

  return "oval";
}

export function createVisionProfile(input: {
  age_band?: unknown;
  ageBand?: unknown;
  demographic?: unknown;
  detected_face_shape?: unknown;
  faceShape?: unknown;
  primary_color_undertone?: unknown;
  profileId?: unknown;
  recommended_color_palette?: unknown;
  suggested_fit_profile?: unknown;
}): VisionProfile {
  const age_band = isVisionAgeBand(input.age_band)
    ? input.age_band
    : isVisionAgeBand(input.ageBand)
      ? input.ageBand
      : "adult";
  const demographic = isVisionDemographic(input.demographic) ? input.demographic : "menswear";
  const primary_color_undertone = isVisionUndertone(input.primary_color_undertone)
    ? input.primary_color_undertone
    : isVisionUndertone(input.profileId)
      ? input.profileId
      : "neutral";
  const suggested_fit_profile = isVisionFitProfile(input.suggested_fit_profile)
    ? input.suggested_fit_profile
    : "relaxed";

  return {
    age_band,
    demographic,
    detected_face_shape: normalizeFaceShape(input.detected_face_shape ?? input.faceShape),
    primary_color_undertone,
    recommended_color_palette: normalizePalette(
      input.recommended_color_palette,
      primary_color_undertone
    ),
    suggested_fit_profile
  };
}

export function parseVisionProfile(value: unknown, fallback: VisionProfile): VisionProfile {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const payload = value as Partial<VisionProfile>;

  return createVisionProfile({
    age_band: payload.age_band ?? fallback.age_band,
    demographic: payload.demographic ?? fallback.demographic,
    detected_face_shape: payload.detected_face_shape ?? fallback.detected_face_shape,
    primary_color_undertone: payload.primary_color_undertone ?? fallback.primary_color_undertone,
    recommended_color_palette:
      payload.recommended_color_palette ?? fallback.recommended_color_palette,
    suggested_fit_profile: payload.suggested_fit_profile ?? fallback.suggested_fit_profile
  });
}
