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
export type VisionBuildAndProportion = "broad_athletic" | "lean_tapered" | "relaxed";
export type VisionGroomingState = "clean_shaven" | "stubble_heavy_stubble" | "full_beard";
export type VisionHairstyleVolume = "low" | "medium" | "high";
export type VisionLightingQuality = "optimal" | "suboptimal";

export type VisionProfile = {
  age_band: VisionAgeBand;
  demographic: VisionDemographic;
  detected_face_shape: Exclude<FaceShape, "heart">;
  primary_color_undertone: VisionUndertone;
  suggested_fit_profile: VisionFitProfile;
  recommended_color_palette: [string, string, string];
};

export type VisionAnalysis = VisionProfile & {
  analysis_confidence: number;
  avoid_notes: string[];
  build_and_proportion: VisionBuildAndProportion;
  dominant_color: string;
  extracted_palette: [string, string, string];
  grooming_state: VisionGroomingState;
  grooming_strategy: string;
  hairstyle_volume: VisionHairstyleVolume;
  lighting_quality: VisionLightingQuality;
  outfit_strategy: string;
  visible_cues: string[];
};

export const VISION_IMAGE_ANALYZER_SYSTEM_PROMPT = `You are the core computer vision engine for a premium fashion and grooming platform. Act like a master tailor, color analyst, and grooming expert. Analyze the uploaded user image and return a strict, minified JSON object. Do not include any markdown formatting, code blocks, or conversational text. Only return the JSON object.

Analyze and extract these exact keys:

demographic: Value must strictly be one of "menswear", "womenswear", or "unisex". Classify the requested wardrobe presentation, not biological sex or identity. If the person/photo presentation is clearly womenswear or feminine styling, return "womenswear". If clearly menswear or masculine styling, return "menswear". If uncertain, cropped, ambiguous, or gender-neutral, return "unisex". Do not default to "menswear".

age_band: Choose exactly one broad styling band from: ["young_adult", "adult", "mature"]. Do not estimate exact age. Use this only as a fashion styling band based on visual presentation; if uncertain, return "adult".

detected_face_shape: Choose exactly one from: ["oval", "square", "round", "diamond", "oblong", "rectangle"]. Base this on jawline, cheekbones, and facial proportions. Use "oblong" for long face structures and "rectangle" for squared long structures.

grooming_state: Choose exactly one from: ["clean_shaven", "stubble_heavy_stubble", "full_beard"]. Use visible facial-hair density only.

hairstyle_volume: Choose exactly one from: ["low", "medium", "high"]. Use visible hair height and side volume.

build_and_proportion: Choose exactly one from: ["broad_athletic", "lean_tapered", "relaxed"]. Use shoulder width, torso balance, and garment drape, not identity.

primary_color_undertone: Analyze the user's skin, hair, and existing clothing tones. Classify as "warm", "cool", or "neutral". If client-side swatches are provided in the fallback profile, cross-check against dominant_color and extracted_palette before deciding.

suggested_fit_profile: Based on their physical frame, determine if they look best in "relaxed", "oversized", "straight", or "slim" garments.

Body proportion note: If the application supplies a separate Body Architecture selector, treat that selector as a hard styling context. Do not recommend overly cropped tops or ultra-slim trousers for broad/athletic frames; prioritize texture and layering for lean frames; prioritize soft structure and clean drape for relaxed frames.

recommended_color_palette: Provide an array of 3 hex color codes that would look exceptionally flattering on them based on their undertone.

dominant_color: One exact hex code for the dominant visible outfit color. If client-side swatches are provided, use the closest swatch from fallback.dominant_color.

extracted_palette: Array of exactly 3 hex color codes from the visible uploaded image. If client-side swatches are provided, preserve fallback.extracted_palette unless the image clearly contradicts it.

lighting_quality: Choose exactly one from ["optimal","suboptimal"]. If fallback.lighting_quality is "suboptimal", do not trust hex colors too literally; allow tolerance for shadows, glare, or warm indoor lighting.

analysis_confidence: Number from 0 to 100 based on image clarity, visible face, visible clothing, and lighting. Use lower confidence when the image is blurry, cropped, dark, or face/body cues are unclear.

If the uploaded image is not a usable personal styling photo, such as a product-only image, scenery, document, screenshot, empty frame, or a photo without a clear person/profile, do not invent a profile. Set demographic to "unisex", set analysis_confidence to 20, use safe fallback values for required fields, set visible_cues to ["wrong image for stylist","no clear person detected","upload portrait or full-body photo"], and explain in outfit_strategy that the image is not suitable for a personal styling scan.

visible_cues: Array of 3 short non-sensitive visual cues that explain the analysis, such as "clear jawline", "warm clothing tones", or "upper body only". Do not mention exact age, identity, ethnicity, or private attributes.

outfit_strategy: One concise sentence explaining the best outfit direction based on wardrobe profile, undertone, fit, and selected visual proportions.

grooming_strategy: One concise sentence explaining the haircut/beard direction based on detected face shape. If womenswear, make this a hair styling direction and do not force beard advice.

avoid_notes: Array of 2 concise notes about what to avoid, based on fit, color, or context mismatch.

Example JSON Output:
{"demographic":"womenswear","age_band":"adult","detected_face_shape":"oval","grooming_state":"clean_shaven","hairstyle_volume":"medium","build_and_proportion":"relaxed","primary_color_undertone":"warm","suggested_fit_profile":"relaxed","dominant_color":"#6B705C","extracted_palette":["#6B705C","#D8C3A5","#1A1A1A"],"lighting_quality":"optimal","recommended_color_palette":["#1A1A1A","#4F5D4E","#D8C3A5"],"analysis_confidence":82,"visible_cues":["clear face outline","warm skin and clothing tones","relaxed shoulder line"],"outfit_strategy":"Use relaxed warm neutrals with structured texture so the outfit looks polished without becoming stiff.","grooming_strategy":"Oval face shape can support soft layers or clean face-framing hair with balanced volume.","avoid_notes":["Avoid very cold neon colors near the face.","Avoid overly tight fits when relaxed structure is the better proportion."]}`;

