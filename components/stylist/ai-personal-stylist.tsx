"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bookmark,
  Copy,
  Download,
  MapPin,
  RotateCcw,
  Shuffle,
  Sparkles,
  Upload,
  Wand2,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  classifyClimate,
  formatClimateSummary,
  getClimateDirective,
  getSeasonFromClimate,
  type ClimateContext
} from "@/lib/climate";
import { analyzeStylistPhoto } from "@/lib/photo-analysis";
import {
  budgetTierLabels,
  defaultStylistPreferences,
  fitPreferenceLabels,
  normalizeStylistPreferences,
  type BudgetTier,
  type FitPreference,
  type StylistPreferences
} from "@/lib/stylist-preferences";
import {
  bodyArchitectureLabels,
  getStyleProfile,
  type AdviceMode,
  type BodyArchitecture,
  type GroomingRecommendation,
  type GroomingRecommendationSet,
  type OutfitRecommendation,
  type StyleProfileId
} from "@/lib/stylist";
import {
  readStyleVault,
  removeStyleVaultItem,
  upsertStyleVaultItem,
  type StyleVaultItem
} from "@/lib/style-vault";
import type { Demographic, FaceShape, Garment, StylingOccasion, StylingSeason } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  type VisionAnalysis,
  type VisionDemographic
} from "@/lib/vision";

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getBrowserPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 1000 * 60 * 15,
      timeout: 8000
    });
  });
}

function locationLabelFromTimezone(timezone?: string) {
  const browserTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const city = browserTimezone.split("/").at(-1)?.replace(/_/g, " ");

  return city || "Local weather";
}

async function fetchClimateContext(): Promise<ClimateContext> {
  const position = await getBrowserPosition();
  const { latitude, longitude } = position.coords;
  const params = new URLSearchParams({
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,snowfall,weather_code",
    latitude: String(latitude),
    longitude: String(longitude),
    timezone: "auto"
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Weather service did not return a usable response.");
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const current = data.current;
  const temperatureC = current?.temperature_2m;

  if (typeof temperatureC !== "number") {
    throw new Error("Weather response did not include temperature.");
  }

  const climate: ClimateContext = {
    apparentTemperatureC: current?.apparent_temperature ?? null,
    condition: classifyClimate({
      precipitationMm: current?.precipitation ?? null,
      rainMm: current?.rain ?? null,
      snowfallCm: current?.snowfall ?? null,
      temperatureC,
      weatherCode: current?.weather_code ?? null
    }),
    humidity: current?.relative_humidity_2m ?? null,
    locationLabel: locationLabelFromTimezone(data.timezone),
    precipitationMm: current?.precipitation ?? null,
    rainMm: current?.rain ?? null,
    snowfallCm: current?.snowfall ?? null,
    summary: "",
    temperatureC,
    updatedAt: current?.time ?? new Date().toISOString(),
    weatherCode: current?.weather_code ?? null
  };

  return {
    ...climate,
    summary: formatClimateSummary(climate)
  };
}

function readStoredStylistPreferences() {
  try {
    return normalizeStylistPreferences(
      window.localStorage.getItem(STYLIST_PREFERENCES_STORAGE_KEY)
        ? JSON.parse(window.localStorage.getItem(STYLIST_PREFERENCES_STORAGE_KEY) ?? "{}")
        : defaultStylistPreferences
    );
  } catch (error) {
    console.error(error);
    return defaultStylistPreferences;
  }
}

const demographicLabels: Record<Demographic, string> = {
  menswear: "Menswear",
  womenswear: "Womenswear",
  unisex: "Unisex"
};

const occasionOptions: { label: string; value: StylingOccasion }[] = [
  { label: "Mall / Street", value: "mall" },
  { label: "Beach / Vacation", value: "beach" },
  { label: "Gym / Athletic", value: "gym" },
  { label: "Formal / Office", value: "formal" }
];

const seasonOptions: { label: string; value: StylingSeason }[] = [
  { label: "Summer", value: "summer" },
  { label: "Winter", value: "winter" },
  { label: "All-Season", value: "all-season" }
];

const scanStatusTexts = [
  "Reading facial geometry...",
  "Extracting color palette...",
  "Mapping proportions...",
  "Matching archive..."
];

const STYLIST_PREFERENCES_STORAGE_KEY = "personal-stylist-preferences-v1";

const fitPreferenceOptions: { label: string; value: FitPreference }[] = [
  { label: fitPreferenceLabels.tailored_slim, value: "tailored_slim" },
  { label: fitPreferenceLabels.relaxed_straight, value: "relaxed_straight" },
  { label: fitPreferenceLabels.boxy_oversized, value: "boxy_oversized" }
];

const budgetTierOptions: { label: string; value: BudgetTier }[] = [
  { label: budgetTierLabels.fast_fashion, value: "fast_fashion" },
  { label: budgetTierLabels.premium_basics, value: "premium_basics" },
  { label: budgetTierLabels.archive_designer, value: "archive_designer" }
];

const wardrobeProfileOptions: { label: string; value: VisionDemographic }[] = [
  { label: "Men", value: "menswear" },
  { label: "Women", value: "womenswear" },
  { label: "Unisex", value: "unisex" }
];

type RecommendationResponse = {
  adviceMode: AdviceMode;
  bodyArchitecture: BodyArchitecture;
  climateContext?: ClimateContext | null;
  contextWarning?: string;
  demographic: VisionDemographic;
  faceShape: FaceShape;
  grooming: GroomingRecommendationSet;
  occasion: StylingOccasion;
  preferences?: StylistPreferences;
  recommendations: OutfitRecommendation[];
  season: StylingSeason;
  visionData: VisionAnalysis;
};

type OpenMeteoResponse = {
  current?: {
    apparent_temperature?: number;
    precipitation?: number;
    rain?: number;
    relative_humidity_2m?: number;
    snowfall?: number;
    temperature_2m?: number;
    time?: string;
    weather_code?: number;
  };
  timezone?: string;
};

type PhotoAnalysisResponse = {
  enabled: boolean;
  error?: string;
  model: string | null;
  source: "browser-fallback" | "ollama";
  visionData: VisionAnalysis;
};

type PhotoFeedback = {
  message: string;
  title: string;
  tone: "error" | "positive" | "warning";
};

type ShuffleResponse = {
  error?: string;
  garment?: Garment;
};

type OutfitGridPiece = {
  accentColor: string;
  garment?: Garment;
  id: string;
  imageUrl?: string;
  meta: string;
  role: "Top / Layer" | "Bottom" | "Footwear";
  title: string;
};

type ThreePieceOutfit = {
  id: string;
  pieces: OutfitGridPiece[];
  recommendation: OutfitRecommendation;
  summary: string;
  title: string;
};

const ANALYSIS_REFINE_TIMEOUT_MS = 8000;

function isSupportedImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i.test(file.name);
}

function hasWrongImageSignal(profile: VisionAnalysis) {
  return (
    profile.analysis_confidence < 34 ||
    profile.visible_cues.some((cue) => /wrong image|no clear person|not suitable/i.test(cue))
  );
}

function pickFeedbackCopy(profile: VisionAnalysis, options: PhotoFeedback[]) {
  const seed = [
    profile.demographic,
    profile.detected_face_shape,
    profile.primary_color_undertone,
    profile.suggested_fit_profile,
    profile.analysis_confidence,
    ...profile.visible_cues
  ].join("|");
  const index = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0) % options.length;

  return options[index];
}

function pickFileFeedbackCopy(file: File, options: PhotoFeedback[]) {
  const seed = `${file.name}|${file.size}|${file.lastModified}`;
  const index = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0) % options.length;

  return options[index];
}

function getUploadReadyFeedback(file: File): PhotoFeedback {
  return pickFileFeedbackCopy(file, [
    {
      message: "Photo is ready. Choose Men, Women, or Unisex and I will start the style read.",
      title: "Ready for the style read",
      tone: "positive"
    },
    {
      message: "Nice upload. One clear photo is enough to start building a cleaner personal look.",
      title: "Good frame selected",
      tone: "positive"
    },
    {
      message: "Looks ready. I will keep the result simple, flattering, and matched to your photo.",
      title: "Style check prepared",
      tone: "positive"
    },
    {
      message: "Photo received. The styling engine is ready to turn this into a complete outfit direction.",
      title: "Ready to style you",
      tone: "positive"
    }
  ]);
}

