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

export type VisionAnalysis = VisionProfile & {
  analysis_confidence: number;
  avoid_notes: string[];
  grooming_strategy: string;
  outfit_strategy: string;
  visible_cues: string[];
};

export const VISION_IMAGE_ANALYZER_SYSTEM_PROMPT = `You are the core computer vision engine for a premium fashion and grooming platform. Analyze the uploaded user image and return a strict, minified JSON object. Do not include any markdown formatting, code blocks, or conversational text. Only return the JSON object.

Analyze and extract these exact keys:

demographic: Value must strictly be one of "menswear", "womenswear", or "unisex". Classify the requested wardrobe presentation, then keep recommendations inside that wardrobe category plus unisex items only.

age_band: Choose exactly one broad styling band from: ["young_adult", "adult", "mature"]. Do not estimate exact age. Use this only as a fashion styling band based on visual presentation; if uncertain, return "adult".

detected_face_shape: Choose exactly one from: ["oval", "square", "round", "rectangle", "diamond"]. Base this on their jawline, cheekbones, and facial proportions.

primary_color_undertone: Analyze the user's skin, hair, and existing clothing tones. Classify as "warm", "cool", or "neutral".

suggested_fit_profile: Based on their physical frame, determine if they look best in "relaxed", "oversized", "straight", or "slim" garments.

recommended_color_palette: Provide an array of 3 hex color codes that would look exceptionally flattering on them based on their undertone.

analysis_confidence: Number from 0 to 100 based on image clarity, visible face, visible clothing, and lighting. Use lower confidence when the image is blurry, cropped, dark, or face/body cues are unclear.

If the uploaded image is not a usable personal styling photo, such as a product-only image, scenery, document, screenshot, empty frame, or a photo without a clear person/profile, do not invent a profile. Set analysis_confidence to 20, use safe fallback values for required fields, set visible_cues to ["wrong image for stylist","no clear person detected","upload portrait or full-body photo"], and explain in outfit_strategy that the image is not suitable for a personal styling scan.

visible_cues: Array of 3 short non-sensitive visual cues that explain the analysis, such as "clear jawline", "warm clothing tones", or "upper body only". Do not mention exact age, identity, ethnicity, or private attributes.

outfit_strategy: One concise sentence explaining the best outfit direction based on wardrobe profile, undertone, fit, and selected visual proportions.

grooming_strategy: One concise sentence explaining the haircut/beard direction based on detected face shape. If womenswear, make this a hair styling direction and do not force beard advice.

avoid_notes: Array of 2 concise notes about what to avoid, based on fit, color, or context mismatch.

Example JSON Output:
{"demographic":"womenswear","age_band":"adult","detected_face_shape":"oval","primary_color_undertone":"warm","suggested_fit_profile":"relaxed","recommended_color_palette":["#1A1A1A","#4F5D4E","#D8C3A5"],"analysis_confidence":82,"visible_cues":["clear face outline","warm skin and clothing tones","relaxed shoulder line"],"outfit_strategy":"Use relaxed warm neutrals with structured texture so the outfit looks polished without becoming stiff.","grooming_strategy":"Oval face shape can support soft layers or clean face-framing hair with balanced volume.","avoid_notes":["Avoid very cold neon colors near the face.","Avoid overly tight fits when relaxed structure is the better proportion."]}`;

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

function normalizeConfidence(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return 62;
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function normalizeStringArray(value: unknown, fallback: string[], limit: number) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, limit);

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
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

function getDefaultVisibleCues(profile: VisionProfile) {
  return [
    `${profile.primary_color_undertone} undertone signal`,
    `${profile.suggested_fit_profile} fit direction`,
    `${profile.detected_face_shape} face-shape estimate`
  ];
}

function getDefaultOutfitStrategy(profile: VisionProfile) {
  const wardrobe = profile.demographic === "unisex" ? "unisex wardrobe" : profile.demographic;
  return `Use ${profile.suggested_fit_profile} ${wardrobe} pieces with ${profile.primary_color_undertone} palette control so the outfit matches the visible profile instead of generic trends.`;
}

function getDefaultGroomingStrategy(profile: VisionProfile) {
  if (profile.demographic === "womenswear") {
    return `${profile.detected_face_shape} face structure works best with balanced face-framing hair and controlled volume around the cheek and jaw line.`;
  }

  return `${profile.detected_face_shape} face structure should be paired with grooming that sharpens proportion without adding unnecessary bulk.`;
}

function getDefaultAvoidNotes(profile: VisionProfile) {
  return [
    `Avoid recommendations outside the ${profile.demographic} wardrobe guardrail.`,
    `Avoid colors that fight the ${profile.primary_color_undertone} undertone signal.`
  ];
}

export function createVisionAnalysis(input: Parameters<typeof createVisionProfile>[0] & {
  analysis_confidence?: unknown;
  avoid_notes?: unknown;
  grooming_strategy?: unknown;
  outfit_strategy?: unknown;
  visible_cues?: unknown;
}): VisionAnalysis {
  const profile = createVisionProfile(input);

  return {
    ...profile,
    analysis_confidence: normalizeConfidence(input.analysis_confidence),
    avoid_notes: normalizeStringArray(input.avoid_notes, getDefaultAvoidNotes(profile), 2),
    grooming_strategy: normalizeText(
      input.grooming_strategy,
      getDefaultGroomingStrategy(profile)
    ),
    outfit_strategy: normalizeText(input.outfit_strategy, getDefaultOutfitStrategy(profile)),
    visible_cues: normalizeStringArray(input.visible_cues, getDefaultVisibleCues(profile), 3)
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

export function parseVisionAnalysis(value: unknown, fallback: VisionAnalysis): VisionAnalysis {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const payload = value as Partial<VisionAnalysis>;

  return createVisionAnalysis({
    age_band: payload.age_band ?? fallback.age_band,
    analysis_confidence: payload.analysis_confidence ?? fallback.analysis_confidence,
    avoid_notes: payload.avoid_notes ?? fallback.avoid_notes,
    demographic: payload.demographic ?? fallback.demographic,
    detected_face_shape: payload.detected_face_shape ?? fallback.detected_face_shape,
    grooming_strategy: payload.grooming_strategy ?? fallback.grooming_strategy,
    outfit_strategy: payload.outfit_strategy ?? fallback.outfit_strategy,
    primary_color_undertone: payload.primary_color_undertone ?? fallback.primary_color_undertone,
    recommended_color_palette:
      payload.recommended_color_palette ?? fallback.recommended_color_palette,
    suggested_fit_profile: payload.suggested_fit_profile ?? fallback.suggested_fit_profile,
    visible_cues: payload.visible_cues ?? fallback.visible_cues
  });
}