export const visionAgeBands = ["young_adult", "adult", "mature"] as const satisfies readonly VisionAgeBand[];
export const visionDemographics = ["menswear", "womenswear", "unisex"] as const satisfies readonly VisionDemographic[];
export const visionFaceShapes = ["oval", "square", "round", "rectangle", "diamond", "oblong"] as const satisfies readonly VisionProfile["detected_face_shape"][];
export const visionUndertones = ["warm", "cool", "neutral"] as const satisfies readonly VisionUndertone[];
export const visionFitProfiles = ["relaxed", "oversized", "straight", "slim"] as const satisfies readonly VisionFitProfile[];
export const visionBuildAndProportions = ["broad_athletic", "lean_tapered", "relaxed"] as const satisfies readonly VisionBuildAndProportion[];
export const visionGroomingStates = ["clean_shaven", "stubble_heavy_stubble", "full_beard"] as const satisfies readonly VisionGroomingState[];
export const visionHairstyleVolumes = ["low", "medium", "high"] as const satisfies readonly VisionHairstyleVolume[];
export const visionLightingQualities = ["optimal", "suboptimal"] as const satisfies readonly VisionLightingQuality[];

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

function isVisionBuildAndProportion(value: unknown): value is VisionBuildAndProportion {
  return typeof value === "string" && visionBuildAndProportions.includes(value as VisionBuildAndProportion);
}

function isVisionGroomingState(value: unknown): value is VisionGroomingState {
  return typeof value === "string" && visionGroomingStates.includes(value as VisionGroomingState);
}