function getPhotoFeedback(profile: VisionAnalysis): PhotoFeedback {
  if (hasWrongImageSignal(profile)) {
    return pickFeedbackCopy(profile, [
      {
        message:
          "This does not look like a usable styling photo. Upload a clear portrait or full-body outfit image.",
        title: "Wrong image for Stylist",
        tone: "error"
      },
      {
        message:
          "The stylist cannot read face, fit, or clothing cues here. Try a brighter photo with the person centered.",
        title: "Profile not visible",
        tone: "error"
      },
      {
        message:
          "This looks like the wrong upload for personal styling. Use a selfie, portrait, or full-body outfit shot.",
        title: "Need a person photo",
        tone: "error"
      },
      {
        message:
          "The image is too unclear for accurate styling. Upload one where the face and outfit are both visible.",
        title: "Scan needs a clearer photo",
        tone: "error"
      }
    ]);
  }

  if (
    profile.analysis_confidence < 56 ||
    profile.visible_cues.some((cue) => /limited face|cropped upper/i.test(cue))
  ) {
    return pickFeedbackCopy(profile, [
      {
        message:
          "The scan worked, but a brighter full-body photo will improve color, fit, and grooming accuracy.",
        title: "Readable, but could be sharper",
        tone: "warning"
      },
      {
        message:
          "Good start. For a stronger recommendation, use a photo with more outfit detail and clearer face lighting.",
        title: "More detail will help",
        tone: "warning"
      },
      {
        message:
          "The stylist found enough cues to continue, but a less cropped photo will make the result more accurate.",
        title: "Partial profile detected",
        tone: "warning"
      },
      {
        message:
          "The image is usable. Better lighting will make the undertone and grooming match more precise.",
        title: "Scan quality is moderate",
        tone: "warning"
      }
    ]);
  }

  const visibleCueText = profile.visible_cues.join(" ").toLowerCase();
  const hasClearFace = visibleCueText.includes("face outline");
  const hasFullerBody = visibleCueText.includes("fuller body");
  const hasOptimalLighting = profile.lighting_quality === "optimal";
  const colorDirection = profile.primary_color_undertone;
  const wardrobeProfile = demographicLabels[profile.demographic];
  const faceShape = titleCase(profile.detected_face_shape);
  const fitDirection = titleCase(profile.suggested_fit_profile);
  const positiveFeedback: PhotoFeedback[] = [
    {
      message: `Looking impressive. The scan can read your ${colorDirection} color direction, ${fitDirection.toLowerCase()} fit, and ${wardrobeProfile} wardrobe profile clearly.`,
      title: "Strong first impression",
      tone: "positive"
    },
    {
      message: `This has a confident presence. Your ${faceShape.toLowerCase()} face structure and color palette give the outfit engine a strong base to work from.`,
      title: "Confident profile read",
      tone: "positive"
    },
    {
      message: "Nice shot. The visible tones and proportions make it easier to suggest clothes that feel natural, not forced.",
      title: "Style cues are clear",
      tone: "positive"
    },
    {
      message: "Your photo has a clean style energy. A few sharper outfit choices can make the whole look feel even more premium.",
      title: "Premium direction found",
      tone: "positive"
    },
    {
      message: "Good presence in the frame. The scan has enough detail to build a polished look around your natural coloring and fit direction.",
      title: "Ready to style",
      tone: "positive"
    }
  ];

  if (hasClearFace) {
    positiveFeedback.push(
      {
        message: "Your expression brings warmth to the frame. That approachable energy makes the outfit recommendation feel more personal.",
        title: "Warm profile energy",
        tone: "positive"
      },
      {
        message: "Clear face read. A good smile or relaxed expression can make even simple styling feel memorable.",
        title: "Great camera presence",
        tone: "positive"
      }
    );
  }

  if (hasFullerBody) {
    positiveFeedback.push({
      message: `Strong outfit visibility. The ${fitDirection.toLowerCase()} line is readable, so I can tune the clothes to your real proportions.`,
      title: "Fuller fit read",
      tone: "positive"
    });
  }

  if (hasOptimalLighting) {
    positiveFeedback.push({
      message: "Great lighting. Your colors are coming through cleanly, so the palette match should be more accurate.",
      title: "Clean color read",
      tone: "positive"
    });
  }

  return pickFeedbackCopy(profile, positiveFeedback);
}

function applyWardrobeProfileOverride(
  profile: VisionAnalysis,
  wardrobeProfile: VisionDemographic
): VisionAnalysis {
  if (profile.demographic === wardrobeProfile) {
    return profile;
  }

  const wardrobeCue = `${wardrobeProfile} wardrobe selected`;

  return {
    ...profile,
    avoid_notes: [
      `Keep recommendations inside the ${wardrobeProfile} wardrobe selection plus compatible basics only.`,
      ...profile.avoid_notes.filter((note) => !/menswear|womenswear|unisex|wardrobe/i.test(note))
    ].slice(0, 2),
    demographic: wardrobeProfile,
    grooming_state: wardrobeProfile === "womenswear" ? "clean_shaven" : profile.grooming_state,
    grooming_strategy:
      wardrobeProfile === "womenswear"
        ? `${profile.detected_face_shape} face structure works best with balanced face-framing hair and controlled volume.`
        : profile.grooming_strategy,
    outfit_strategy: `Prioritize ${profile.suggested_fit_profile} ${wardrobeProfile} pieces that match the detected photo palette ${profile.extracted_palette.join(", ")}.`,
    visible_cues: [
      wardrobeCue,
      ...profile.visible_cues.filter((cue) => !/menswear|womenswear|unisex|wardrobe/i.test(cue))
    ].slice(0, 3)
  };
}

function inferBodyArchitecture(profile: VisionAnalysis): BodyArchitecture {
  if (profile.build_and_proportion === "lean_tapered") {
    return "lean_slim";
  }

  if (profile.build_and_proportion === "relaxed") {
    return "curvy_relaxed";
  }

  return profile.suggested_fit_profile === "oversized" ? "tall_broad" : "athletic_tapered";
}

function getGeometryDescriptor(faceShape: FaceShape | null) {
  if (!faceShape) {
    return "Balanced";
  }

  if (faceShape === "square" || faceShape === "diamond" || faceShape === "rectangle") {
    return "Angular";
  }

  if (faceShape === "round") {
    return "Soft / Rounded";
  }

  if (faceShape === "oblong") {
    return "Long / Vertical";
  }

  return "Balanced";
}

function getHairstyleBreakdown(card: GroomingRecommendation | null, profile: VisionAnalysis | null) {
  if (!card) {
    return "No hairstyle match is available for this scan yet.";
  }

  const faceShape = profile?.detected_face_shape ?? card.matchedFaceShape;
  const volume = profile?.hairstyle_volume ?? "medium";

  if (faceShape === "round") {
    return `Controlled ${volume} volume on top adds vertical lift, while tighter sides prevent extra width around the temples.`;
  }

  if (faceShape === "square" || faceShape === "diamond") {
    return `Textured movement softens the strongest angles while keeping the side profile clean and intentional.`;
  }

  if (faceShape === "oblong" || faceShape === "rectangle") {
    return `Balanced top length avoids making the profile look longer, while tapering keeps the outline polished.`;
  }

  return `Balanced volume works with the natural outline, keeping the haircut flexible without distorting the face shape.`;
}

function getBeardBreakdown(card: GroomingRecommendation | null, profile: VisionAnalysis | null) {
  if (!card) {
    return "No beard match is available for this scan.";
  }

  const faceShape = profile?.detected_face_shape ?? card.matchedFaceShape;

  if (faceShape === "round") {
    return "A cleaner cheek line and tighter sideburn blend create more jaw definition without adding cheek width.";
  }

  if (faceShape === "square" || faceShape === "diamond") {
    return "A controlled cheek line keeps the natural angles sharp while the neckline prevents the beard from looking heavy.";
  }

  if (faceShape === "oblong" || faceShape === "rectangle") {
    return "Moderate beard length adds structure at the chin while avoiding too much vertical extension.";
  }

  return "A balanced beard outline frames the jaw while keeping the face shape proportional.";
}

function getHairBarberSpecs(card: GroomingRecommendation | null) {
  if (!card) {
    return "Hair: keep top balanced with light texture; clean taper around sides and neckline.";
  }

  const title = card.title.toLowerCase();

  if (title.includes("crop")) {
    return "Hair: 1.5-2.5 inches choppy texture on top; low skin fade from #0/#0.5 into #2; matte clay or styling powder.";
  }

  if (title.includes("burr") || title.includes("buzz")) {
    return "Hair: #3 or #4 guard on top; temple taper from #0.5 to #2; soft lineup; lightweight scalp moisturizer.";
  }

  if (title.includes("flow") || title.includes("shag")) {
    return "Hair: 3-5 inches layered scissor cut; keep sides natural; remove bulk around ears; sea salt spray or light cream.";
  }

  return `Hair: ask for ${card.title}; keep texture natural, sides clean, and avoid high-shine gel.`;
}

function getBeardBarberSpecs(card: GroomingRecommendation | null) {
  if (!card) {
    return "Beard: keep cheek line natural; clean neckline; blend sideburns softly.";
  }

  const title = card.title.toLowerCase();

  if (title.includes("fade")) {
    return "Beard: blend sideburns from #0.5 into 3-6mm beard; square cheek line lightly; clean neckline one finger above Adam's apple.";
  }

  if (title.includes("boxed")) {
    return "Beard: 4-8mm short boxed shape; lower cheek line slightly; crisp neck cleanup; finish with beard oil.";
  }

  if (title.includes("beardstache")) {
    return "Beard: keep moustache heavier at 8-12mm; cheeks at 2-3mm stubble; define lip line with moustache wax.";
  }

  return `Beard: ask for ${card.title}; keep cheek and neck lines clean with natural density through the jaw.`;
}

function loadLookcardImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to render uploaded photo."));
    image.src = src;
  });
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Could not export lookcard."));
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 250);
}

function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
) {
  if (context.measureText(text).width <= maxWidth) {
    context.fillText(text, x, y);
    return;
  }

  let nextText = text;

  while (nextText.length > 0 && context.measureText(`${nextText}...`).width > maxWidth) {
    nextText = nextText.slice(0, -1);
  }

  context.fillText(`${nextText}...`, x, y);
}

function supportPieceForRole(
  supportPieces: string[],
  role: OutfitGridPiece["role"],
  usedPieces: Set<string>
) {
  const matchers: Record<OutfitGridPiece["role"], RegExp> = {
    "Bottom": /denim|jean|pant|short|skirt|trouser|wide-leg/i,
    "Footwear": /boot|loafer|sandal|shoe|sneaker|trainer/i,
    "Top / Layer": /blazer|hoodie|jacket|knit|layer|overshirt|polo|shirt|tank|tee/i
  };
  const matchingPiece = supportPieces.find(
    (piece) => !usedPieces.has(piece) && matchers[role].test(piece)
  );

  if (matchingPiece) {
    usedPieces.add(matchingPiece);
    return matchingPiece;
  }

  const fallbackByRole: Record<OutfitGridPiece["role"], string> = {
    "Bottom": "clean straight-leg bottom",
    "Footwear": "low-profile everyday shoe",
    "Top / Layer": "light structured top layer"
  };

  return fallbackByRole[role];
}

function supportGarmentForRole(
  supportGarments: Garment[] | undefined,
  role: OutfitGridPiece["role"],
  usedGarmentIds: Set<string>
) {
  const match = supportGarments?.find((garment) => {
    return !usedGarmentIds.has(garment.id) && roleForGarment(garment.category) === role;
  });

  if (match) {
    usedGarmentIds.add(match.id);
  }

  return match;
}

function roleForGarment(category: OutfitRecommendation["garment"]["category"]): OutfitGridPiece["role"] {
  if (category === "bottoms" || category === "skirts") {
    return "Bottom";
  }

  if (category === "footwear") {
    return "Footwear";
  }

  return "Top / Layer";
}

function buildThreePieceOutfit(
  recommendation: OutfitRecommendation,
  index: number,
  palette: string[],
  occasionLabel: string,
  seasonLabel: string
): ThreePieceOutfit {
  const roles: OutfitGridPiece["role"][] = ["Top / Layer", "Bottom", "Footwear"];
  const usedPieces = new Set<string>();
  const usedGarmentIds = new Set([recommendation.garment.id]);
  const primaryRole = roleForGarment(recommendation.garment.category);
  const pieces = roles.map((role, roleIndex): OutfitGridPiece => {
    if (role === primaryRole) {
      return {
        accentColor: palette[roleIndex % palette.length] ?? "#D8CCBB",
        garment: recommendation.garment,
        id: `${recommendation.id}-${role}`,
        imageUrl: recommendation.garment.image_url,
        meta: `${recommendation.garment.year} · ${titleCase(recommendation.garment.fit_profile)}`,
        role,
        title: recommendation.title
      };
    }

    const supportGarment = supportGarmentForRole(
      recommendation.supportGarments,
      role,
      usedGarmentIds
    );

    if (supportGarment) {
      return {
        accentColor: supportGarment.color_palette[0] ?? palette[roleIndex % palette.length] ?? "#D8CCBB",
        garment: supportGarment,
        id: `${recommendation.id}-${role}-${supportGarment.id}`,
        imageUrl: supportGarment.image_url,
        meta: `${supportGarment.year} · ${titleCase(supportGarment.fit_profile)}`,
        role,
        title: supportGarment.title
      };
    }

    const supportPiece = supportPieceForRole(recommendation.supportPieces, role, usedPieces);

    return {
      accentColor: palette[roleIndex % palette.length] ?? "#D8CCBB",
      id: `${recommendation.id}-${role}`,
      meta: "Styling support",
      role,
      title: supportPiece
    };
  });

  return {
    id: recommendation.id,
    pieces,
    recommendation,
    summary: `The ${recommendation.garment.fit_profile} anchor piece works with balanced bottoms and clean footwear for ${occasionLabel.toLowerCase()} in ${seasonLabel.toLowerCase()}.`,
    title: `Look ${index + 1}`
  };
}

function OutfitPieceVisual({ piece }: { piece: OutfitGridPiece }) {
  const [hasImageError, setHasImageError] = useState(!piece.imageUrl);

  if (piece.imageUrl && !hasImageError) {
    return (
      <img
        src={piece.imageUrl}
        alt={piece.title}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        onError={() => setHasImageError(true)}
      />
    );
  }

  return (
    <div
      className="flex h-full w-full items-end p-4"
      style={{
        background: `linear-gradient(135deg, ${piece.accentColor}, #F8F3EB)`
      }}
    >
      <span className="max-w-[14rem] text-lg font-light leading-tight text-white drop-shadow">
        {piece.title}
      </span>
    </div>
  );
}