function isVisionHairstyleVolume(value: unknown): value is VisionHairstyleVolume {
  return typeof value === "string" && visionHairstyleVolumes.includes(value as VisionHairstyleVolume);
}

function isVisionLightingQuality(value: unknown): value is VisionLightingQuality {
  return typeof value === "string" && visionLightingQualities.includes(value as VisionLightingQuality);
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

function normalizeHexColor(value: unknown, fallback: string) {
  return isHexColor(value) ? value.toUpperCase() : fallback;
}

function normalizeUndertone(value: unknown): VisionUndertone | null {
  if (isVisionUndertone(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toLowerCase();

  if (normalized.includes("warm") || normalized.includes("golden")) {
    return "warm";
  }

  if (normalized.includes("cool") || normalized.includes("pink")) {
    return "cool";
  }

  if (normalized.includes("neutral") || normalized.includes("olive")) {
    return "neutral";
  }

  return null;
}

function normalizeBuildAndProportion(value: unknown, suggestedFitProfile: VisionFitProfile): VisionBuildAndProportion {
  if (isVisionBuildAndProportion(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (normalized.includes("broad") || normalized.includes("athletic")) {
      return "broad_athletic";
    }

    if (normalized.includes("lean") || normalized.includes("taper")) {
      return "lean_tapered";
    }

    if (normalized.includes("relaxed") || normalized.includes("soft")) {
      return "relaxed";
    }
  }

  if (suggestedFitProfile === "slim" || suggestedFitProfile === "straight") {
    return "lean_tapered";
  }

  if (suggestedFitProfile === "oversized") {
    return "relaxed";
  }

  return "broad_athletic";
}

function normalizeGroomingState(value: unknown, demographic: VisionDemographic): VisionGroomingState {
  if (isVisionGroomingState(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (normalized.includes("full") && normalized.includes("beard")) {
      return "full_beard";
    }

    if (normalized.includes("stubble") || normalized.includes("heavy")) {
      return "stubble_heavy_stubble";
    }

    if (normalized.includes("clean")) {
      return "clean_shaven";
    }
  }

  return demographic === "womenswear" ? "clean_shaven" : "stubble_heavy_stubble";
}

function normalizeHairstyleVolume(value: unknown, fallback: VisionHairstyleVolume = "medium"): VisionHairstyleVolume {
  if (isVisionHairstyleVolume(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (normalized.includes("high") || normalized.includes("volume")) {
      return "high";
    }

    if (normalized.includes("low") || normalized.includes("short")) {
      return "low";
    }

    if (normalized.includes("medium")) {
      return "medium";
    }
  }

  return fallback;
}

function normalizeLightingQuality(value: unknown): VisionLightingQuality {
  if (isVisionLightingQuality(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (normalized.includes("suboptimal") || normalized.includes("dark") || normalized.includes("glare")) {
      return "suboptimal";
    }

    if (normalized.includes("optimal") || normalized.includes("good")) {
      return "optimal";
    }
  }

  return "optimal";
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

  if (isFaceShape(value) && value !== "heart") {
    return value;
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
  skinUndertone?: unknown;
  suggested_fit_profile?: unknown;
}): VisionProfile {
  const age_band = isVisionAgeBand(input.age_band)
    ? input.age_band
    : isVisionAgeBand(input.ageBand)
      ? input.ageBand
      : "adult";
  const demographic = isVisionDemographic(input.demographic) ? input.demographic : "menswear";
  const primary_color_undertone =
    normalizeUndertone(input.primary_color_undertone) ??
    normalizeUndertone(input.skinUndertone) ??
    normalizeUndertone(input.profileId) ??
    "neutral";
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

function getDefaultExtractedPalette(profile: VisionProfile): [string, string, string] {
  return profile.recommended_color_palette;
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
  build_and_proportion?: unknown;
  buildAndProportion?: unknown;
  dominant_color?: unknown;
  dominantColor?: unknown;
  extracted_palette?: unknown;
  grooming_state?: unknown;
  groomingState?: unknown;
  grooming_strategy?: unknown;
  hairstyle_volume?: unknown;
  hairstyleVolume?: unknown;
  lighting_quality?: unknown;
  lightingQuality?: unknown;
  outfit_strategy?: unknown;
  palette?: unknown;
  visible_cues?: unknown;
}): VisionAnalysis {
  const profile = createVisionProfile(input);
  const extracted_palette = normalizePalette(
    input.extracted_palette ?? input.palette,
    profile.primary_color_undertone
  );

  return {
    ...profile,
    analysis_confidence: normalizeConfidence(input.analysis_confidence),
    avoid_notes: normalizeStringArray(input.avoid_notes, getDefaultAvoidNotes(profile), 2),
    build_and_proportion: normalizeBuildAndProportion(
      input.build_and_proportion ?? input.buildAndProportion,
      profile.suggested_fit_profile
    ),
    dominant_color: normalizeHexColor(
      input.dominant_color ?? input.dominantColor,
      extracted_palette[0] ?? getDefaultExtractedPalette(profile)[0]
    ),
    extracted_palette,
    grooming_state: normalizeGroomingState(
      input.grooming_state ?? input.groomingState,
      profile.demographic
    ),
    grooming_strategy: normalizeText(
      input.grooming_strategy,
      getDefaultGroomingStrategy(profile)
    ),
    hairstyle_volume: normalizeHairstyleVolume(input.hairstyle_volume ?? input.hairstyleVolume),
    lighting_quality: normalizeLightingQuality(input.lighting_quality ?? input.lightingQuality),
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
    detected_face_shape:
      payload.detected_face_shape ??
      (payload as { faceShape?: unknown }).faceShape ??
      fallback.detected_face_shape,
    primary_color_undertone:
      payload.primary_color_undertone ??
      (payload as { skinUndertone?: unknown }).skinUndertone ??
      fallback.primary_color_undertone,
    recommended_color_palette:
      payload.recommended_color_palette ??
      (payload as { palette?: unknown }).palette ??
      fallback.recommended_color_palette,
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
    build_and_proportion:
      payload.build_and_proportion ??
      (payload as { buildAndProportion?: unknown }).buildAndProportion ??
      fallback.build_and_proportion,
    demographic: payload.demographic ?? fallback.demographic,
    detected_face_shape:
      payload.detected_face_shape ??
      (payload as { faceShape?: unknown }).faceShape ??
      fallback.detected_face_shape,
    dominant_color:
      payload.dominant_color ??
      (payload as { dominantColor?: unknown }).dominantColor ??
      fallback.dominant_color,
    extracted_palette:
      payload.extracted_palette ??
      (payload as { palette?: unknown }).palette ??
      fallback.extracted_palette,
    grooming_state:
      payload.grooming_state ??
      (payload as { groomingState?: unknown }).groomingState ??
      fallback.grooming_state,
    grooming_strategy: payload.grooming_strategy ?? fallback.grooming_strategy,
    hairstyle_volume:
      payload.hairstyle_volume ??
      (payload as { hairstyleVolume?: unknown }).hairstyleVolume ??
      fallback.hairstyle_volume,
    lighting_quality:
      payload.lighting_quality ??
      (payload as { lightingQuality?: unknown }).lightingQuality ??
      fallback.lighting_quality,
    outfit_strategy: payload.outfit_strategy ?? fallback.outfit_strategy,
    primary_color_undertone:
      payload.primary_color_undertone ??
      (payload as { skinUndertone?: unknown }).skinUndertone ??
      fallback.primary_color_undertone,
    recommended_color_palette:
      payload.recommended_color_palette ?? fallback.recommended_color_palette,
    suggested_fit_profile: payload.suggested_fit_profile ?? fallback.suggested_fit_profile,
    visible_cues: payload.visible_cues ?? fallback.visible_cues
  });
}