export function AIPersonalStylist({
  archiveLookCount,
  isUsingSampleData
}: {
  archiveLookCount: number;
  isUsingSampleData: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [profileId, setProfileId] = useState<StyleProfileId>("neutral");
  const [selectedWardrobeProfile, setSelectedWardrobeProfile] =
    useState<VisionDemographic>("menswear");
  const [isWardrobePromptOpen, setIsWardrobePromptOpen] = useState(false);
  const [selectedAdviceMode, setSelectedAdviceMode] = useState<AdviceMode>("discover_new");
  const [selectedOccasion, setSelectedOccasion] = useState<StylingOccasion>("mall");
  const [selectedSeason, setSelectedSeason] = useState<StylingSeason>("all-season");
  const [selectedBodyArchitecture, setSelectedBodyArchitecture] =
    useState<BodyArchitecture>("athletic_tapered");
  const [stylistPreferences, setStylistPreferences] =
    useState<StylistPreferences>(defaultStylistPreferences);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [showAdvancedInput, setShowAdvancedInput] = useState(false);
  const [climateContext, setClimateContext] = useState<ClimateContext | null>(null);
  const [isSyncingClimate, setIsSyncingClimate] = useState(false);
  const [climateError, setClimateError] = useState("");
  const [detectedDemographic, setDetectedDemographic] = useState<VisionDemographic | null>(null);
  const [detectedFaceShape, setDetectedFaceShape] = useState<FaceShape | null>(null);
  const [visionProfile, setVisionProfile] = useState<VisionAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [contextWarning, setContextWarning] = useState("");
  const [grooming, setGrooming] = useState<GroomingRecommendationSet>({
    beard: null,
    hairstyle: null
  });
  const [recommendationError, setRecommendationError] = useState("");
  const [photoFeedback, setPhotoFeedback] = useState<PhotoFeedback | null>(null);
  const [isGroomingDrawerOpen, setIsGroomingDrawerOpen] = useState(false);
  const [barberCopyStatus, setBarberCopyStatus] = useState("");
  const [isExportingLookcard, setIsExportingLookcard] = useState(false);
  const [lookcardError, setLookcardError] = useState("");
  const [vaultIds, setVaultIds] = useState<Set<string>>(new Set());
  const [pieceOverrides, setPieceOverrides] = useState<
    Record<string, Partial<Record<OutfitGridPiece["role"], OutfitGridPiece>>>
  >({});
  const [shuffleHistory, setShuffleHistory] = useState<Record<string, string[]>>({});
  const [shuffleLoadingIds, setShuffleLoadingIds] = useState<Set<string>>(new Set());
  const [scanStatusIndex, setScanStatusIndex] = useState(0);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photoFileRef = useRef<File | null>(null);
  const scanRunRef = useRef(0);

  const profile = useMemo(() => getStyleProfile(profileId), [profileId]);
  const profilePalette = useMemo(
    () =>
      visionProfile?.recommended_color_palette ?? [
        profile.palette[0],
        profile.palette[1],
        profile.palette[2]
      ],
    [profile.palette, visionProfile?.recommended_color_palette]
  );
  const extractedPalette = visionProfile?.extracted_palette ?? profilePalette;
  const dominantColor = visionProfile?.dominant_color ?? extractedPalette[0];
  const groomingCards = useMemo<GroomingRecommendation[]>(() => {
    return [grooming.hairstyle, grooming.beard].filter(
      (card): card is GroomingRecommendation => Boolean(card)
    );
  }, [grooming]);
  const selectedOccasionLabel =
    occasionOptions.find((option) => option.value === selectedOccasion)?.label ??
    titleCase(selectedOccasion);
  const selectedSeasonLabel =
    seasonOptions.find((option) => option.value === selectedSeason)?.label ??
    titleCase(selectedSeason);
  const selectedBodyArchitectureLabel = bodyArchitectureLabels[selectedBodyArchitecture];
  const selectedFitPreferenceLabel = fitPreferenceLabels[stylistPreferences.fitPreference];
  const selectedBudgetTierLabel = budgetTierLabels[stylistPreferences.budgetTier];
  const selectedWardrobeProfileLabel =
    wardrobeProfileOptions.find((option) => option.value === selectedWardrobeProfile)?.label ??
    demographicLabels[selectedWardrobeProfile];
  const wardrobeProfileLabel = detectedDemographic
    ? demographicLabels[detectedDemographic]
    : "Unclassified";
  const faceShapeLabel = detectedFaceShape ? `${titleCase(detectedFaceShape)} face` : "Unclassified";
  const fitProfileLabel = visionProfile
    ? titleCase(visionProfile.suggested_fit_profile)
    : profile.fitType;
  const hairstyleBreakdown = getHairstyleBreakdown(grooming.hairstyle, visionProfile);
  const beardBreakdown = getBeardBreakdown(grooming.beard, visionProfile);
  const hairBarberSpecs = getHairBarberSpecs(grooming.hairstyle);
  const beardBarberSpecs = getBeardBarberSpecs(grooming.beard);
  const barberClipboardText = [
    `Detected geometry: ${detectedFaceShape ? titleCase(detectedFaceShape) : "Balanced"} / ${getGeometryDescriptor(detectedFaceShape)}`,
    hairBarberSpecs,
    beardBarberSpecs
  ].join("\n");
  const outfitGroups = useMemo(
    () =>
      recommendations.map((recommendation, index) =>
        buildThreePieceOutfit(
          recommendation,
          index,
          profilePalette,
          selectedOccasionLabel,
          selectedSeasonLabel
        )
      ),
    [profilePalette, recommendations, selectedOccasionLabel, selectedSeasonLabel]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!isScanning) {
      return;
    }

    const interval = window.setInterval(() => {
      setScanStatusIndex((index) => (index + 1) % scanStatusTexts.length);
    }, 1300);

    return () => window.clearInterval(interval);
  }, [isScanning]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const storedPreferences = readStoredStylistPreferences();
      setStylistPreferences(storedPreferences);
      setOnboardingStep(storedPreferences.completed ? 2 : 1);
      setHasLoadedPreferences(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hasLoadedPreferences) {
      return;
    }

    window.localStorage.setItem(
      STYLIST_PREFERENCES_STORAGE_KEY,
      JSON.stringify(stylistPreferences)
    );
  }, [hasLoadedPreferences, stylistPreferences]);

  useEffect(() => {
    const syncVaultIds = () => {
      setVaultIds(new Set(readStyleVault().map((item) => item.id)));
    };
    const timeout = window.setTimeout(syncVaultIds, 0);

    window.addEventListener("style-vault-updated", syncVaultIds);
    window.addEventListener("storage", syncVaultIds);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("style-vault-updated", syncVaultIds);
      window.removeEventListener("storage", syncVaultIds);
    };
  }, []);

  async function loadRecommendations(
    nextVisionProfile: VisionAnalysis,
    nextOccasion = selectedOccasion,
    nextSeason = selectedSeason,
    nextBodyArchitecture = selectedBodyArchitecture,
    nextAdviceMode = selectedAdviceMode,
    nextClimateContext = climateContext,
    nextPreferences = stylistPreferences
  ) {
    setRecommendationError("");

    try {
      const response = await fetch("/api/stylist/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          adviceMode: nextAdviceMode,
          bodyArchitecture: nextBodyArchitecture,
          climateContext: nextClimateContext,
          occasion: nextOccasion,
          preferences: nextPreferences,
          season: nextSeason,
          visionData: nextVisionProfile
        })
      });

      if (!response.ok) {
        throw new Error("Unable to load guarded recommendations.");
      }

      const data = (await response.json()) as RecommendationResponse;
      setRecommendations(data.recommendations);
      setPieceOverrides({});
      setShuffleHistory({});
      setShuffleLoadingIds(new Set());
      setContextWarning(data.contextWarning ?? "");
      setClimateContext(data.climateContext ?? nextClimateContext ?? null);
      setDetectedDemographic(data.demographic);
      setDetectedFaceShape(data.faceShape);
      setGrooming(data.grooming);
      setStylistPreferences(data.preferences ?? nextPreferences);
      setProfileId(data.visionData.primary_color_undertone);
      setVisionProfile(data.visionData);
      setSelectedAdviceMode(data.adviceMode);
      setSelectedBodyArchitecture(data.bodyArchitecture);
      setSelectedOccasion(data.occasion);
      setSelectedSeason(data.season);
      setIsReady(true);
    } catch (error) {
      console.error(error);
      setRecommendationError("Recommendation guardrail could not load. Try scanning again.");
      setRecommendations([]);
      setContextWarning("");
      setGrooming({ beard: null, hairstyle: null });
      setIsReady(false);
    } finally {
      setIsScanning(false);
    }
  }

  async function refinePhotoAnalysis(file: File, fallbackProfile: VisionAnalysis) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ANALYSIS_REFINE_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("age_band", fallbackProfile.age_band);
      formData.append("analysis_confidence", String(fallbackProfile.analysis_confidence));
      formData.append("avoid_notes", JSON.stringify(fallbackProfile.avoid_notes));
      formData.append("build_and_proportion", fallbackProfile.build_and_proportion);
      formData.append("demographic", fallbackProfile.demographic);
      formData.append("detected_face_shape", fallbackProfile.detected_face_shape);
      formData.append("dominant_color", fallbackProfile.dominant_color);
      formData.append("extracted_palette", JSON.stringify(fallbackProfile.extracted_palette));
      formData.append("grooming_state", fallbackProfile.grooming_state);
      formData.append("grooming_strategy", fallbackProfile.grooming_strategy);
      formData.append("hairstyle_volume", fallbackProfile.hairstyle_volume);
      formData.append("lighting_quality", fallbackProfile.lighting_quality);
      formData.append("outfit_strategy", fallbackProfile.outfit_strategy);
      formData.append("primary_color_undertone", fallbackProfile.primary_color_undertone);
      formData.append("suggested_fit_profile", fallbackProfile.suggested_fit_profile);
      formData.append("visible_cues", JSON.stringify(fallbackProfile.visible_cues));
      formData.append(
        "recommended_color_palette",
        JSON.stringify(fallbackProfile.recommended_color_palette)
      );

      const response = await fetch("/api/stylist/analyze", {
        body: formData,
        method: "POST",
        signal: controller.signal
      });

      if (!response.ok) {
        return fallbackProfile;
      }

      const data = (await response.json()) as PhotoAnalysisResponse;

      return data.visionData;
    } catch {
      return fallbackProfile;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function startScan(
    file: File,
    nextPreviewUrl = previewUrl,
    stylingContext?: {
      climateContext?: ClimateContext | null;
      season?: StylingSeason;
      wardrobeProfile?: VisionDemographic;
    }
  ) {
    const scanRun = scanRunRef.current + 1;
    scanRunRef.current = scanRun;
    const activeSeason = stylingContext?.season ?? selectedSeason;
    const activeClimateContext = stylingContext?.climateContext ?? climateContext;
    const activeWardrobeProfile = stylingContext?.wardrobeProfile ?? selectedWardrobeProfile;
    setRecommendations([]);
    setPieceOverrides({});
    setShuffleHistory({});
    setShuffleLoadingIds(new Set());
    setContextWarning("");
    setGrooming({ beard: null, hairstyle: null });
    setRecommendationError("");
    setLookcardError("");
    setPhotoFeedback(null);
    setIsReady(false);
    setScanStatusIndex(0);
    setIsScanning(true);

    try {
      const fallbackVisionProfile = applyWardrobeProfileOverride(
        await analyzeStylistPhoto(file, nextPreviewUrl, activeWardrobeProfile),
        activeWardrobeProfile
      );
      const fallbackBodyArchitecture = inferBodyArchitecture(fallbackVisionProfile);
      setProfileId(fallbackVisionProfile.primary_color_undertone);
      setDetectedDemographic(fallbackVisionProfile.demographic);
      setDetectedFaceShape(fallbackVisionProfile.detected_face_shape);
      setSelectedBodyArchitecture(fallbackBodyArchitecture);
      setVisionProfile(fallbackVisionProfile);

      const nextVisionProfile = applyWardrobeProfileOverride(
        await refinePhotoAnalysis(file, fallbackVisionProfile),
        activeWardrobeProfile
      );
      const nextBodyArchitecture = inferBodyArchitecture(nextVisionProfile);

      if (scanRun !== scanRunRef.current) {
        return;
      }

      setProfileId(nextVisionProfile.primary_color_undertone);
      setDetectedDemographic(nextVisionProfile.demographic);
      setDetectedFaceShape(nextVisionProfile.detected_face_shape);
      setSelectedBodyArchitecture(nextBodyArchitecture);
      setVisionProfile(nextVisionProfile);

      const nextPhotoFeedback = getPhotoFeedback(nextVisionProfile);
      setPhotoFeedback(nextPhotoFeedback);

      if (nextPhotoFeedback.tone === "error") {
        setRecommendations([]);
        setContextWarning("");
        setGrooming({ beard: null, hairstyle: null });
        setIsReady(false);
        setIsScanning(false);
        return;
      }

      await loadRecommendations(
        nextVisionProfile,
        selectedOccasion,
        activeSeason,
        nextBodyArchitecture,
        selectedAdviceMode,
        activeClimateContext,
        stylistPreferences
      );
    } catch (error) {
      console.error(error);

      if (scanRun !== scanRunRef.current) {
        return;
      }

      setRecommendationError("Photo analysis could not read this image. Try a clearer portrait or full-body photo.");
      setPhotoFeedback({
        message: "Upload a clear portrait or full-body image and scan again.",
        title: "Photo could not be read",
        tone: "error"
      });
      setRecommendations([]);
      setGrooming({ beard: null, hairstyle: null });
      setIsReady(false);
      setIsScanning(false);
    }
  }

  function handleSelectedPhoto(file: File) {
    if (!file) {
      return;
    }

    if (!isSupportedImageFile(file)) {
      setPhotoFeedback({
        message: "This file is not an image. Upload a portrait or full-body photo in JPG, PNG, WebP, HEIC, or similar image format.",
        title: "Wrong file type",
        tone: "error"
      });
      setRecommendationError("");
      setIsReady(false);
      setIsScanning(false);
      setIsWardrobePromptOpen(false);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(nextPreviewUrl);
    setUploadName(file.name);
    photoFileRef.current = file;
    scanRunRef.current += 1;
    setIsScanning(false);
    setIsReady(false);
    setDetectedDemographic(null);
    setDetectedFaceShape(null);
    setVisionProfile(null);
    setRecommendations([]);
    setPieceOverrides({});
    setShuffleHistory({});
    setShuffleLoadingIds(new Set());
    setContextWarning("");
    setGrooming({ beard: null, hairstyle: null });
    setRecommendationError("");
    setLookcardError("");
    setPhotoFeedback(getUploadReadyFeedback(file));
    setIsWardrobePromptOpen(true);
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) {
      handleSelectedPhoto(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleSelectedPhoto(file);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleReset() {
    setPreviewUrl("");
    setUploadName("");
    photoFileRef.current = null;
    scanRunRef.current += 1;
    setIsScanning(false);
    setIsReady(false);
    setProfileId("neutral");
    setSelectedWardrobeProfile("menswear");
    setIsWardrobePromptOpen(false);
    setSelectedAdviceMode("discover_new");
    setSelectedOccasion("mall");
    setSelectedSeason("all-season");
    setSelectedBodyArchitecture("athletic_tapered");
    setDetectedDemographic(null);
    setDetectedFaceShape(null);
    setVisionProfile(null);
    setRecommendations([]);
    setPieceOverrides({});
    setShuffleHistory({});
    setShuffleLoadingIds(new Set());
    setContextWarning("");
    setGrooming({ beard: null, hairstyle: null });
    setRecommendationError("");
    setLookcardError("");
    setPhotoFeedback(null);
    setScanStatusIndex(0);

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  function handleWardrobeProfileChange(nextWardrobeProfile: VisionDemographic) {
    setSelectedWardrobeProfile(nextWardrobeProfile);
    setIsWardrobePromptOpen(false);

    if (!visionProfile) {
      setDetectedDemographic(nextWardrobeProfile);
      const pendingPhoto = photoFileRef.current;
      const pendingPreviewUrl = previewUrl;

      if (pendingPhoto && pendingPreviewUrl) {
        void (async () => {
          const stylingContext = await resolveClimateForStyling();
          await startScan(pendingPhoto, pendingPreviewUrl, {
            ...stylingContext,
            wardrobeProfile: nextWardrobeProfile
          });
        })();
      }
      return;
    }

    const nextVisionProfile = applyWardrobeProfileOverride(visionProfile, nextWardrobeProfile);
    const nextBodyArchitecture = inferBodyArchitecture(nextVisionProfile);
    setDetectedDemographic(nextWardrobeProfile);
    setDetectedFaceShape(nextVisionProfile.detected_face_shape);
    setSelectedBodyArchitecture(nextBodyArchitecture);
    setVisionProfile(nextVisionProfile);
    setRecommendations([]);
    setContextWarning("");
    setGrooming({ beard: null, hairstyle: null });
    setIsReady(false);
    setIsScanning(true);
    void loadRecommendations(
      nextVisionProfile,
      selectedOccasion,
      selectedSeason,
      nextBodyArchitecture,
      selectedAdviceMode,
      climateContext,
      stylistPreferences
    );
  }

  async function resolveClimateForStyling() {
    if (climateContext) {
      return {
        climateContext,
        season: getSeasonFromClimate(climateContext)
      };
    }

    setIsSyncingClimate(true);
    setClimateError("");

    try {
      const nextClimateContext = await fetchClimateContext();
      const nextSeason = getSeasonFromClimate(nextClimateContext);
      setClimateContext(nextClimateContext);
      setSelectedSeason(nextSeason);

      return {
        climateContext: nextClimateContext,
        season: nextSeason
      };
    } catch {
      setClimateError("Weather could not sync, so I used all-season styling.");
      setClimateContext(null);
      setSelectedSeason("all-season");

      return {
        climateContext: null,
        season: "all-season" as StylingSeason
      };
    } finally {
      setIsSyncingClimate(false);
    }
  }

  function handleFitPreferenceChange(fitPreference: FitPreference) {
    setStylistPreferences((preferences) => ({
      ...preferences,
      fitPreference
    }));
  }

  function handleBudgetTierChange(budgetTier: BudgetTier) {
    setStylistPreferences((preferences) => ({
      ...preferences,
      budgetTier
    }));
  }

  function handlePreferenceSave() {
    const nextPreferences = {
      ...stylistPreferences,
      completed: true
    };

    setStylistPreferences(nextPreferences);
    setOnboardingStep(2);

    if (!visionProfile) {
      return;
    }

    setRecommendations([]);
    setContextWarning("");
    setGrooming({ beard: null, hairstyle: null });
    setIsReady(false);
    setIsScanning(true);
    void loadRecommendations(
      visionProfile,
      selectedOccasion,
      selectedSeason,
      selectedBodyArchitecture,
      selectedAdviceMode,
      climateContext,
      nextPreferences
    );
  }

  async function handleCopyBarberSpecs() {
    try {
      await navigator.clipboard.writeText(barberClipboardText);
      setBarberCopyStatus("Copied");
      window.setTimeout(() => setBarberCopyStatus(""), 1800);
    } catch (error) {
      console.error(error);
      setBarberCopyStatus("Copy failed");
      window.setTimeout(() => setBarberCopyStatus(""), 1800);
    }
  }

  function toggleVaultItem(item: StyleVaultItem) {
    const nextItems = vaultIds.has(item.id)
      ? removeStyleVaultItem(item.id)
      : upsertStyleVaultItem(item);

    setVaultIds(new Set(nextItems.map((nextItem) => nextItem.id)));
  }

  function getVisibleOutfitPieces(outfit: ThreePieceOutfit) {
    return outfit.pieces.map((piece) => pieceOverrides[outfit.id]?.[piece.role] ?? piece);
  }

  function createPieceFromGarment(
    outfitId: string,
    role: OutfitGridPiece["role"],
    garment: Garment
  ): OutfitGridPiece {
    return {
      accentColor: garment.color_palette[0] ?? "#D8CCBB",
      garment,
      id: `${outfitId}-${role}-${garment.id}`,
      imageUrl: garment.image_url,
      meta: `${garment.year} · ${titleCase(garment.fit_profile)}`,
      role,
      title: garment.title
    };
  }

  async function handleShufflePiece(outfit: ThreePieceOutfit, piece: OutfitGridPiece) {
    const pieceKey = `${outfit.id}-${piece.role}`;
    const visiblePieces = getVisibleOutfitPieces(outfit);
    const existingIds = visiblePieces
      .map((visiblePiece) => visiblePiece.garment?.id)
      .filter((id): id is string => Boolean(id));
    const excludeIds = Array.from(new Set([...existingIds, ...(shuffleHistory[pieceKey] ?? [])]));

    setShuffleLoadingIds((ids) => new Set([...ids, pieceKey]));

    try {
      const response = await fetch("/api/stylist/shuffle", {
        body: JSON.stringify({
          demographic: detectedDemographic ?? outfit.recommendation.garment.demographic,
          excludeIds,
          occasion: selectedOccasion,
          palette: profilePalette,
          role: piece.role,
          season: selectedSeason
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const data = (await response.json()) as ShuffleResponse;

      if (!response.ok || !data.garment) {
        setRecommendationError(data.error ?? "No alternate piece found for this slot.");
        return;
      }

      const garment = data.garment;
      const nextPiece = createPieceFromGarment(outfit.id, piece.role, garment);
      setPieceOverrides((currentOverrides) => ({
        ...currentOverrides,
        [outfit.id]: {
          ...currentOverrides[outfit.id],
          [piece.role]: nextPiece
        }
      }));
      setShuffleHistory((currentHistory) => ({
        ...currentHistory,
        [pieceKey]: Array.from(new Set([...(currentHistory[pieceKey] ?? []), garment.id]))
      }));
      setRecommendationError("");
    } catch (error) {
      console.error(error);
      setRecommendationError("Could not shuffle this outfit slot. Try again.");
    } finally {
      setShuffleLoadingIds((ids) => {
        const nextIds = new Set(ids);
        nextIds.delete(pieceKey);
        return nextIds;
      });
    }
  }

  function buildOutfitVaultItem(
    outfit: ThreePieceOutfit,
    visiblePieces: OutfitGridPiece[]
  ): StyleVaultItem {
    return {
      id: `outfit-${outfit.id}`,
      imageUrl: visiblePieces.find((piece) => piece.imageUrl)?.imageUrl,
      payload: {
        context: `${selectedOccasionLabel} · ${selectedSeasonLabel}`,
        fitReason: outfit.recommendation.fitReason,
        palette: profilePalette,
        pieces: visiblePieces,
        summary: outfit.summary,
        trendSignal: outfit.recommendation.trendSignal
      },
      savedAt: new Date().toISOString(),
      subtitle: `${selectedOccasionLabel} · ${selectedSeasonLabel}`,
      title: outfit.title,
      type: "outfit"
    };
  }

  function buildGroomingVaultItem(card: GroomingRecommendation): StyleVaultItem {
    const specs = card.category === "hairstyle" ? getHairBarberSpecs(card) : getBeardBarberSpecs(card);

    return {
      id: `grooming-${card.id}`,
      imageUrl: card.imageUrl,
      payload: {
        affiliateUrl: card.affiliateUrl,
        barberSpecs: specs,
        faceShape: card.matchedFaceShape,
        product: card.product,
        rationale: card.rationale
      },
      savedAt: new Date().toISOString(),
      subtitle: `${titleCase(card.category)} · ${titleCase(card.matchedFaceShape)} face`,
      title: card.title,
      type: "grooming"
    };
  }

  async function handleDownloadLookcard() {
    if (!previewUrl || !visionProfile) {
      setLookcardError("Upload and analyze a photo before downloading a lookcard.");
      return;
    }

    setIsExportingLookcard(true);
    setLookcardError("");

    try {
      const image = await loadLookcardImage(previewUrl);
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not create lookcard canvas.");
      }

      context.fillStyle = "#FBF7F0";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#D8CCBB";
      context.lineWidth = 2;
      context.strokeRect(54, 54, 972, 1812);

      context.fillStyle = "#2E251D";
      context.font = "600 34px Arial";
      context.fillText("PERSONAL STYLIST // ARCHIVE", 90, 130);
      context.font = "28px Arial";
      context.fillStyle = "#7B6A5B";
      context.fillText(`${selectedOccasionLabel.toUpperCase()} · ${selectedSeasonLabel.toUpperCase()}`, 90, 184);

      context.save();
      context.beginPath();
      context.rect(90, 250, 900, 980);
      context.clip();
      drawImageCover(context, image, 90, 250, 900, 980);
      context.restore();
      context.strokeStyle = "#BDAE9A";
      context.strokeRect(90, 250, 900, 980);

      context.fillStyle = "#2E251D";
      context.font = "300 62px Arial";
      drawFittedText(context, "STYLE PROFILE", 90, 1330, 900);

      const metrics = [
        ["FACE SHAPE", faceShapeLabel],
        ["UNDERTONE", titleCase(visionProfile.primary_color_undertone)],
        ["PROPORTION", selectedBodyArchitectureLabel]
      ];

      context.font = "600 24px Arial";
      metrics.forEach(([label, value], index) => {
        const y = 1408 + index * 84;
        context.fillStyle = "#8A7867";
        context.fillText(label, 90, y);
        context.fillStyle = "#2E251D";
        context.font = "400 34px Arial";
        drawFittedText(context, value.toUpperCase(), 90, y + 40, 760);
        context.font = "600 24px Arial";
      });

      const swatches = extractedPalette.slice(0, 3);
      context.font = "600 22px Arial";
      swatches.forEach((color, index) => {
        const x = 90 + index * 300;
        context.fillStyle = color;
        context.fillRect(x, 1700, 250, 86);
        context.strokeStyle = "#D8CCBB";
        context.strokeRect(x, 1700, 250, 86);
        context.fillStyle = "#2E251D";
        context.fillText(color.toUpperCase(), x, 1832);
      });

      const blob = await canvasToBlob(canvas);
      downloadBlob(blob, "personal-stylist-lookcard.png");
    } catch (error) {
      console.error(error);
      setLookcardError("Lookcard export failed. Try again after the photo finishes loading.");
    } finally {
      setIsExportingLookcard(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl animate-fade-in">
      <div className="flex flex-col justify-between gap-4 border-b border-[#D8CCBB] pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
            PERSONAL STYLIST
          </p>
          <h1 className="mt-3 text-3xl font-light tracking-[-0.01em] text-neutral-950 md:text-5xl">
            Aesthetic profile studio
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isUsingSampleData ? <Badge>Sample data</Badge> : <Badge>Original data</Badge>}
          <Badge>{archiveLookCount} archive looks</Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="border border-[#D8CCBB] bg-white/80 p-5 backdrop-blur-xl md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Profile Input
              </p>
              <h2 className="mt-2 text-2xl font-light text-neutral-950">Photo scan</h2>
            </div>
            <div className="grid size-11 place-items-center border border-[#D8CCBB] bg-white/70">
              <Wand2 className="size-5" />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-5 rounded-md border border-[#D8CCBB] bg-[#FBF7F0] p-3">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    Wardrobe
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">
                    {selectedWardrobeProfileLabel}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isScanning || isSyncingClimate}
                  onClick={() => setIsWardrobePromptOpen(true)}
                >
                  Change
                </Button>
              </div>
            </div>

            <div className="mb-5 rounded-md border border-[#D8CCBB] bg-white/70 p-3">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    Preferences
                  </p>
                  <p className="mt-1 truncate text-sm text-neutral-700">
                    {selectedFitPreferenceLabel} · {selectedBudgetTierLabel}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={showAdvancedInput ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAdvancedInput((value) => !value)}
                >
                  {showAdvancedInput ? "Done" : "Edit"}
                </Button>
              </div>
              {climateError ? (
                <p className="mt-2 text-sm leading-6 text-[#6B2A1D]">{climateError}</p>
              ) : null}
            </div>

            {showAdvancedInput ? (
              <div className="mb-5 border border-[#D8CCBB] bg-white/70 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    Bespoke fitting
                  </p>
                  <h3 className="mt-1 text-lg font-light text-neutral-950">
                    Fit and budget
                  </h3>
                </div>
                <Badge>{stylistPreferences.completed ? "Saved" : `Step ${onboardingStep} / 2`}</Badge>
              </div>

              {stylistPreferences.completed ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{selectedFitPreferenceLabel}</Badge>
                    <Badge>{selectedBudgetTierLabel}</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStylistPreferences((preferences) => ({
                        ...preferences,
                        completed: false
                      }));
                      setOnboardingStep(1);
                    }}
                  >
                    Edit preferences
                  </Button>
                </div>
              ) : (
                <div className="mt-4">
                  {onboardingStep === 1 ? (
                    <div>
                      <p className="text-sm font-medium text-neutral-950">
                        How do you prefer your silhouette?
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {fitPreferenceOptions.map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            variant={
                              stylistPreferences.fitPreference === option.value ? "default" : "outline"
                            }
                            className="h-auto justify-start whitespace-normal py-3 text-left"
                            onClick={() => handleFitPreferenceChange(option.value)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3"
                        onClick={() => setOnboardingStep(2)}
                      >
                        Continue
                      </Button>
                    </div>
                  ) : null}

                  {onboardingStep === 2 ? (
                    <div>
                      <p className="text-sm font-medium text-neutral-950">
                        What is your comfortable price ceiling per item?
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {budgetTierOptions.map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            variant={
                              stylistPreferences.budgetTier === option.value ? "default" : "outline"
                            }
                            className="h-auto justify-start whitespace-normal py-3 text-left"
                            onClick={() => handleBudgetTierChange(option.value)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setOnboardingStep(1)}>
                          Back
                        </Button>
                        <Button type="button" size="sm" onClick={handlePreferenceSave}>
                          Save preferences
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            ) : null}

            <div
              className={cn(
                "relative flex min-h-[500px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-[#BDAE9A] bg-[#F8F3EB] p-5 text-center transition-all duration-300 hover:border-[#7B5637] hover:bg-[#F3E8DA] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#8A6A4F]/25",
                previewUrl ? "border-solid border-[#D8CCBB] bg-white p-3 shadow-sm" : "",
                isScanning || isSyncingClimate ? "pointer-events-none cursor-wait" : ""
              )}
              aria-label={previewUrl ? "Change styling profile photo" : "Select styling profile photo"}
              aria-disabled={isScanning || isSyncingClimate}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                id="stylist-photo"
                type="file"
                accept="image/*"
                ref={photoInputRef}
                className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
                disabled={isScanning || isSyncingClimate}
                aria-label={previewUrl ? "Change styling profile photo" : "Select styling profile photo"}
                onClick={(event) => {
                  event.currentTarget.value = "";
                }}
                onChange={handleUpload}
              />

              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uploaded styling profile"
                  className="h-full max-h-[640px] w-full rounded-[4px] object-contain"
                />
              ) : (
                <>
                  <span className="grid size-14 place-items-center rounded-full border border-[#D8CCBB] bg-white/80">
                    <Upload className="size-5" />
                  </span>
                  <span className="mt-5 text-sm font-medium uppercase tracking-[0.2em] text-neutral-800">
                    Drop your photo here, or tap to browse.
                  </span>
                  <span className="mt-2 max-w-xs text-sm leading-6 text-neutral-500">
                    A clear front-facing portrait or full-body outfit gives the most accurate styling read.
                  </span>
                </>
              )}

              {isScanning ? (
                <div className="absolute inset-x-3 bottom-3 z-30 rounded-[4px] border border-white/50 bg-white/85 px-4 py-3 text-left shadow-sm backdrop-blur-xl">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-600">
                    {scanStatusTexts[scanStatusIndex]}
                  </p>
                </div>
              ) : null}
            </div>

            {previewUrl && visionProfile ? (
              <div className="mt-4 rounded-md border border-[#D8CCBB] bg-white/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    Canvas color read
                  </p>
                  <Badge>Dominant {dominantColor}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {extractedPalette.map((color) => (
                    <div
                      key={color}
                      className="flex h-12 items-end rounded-[4px] border border-black/5 p-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white shadow-inner"
                      style={{ backgroundColor: color }}
                      title={color}
                    >
                      {color}
                    </div>
                  ))}
                </div>
                {visionProfile?.lighting_quality === "suboptimal" ? (
                  <div className="mt-3 rounded-md border border-[#D8B26E] bg-[#FFF8E6] px-3 py-2 text-sm leading-6 text-[#5B4318]">
                    Low lighting detected. Color swatches may appear warmer or darker than real life. For better precision, face a natural light source.
                  </div>
                ) : null}
              </div>
            ) : null}

            {photoFeedback ? (
              <div
                className={cn(
                  "mt-4 flex items-start gap-3 rounded-md border px-3 py-2 text-left shadow-sm",
                  photoFeedback.tone === "positive" &&
                    "border-[#C7D6BF] bg-[#F4FAF1] text-[#26361F]",
                  photoFeedback.tone === "warning" &&
                    "border-[#E2C98D] bg-[#FFF8E6] text-[#5B4318]",
                  photoFeedback.tone === "error" &&
                    "border-[#E4B4A6] bg-[#FFF1EC] text-[#6B2A1D]"
                )}
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center border border-current/20 bg-white/55">
                  {photoFeedback.tone === "positive" ? (
                    <Sparkles className="size-4" />
                  ) : (
                    <AlertTriangle className="size-4" />
                  )}
                </span>
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-[0.16em]">
                    {photoFeedback.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6">
                    {photoFeedback.tone === "error"
                      ? "Please upload a clearer photo facing the camera for accurate styling."
                      : photoFeedback.message}
                  </span>
                </span>
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="truncate text-sm text-neutral-500">
                {uploadName || "Waiting for one clear photo"}
              </p>
              <Button type="button" variant="outline" onClick={handleReset}>
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>

            {recommendationError ? (
              <div className="mt-4 border border-[#D8CCBB] bg-white/70 p-3 text-sm text-neutral-700">
                {recommendationError}
              </div>
            ) : null}

          </div>
        </section>

        {isReady ? (
          <section className="border border-[#D8CCBB] bg-white/80 p-5 backdrop-blur-xl md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Result
                </p>
                <h2 className="mt-2 text-2xl font-light text-neutral-950">
                  Your style match
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {climateContext ? (
                  <Badge>
                    <MapPin className="size-3.5" />
                    {Math.round(climateContext.temperatureC)}C · {getClimateDirective(climateContext)}
                  </Badge>
                ) : null}
                <Badge>{recommendations.length} looks</Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isExportingLookcard || !previewUrl}
                  onClick={() => void handleDownloadLookcard()}
                >
                  <Download className="size-4" />
                  {isExportingLookcard ? "Rendering" : "Download Lookcard"}
                </Button>
              </div>
            </div>

            {lookcardError ? (
              <div className="mt-4 border border-[#E4B4A6] bg-[#FFF1EC] p-3 text-sm text-[#6B2A1D]">
                {lookcardError}
              </div>
            ) : null}

            <div className="mt-6 rounded-md border border-[#D8CCBB] bg-white/70 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    Style read
                  </p>
                  <h3 className="mt-2 text-xl font-light text-neutral-950">
                    {wardrobeProfileLabel} · {fitProfileLabel} · {titleCase(visionProfile?.primary_color_undertone ?? profileId)}
                  </h3>
                </div>
                <div className="flex gap-1.5">
                  {profilePalette.map((color) => (
                    <span
                      key={color}
                      className="size-7 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>{faceShapeLabel}</Badge>
                <Badge>{selectedBodyArchitectureLabel}</Badge>
                {climateContext ? <Badge>{climateContext.locationLabel}</Badge> : null}
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-light text-neutral-950">Trending Matches for You</h3>
                <Badge>{recommendations.length} outfits</Badge>
              </div>

              {outfitGroups.length ? (
                <div className="mt-4 space-y-5">
                  {outfitGroups.map((outfit) => {
                    const visiblePieces = getVisibleOutfitPieces(outfit);
                    const vaultItem = buildOutfitVaultItem(outfit, visiblePieces);
                    const isSaved = vaultIds.has(vaultItem.id);

                    return (
                      <article
                        key={outfit.id}
                        className="overflow-hidden border border-[#D8CCBB] bg-white"
                      >
                        <div className="flex flex-col gap-3 border-b border-[#D8CCBB] bg-[#FBF7F0] p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                              {outfit.title} · {demographicLabels[outfit.recommendation.garment.demographic]}
                            </p>
                            <h4 className="mt-1 text-lg font-medium text-neutral-950">
                              {outfit.recommendation.title}
                            </h4>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleVaultItem(vaultItem)}
                          >
                            <Bookmark
                              className={cn("size-4", isSaved && "fill-[#3A2A1E] text-[#3A2A1E]")}
                            />
                            {isSaved ? "Saved" : "Save"}
                          </Button>
                        </div>

                        <div className="grid border-b border-[#D8CCBB] md:grid-cols-3">
                          {visiblePieces.map((piece) => {
                            const pieceKey = `${outfit.id}-${piece.role}`;
                            const isShuffling = shuffleLoadingIds.has(pieceKey);

                            return (
                              <div
                                key={piece.id}
                                className="group animate-fade-in border-b border-[#D8CCBB] last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                              >
                                <div className="relative aspect-[4/5] overflow-hidden bg-[#EEE5D7]">
                                  <OutfitPieceVisual piece={piece} />
                                  <div className="absolute left-3 top-3">
                                    <Badge className="bg-white/90 text-[#3A2A1E]">
                                      {piece.role}
                                    </Badge>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label={`Shuffle ${piece.role}`}
                                    className="absolute right-3 top-3 size-9 bg-white/90"
                                    disabled={isShuffling}
                                    onClick={() => void handleShufflePiece(outfit, piece)}
                                  >
                                    <Shuffle className={cn("size-4", isShuffling && "animate-spin")} />
                                  </Button>
                                </div>
                                <div className="p-4">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                    {piece.meta}
                                  </p>
                                  <p className="mt-1 text-sm font-medium leading-5 text-neutral-950">
                                    {piece.title}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="space-y-3 p-4">
                          <p className="text-sm leading-6 text-neutral-700">{outfit.summary}</p>
                          <div className="border border-[#D8CCBB] bg-[#FBF7F0] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                              Why this fits you
                            </p>
                            <p className="mt-2 text-xs leading-5 text-neutral-700">
                              {outfit.recommendation.fitReason}
                            </p>
                          </div>
                          <p className="border-t border-[#D8CCBB] pt-3 text-xs font-medium text-neutral-700">
                            {outfit.recommendation.trendSignal}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 border border-[#D8CCBB] bg-white/70 p-4 text-sm text-neutral-600">
                  {contextWarning || "No eligible outfits found after applying the demographic guardrail."}
                </div>
              )}
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-light text-neutral-950">Grooming</h3>
                <Badge>{groomingCards.length} styles</Badge>
              </div>

              {groomingCards.length ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {groomingCards.map((card) => {
                    const vaultItem = buildGroomingVaultItem(card);
                    const isSaved = vaultIds.has(vaultItem.id);

                    return (
                      <article
                        key={card.id}
                        className="group overflow-hidden border border-[#D8CCBB] bg-white"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-[#EEE5D7]">
                          <img
                            src={card.imageUrl}
                            alt={card.title}
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                            <Badge className="bg-white/90 text-[#3A2A1E]">
                              {titleCase(card.category)} • {titleCase(card.matchedFaceShape)}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-4 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge>{titleCase(card.category)}</Badge>
                            <Badge>{titleCase(card.matchedFaceShape)} face</Badge>
                            {card.maintenanceLevel ? (
                              <Badge>{card.maintenanceLevel}</Badge>
                            ) : null}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleVaultItem(vaultItem)}
                            >
                              <Bookmark
                                className={cn("size-4", isSaved && "fill-[#3A2A1E] text-[#3A2A1E]")}
                              />
                              {isSaved ? "Saved" : "Save"}
                            </Button>
                          </div>

                          <div>
                            <h4 className="text-base font-medium text-neutral-950">{card.title}</h4>
                            <p className="mt-2 text-sm leading-6 text-neutral-600">
                              {card.description}
                            </p>
                          </div>

                          <p className="border-t border-[#D8CCBB] pt-3 text-sm leading-6 text-neutral-700">
                            {card.rationale}
                          </p>

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => setIsGroomingDrawerOpen(true)}
                          >
                            View Architectural Breakdown
                            <ArrowUpRight className="size-4" />
                          </Button>

                          <a
                            href={card.affiliateUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={buttonVariants({ className: "w-full" })}
                          >
                            <ArrowUpRight className="size-4" />
                            Get Styling Product
                          </a>
                          <p className="text-xs text-neutral-500">{card.product.name}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 border border-[#D8CCBB] bg-white/70 p-4 text-sm text-neutral-600">
                  No grooming matches found for this face shape.
                </div>
              )}
            </div>

            <div className="mt-6 border border-[#D8CCBB] bg-white/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600">
                <Sparkles className="size-4" />
                Rationale
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{profile.rationale}</p>
            </div>
          </section>
        ) : null}
      </div>

      {isWardrobePromptOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wardrobe-profile-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close wardrobe selection"
            onClick={() => setIsWardrobePromptOpen(false)}
          />
          <div className="relative w-full max-w-md border border-[#D8CCBB] bg-[#FBF7F0] p-5 shadow-2xl md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Wardrobe
                </p>
                <h3
                  id="wardrobe-profile-title"
                  className="mt-2 text-2xl font-light text-neutral-950"
                >
                  Select section
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Close wardrobe selection"
                onClick={() => setIsWardrobePromptOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-5 grid gap-2">
              {wardrobeProfileOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={selectedWardrobeProfile === option.value ? "default" : "outline"}
                  className="h-12 justify-between"
                  aria-pressed={selectedWardrobeProfile === option.value}
                  onClick={() => handleWardrobeProfileChange(option.value)}
                >
                  <span>{option.label}</span>
                  {selectedWardrobeProfile === option.value ? <span>Selected</span> : null}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isGroomingDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close grooming breakdown"
            onClick={() => setIsGroomingDrawerOpen(false)}
          />
          <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-[#D8CCBB] bg-[#FBF7F0] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Grooming Breakdown
                </p>
                <h3 className="mt-3 text-2xl font-light text-neutral-950">
                  Detected Geometry: {detectedFaceShape ? titleCase(detectedFaceShape) : "Balanced"} / {getGeometryDescriptor(detectedFaceShape)}
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Close grooming breakdown"
                onClick={() => setIsGroomingDrawerOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-8 space-y-5">
              <div className="rounded-md border border-[#D8CCBB] bg-white/75 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Why the Hairstyle Works
                </p>
                <h4 className="mt-2 text-lg font-medium text-neutral-950">
                  {grooming.hairstyle?.title ?? "Hairstyle"}
                </h4>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{hairstyleBreakdown}</p>
                <p className="mt-3 border-t border-[#D8CCBB] pt-3 text-sm leading-6 text-neutral-600">
                  {hairBarberSpecs}
                </p>
              </div>

              <div className="rounded-md border border-[#D8CCBB] bg-white/75 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Why the Beard Works
                </p>
                <h4 className="mt-2 text-lg font-medium text-neutral-950">
                  {grooming.beard?.title ?? "Beard shape"}
                </h4>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{beardBreakdown}</p>
                <p className="mt-3 border-t border-[#D8CCBB] pt-3 text-sm leading-6 text-neutral-600">
                  {beardBarberSpecs}
                </p>
              </div>
            </div>

            <Button
              type="button"
              className="mt-6 w-full"
              onClick={() => void handleCopyBarberSpecs()}
            >
              <Copy className="size-4" />
              {barberCopyStatus || "Copy Specs for Barber"}
            </Button>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
