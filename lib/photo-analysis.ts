import type { Demographic } from "@/lib/types";
import {
  createVisionAnalysis,
  createVisionProfile,
  type VisionAgeBand,
  type VisionAnalysis,
  type VisionBuildAndProportion,
  type VisionDemographic,
  type VisionFitProfile,
  type VisionGroomingState,
  type VisionHairstyleVolume,
  type VisionProfile,
  type VisionUndertone
} from "@/lib/vision";

type PixelSample = {
  b: number;
  g: number;
  l: number;
  r: number;
  s: number;
  x: number;
  y: number;
};

type Bounds = {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
};

const paletteByUndertone: Record<VisionUndertone, [string, string, string]> = {
  cool: ["#111111", "#C7D0D8", "#0057B8"],
  neutral: ["#222222", "#D9D0C1", "#7B1F2A"],
  warm: ["#1A1A1A", "#4F5D4E", "#D8C3A5"]
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read uploaded image."));
    image.src = src;
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read uploaded image data."));
    };
    reader.onerror = () => reject(new Error("Unable to read uploaded image data."));
    reader.readAsDataURL(file);
  });
}

async function loadUploadedImage(file: File, previewUrl: string) {
  try {
    return await loadImage(previewUrl);
  } catch {
    return loadImage(await readFileAsDataUrl(file));
  }
}

function rgbToHsl(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, l: lightness, s: 0 };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  if (max === red) {
    hue = 60 * (((green - blue) / delta) % 6);
  } else if (max === green) {
    hue = 60 * ((blue - red) / delta + 2);
  } else {
    hue = 60 * ((red - green) / delta + 4);
  }

  return {
    h: hue < 0 ? hue + 360 : hue,
    l: lightness,
    s: saturation
  };
}

function average(samples: PixelSample[]) {
  if (samples.length === 0) {
    return { b: 128, g: 128, l: 0.5, r: 128, s: 0 };
  }

  const total = samples.reduce(
    (sum, sample) => ({
      b: sum.b + sample.b,
      g: sum.g + sample.g,
      l: sum.l + sample.l,
      r: sum.r + sample.r,
      s: sum.s + sample.s
    }),
    { b: 0, g: 0, l: 0, r: 0, s: 0 }
  );

  return {
    b: total.b / samples.length,
    g: total.g / samples.length,
    l: total.l / samples.length,
    r: total.r / samples.length,
    s: total.s / samples.length
  };
}

function clampColor(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function componentToHex(value: number) {
  return clampColor(value).toString(16).padStart(2, "0").toUpperCase();
}

function rgbToHex(value: Pick<PixelSample, "b" | "g" | "r">) {
  return `#${componentToHex(value.r)}${componentToHex(value.g)}${componentToHex(value.b)}`;
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

function quantizeColor(value: number) {
  return Math.max(0, Math.min(255, Math.round(value / 28) * 28));
}

function colorDistance(first: Pick<PixelSample, "b" | "g" | "r">, second: Pick<PixelSample, "b" | "g" | "r">) {
  return Math.sqrt(
    (first.r - second.r) ** 2 + (first.g - second.g) ** 2 + (first.b - second.b) ** 2
  );
}

function isSkinLike(sample: PixelSample) {
  const cb = 128 - 0.168736 * sample.r - 0.331264 * sample.g + 0.5 * sample.b;
  const cr = 128 + 0.5 * sample.r - 0.418688 * sample.g - 0.081312 * sample.b;
  const brightness = (sample.r + sample.g + sample.b) / 3;
  const channelSpread = Math.max(sample.r, sample.g, sample.b) - Math.min(sample.r, sample.g, sample.b);

  return (
    brightness > 35 &&
    brightness < 245 &&
    channelSpread > 10 &&
    cb >= 72 &&
    cb <= 142 &&
    cr >= 126 &&
    cr <= 188
  );
}

function boundsFor(samples: PixelSample[]): Bounds | null {
  if (samples.length === 0) {
    return null;
  }

  return samples.reduce<Bounds>(
    (bounds, sample) => ({
      maxX: Math.max(bounds.maxX, sample.x),
      maxY: Math.max(bounds.maxY, sample.y),
      minX: Math.min(bounds.minX, sample.x),
      minY: Math.min(bounds.minY, sample.y)
    }),
    {
      maxX: samples[0].x,
      maxY: samples[0].y,
      minX: samples[0].x,
      minY: samples[0].y
    }
  );
}

function widthNearY(samples: PixelSample[], y: number, tolerance: number) {
  const row = samples.filter((sample) => Math.abs(sample.y - y) <= tolerance);

  if (row.length < 4) {
    return 0;
  }

  const bounds = boundsFor(row);
  return bounds ? bounds.maxX - bounds.minX + 1 : 0;
}

function detectFaceShape(skinSamples: PixelSample[], width: number, height: number): VisionProfile["detected_face_shape"] {
  const faceSamples = skinSamples.filter((sample) => sample.y < height * 0.72);
  const bounds = boundsFor(faceSamples);

  if (!bounds || faceSamples.length < 32) {
    return "oval";
  }

  const faceWidth = bounds.maxX - bounds.minX + 1;
  const faceHeight = bounds.maxY - bounds.minY + 1;
  const ratio = faceWidth / Math.max(faceHeight, 1);
  const tolerance = Math.max(2, Math.round(faceHeight * 0.08));
  const foreheadWidth = widthNearY(faceSamples, bounds.minY + faceHeight * 0.24, tolerance);
  const cheekWidth = widthNearY(faceSamples, bounds.minY + faceHeight * 0.48, tolerance);
  const jawWidth = widthNearY(faceSamples, bounds.minY + faceHeight * 0.78, tolerance);
  const jawToCheek = jawWidth / Math.max(cheekWidth, 1);
  const cheekToForehead = cheekWidth / Math.max(foreheadWidth, 1);

  if (ratio < 0.56) {
    return "rectangle";
  }

  if (cheekToForehead > 1.12 && jawToCheek < 0.72) {
    return "diamond";
  }

  if (ratio > 0.78 && jawToCheek > 0.84) {
    return "square";
  }

  if (ratio > 0.76) {
    return "round";
  }

  return "oval";
}

function detectUndertone(skinSamples: PixelSample[], allSamples: PixelSample[]): VisionUndertone {
  const source = skinSamples.length >= 48 ? skinSamples : allSamples;
  const avg = average(source);
  const { h } = rgbToHsl(avg.r, avg.g, avg.b);
  const warmth = avg.r - avg.b + (avg.g - avg.b) * 0.35;

  if (skinSamples.length >= 48) {
    if (warmth > 18 || (h >= 18 && h <= 62 && avg.r > avg.b + 8)) {
      return "warm";
    }

    if (avg.b > avg.r - 4 || h >= 205) {
      return "cool";
    }

    return "neutral";
  }

  if (avg.s < 0.18) {
    return "neutral";
  }

  if ((h >= 18 && h <= 78) || h >= 335) {
    return "warm";
  }

  if (h >= 160 && h <= 265) {
    return "cool";
  }

  return "neutral";
}

function detectForeground(samples: PixelSample[], width: number, height: number) {
  const borderSamples = samples.filter((sample) => {
    return sample.x < width * 0.08 || sample.x > width * 0.92 || sample.y < height * 0.08 || sample.y > height * 0.92;
  });
  const bg = average(borderSamples);

  return samples.filter((sample) => {
    const distance = colorDistance(sample, bg);
    const isCenter = sample.x > width * 0.18 && sample.x < width * 0.82 && sample.y > height * 0.08;
    return isCenter && distance > 34;
  });
}

function getDominantForegroundPalette(
  foregroundSamples: PixelSample[],
  undertone: VisionUndertone,
  height: number
): [string, string, string] {
  const fallback = paletteByUndertone[undertone];
  const candidates = foregroundSamples.filter((sample) => {
    const isLikelyClothingRegion = sample.y > height * 0.16;
    const isReadableColor = sample.l > 0.04 && sample.l < 0.96;

    return isLikelyClothingRegion && isReadableColor && !isSkinLike(sample);
  });

  if (candidates.length < 24) {
    return fallback;
  }

  const clusters = new Map<
    string,
    {
      count: number;
      score: number;
      totalB: number;
      totalG: number;
      totalR: number;
    }
  >();

  for (const sample of candidates) {
    const key = `${quantizeColor(sample.r)}-${quantizeColor(sample.g)}-${quantizeColor(sample.b)}`;
    const cluster = clusters.get(key) ?? {
      count: 0,
      score: 0,
      totalB: 0,
      totalG: 0,
      totalR: 0
    };
    const saturationWeight = 1 + Math.min(sample.s, 0.9);
    const centerWeight = sample.y > height * 0.32 ? 1.25 : 1;

    cluster.count += 1;
    cluster.score += saturationWeight * centerWeight;
    cluster.totalB += sample.b;
    cluster.totalG += sample.g;
    cluster.totalR += sample.r;
    clusters.set(key, cluster);
  }

  const rankedColors = Array.from(clusters.values())
    .filter((cluster) => cluster.count >= 4)
    .map((cluster) => ({
      b: cluster.totalB / cluster.count,
      g: cluster.totalG / cluster.count,
      r: cluster.totalR / cluster.count,
      score: cluster.score
    }))
    .sort((first, second) => second.score - first.score);

  const selected: Pick<PixelSample, "b" | "g" | "r">[] = [];

  for (const color of rankedColors) {
    if (selected.length >= 3) {
      break;
    }

    const isDistinct = selected.every((selectedColor) => colorDistance(color, selectedColor) > 44);

    if (isDistinct) {
      selected.push(color);
    }
  }

  for (const fallbackColor of fallback) {
    if (selected.length >= 3) {
      break;
    }

    const rgb = hexToRgb(fallbackColor);

    if (rgb && selected.every((selectedColor) => colorDistance(rgb, selectedColor) > 36)) {
      selected.push(rgb);
    }
  }

  const palette = selected.map(rgbToHex).slice(0, 3);
  return palette.length === 3 ? (palette as [string, string, string]) : fallback;
}

function detectFitProfile(
  foregroundSamples: PixelSample[],
  skinSamples: PixelSample[],
  width: number,
  height: number
): VisionFitProfile {
  const foregroundBounds = boundsFor(foregroundSamples);
  const skinBounds = boundsFor(skinSamples);
  const subjectWidthRatio = foregroundBounds
    ? (foregroundBounds.maxX - foregroundBounds.minX + 1) / width
    : 0.45;
  const foregroundCoverage = foregroundSamples.length / Math.max(width * height, 1);
  const faceAreaRatio = skinBounds
    ? ((skinBounds.maxX - skinBounds.minX + 1) * (skinBounds.maxY - skinBounds.minY + 1)) /
      Math.max(width * height, 1)
    : 0;

  if (faceAreaRatio > 0.15) {
    return subjectWidthRatio > 0.58 ? "relaxed" : "straight";
  }

  if (subjectWidthRatio > 0.76 || foregroundCoverage > 0.46) {
    return "oversized";
  }

  if (subjectWidthRatio > 0.58 || foregroundCoverage > 0.28) {
    return "relaxed";
  }

  if (subjectWidthRatio < 0.32 && foregroundCoverage < 0.2) {
    return "slim";
  }

  return "straight";
}

function getSignalRatios(
  skinSamples: PixelSample[],
  foregroundSamples: PixelSample[],
  width: number,
  height: number
) {
  const imageArea = Math.max(width * height, 1);

  return {
    foregroundRatio: foregroundSamples.length / imageArea,
    skinRatio: skinSamples.length / imageArea
  };
}

function hasWrongPhotoSignal(
  skinSamples: PixelSample[],
  foregroundSamples: PixelSample[],
  width: number,
  height: number
) {
  const { foregroundRatio, skinRatio } = getSignalRatios(
    skinSamples,
    foregroundSamples,
    width,
    height
  );

  return skinSamples.length < 12 && skinRatio < 0.012 && foregroundRatio < 0.08;
}

function clampDemographic(fallback: Demographic): VisionDemographic {
  return fallback;
}

function detectAgeBandFromImageSignal(seed: string): VisionAgeBand {
  const normalizedSeed = seed.toLowerCase();

  if (/(^|[^a-z])(student|college|campus|young|youth|genz)([^a-z]|$)/.test(normalizedSeed)) {
    return "young_adult";
  }

  if (/(^|[^a-z])(mature|senior|older|silver|midlife)([^a-z]|$)/.test(normalizedSeed)) {
    return "mature";
  }

  return "adult";
}

function detectBuildAndProportion(fitProfile: VisionFitProfile): VisionBuildAndProportion {
  if (fitProfile === "slim" || fitProfile === "straight") {
    return "lean_tapered";
  }

  if (fitProfile === "oversized") {
    return "relaxed";
  }

  return "broad_athletic";
}

function detectGroomingStateFromSignal(seed: string, demographic: VisionDemographic): VisionGroomingState {
  const normalizedSeed = seed.toLowerCase();

  if (/(^|[^a-z])(full beard|beard|bearded)([^a-z]|$)/.test(normalizedSeed)) {
    return "full_beard";
  }

  if (/(^|[^a-z])(stubble|moustache|mustache|shadow)([^a-z]|$)/.test(normalizedSeed)) {
    return "stubble_heavy_stubble";
  }

  if (/(^|[^a-z])(clean shaven|clean-shaven|shaved)([^a-z]|$)/.test(normalizedSeed)) {
    return "clean_shaven";
  }

  return demographic === "womenswear" ? "clean_shaven" : "stubble_heavy_stubble";
}

function detectHairstyleVolume(
  skinSamples: PixelSample[],
  foregroundSamples: PixelSample[],
  width: number,
  height: number
): VisionHairstyleVolume {
  const faceBounds = boundsFor(skinSamples.filter((sample) => sample.y < height * 0.72));
  const foregroundBounds = boundsFor(foregroundSamples);

  if (!faceBounds || !foregroundBounds) {
    return "medium";
  }

  const headTop = faceBounds.minY;
  const visibleHairSpace = Math.max(0, headTop - foregroundBounds.minY);
  const normalizedVolume = visibleHairSpace / Math.max(height, 1);

  if (normalizedVolume > 0.13 || foregroundBounds.maxX - foregroundBounds.minX > width * 0.7) {
    return "high";
  }

  if (normalizedVolume < 0.045) {
    return "low";
  }

  return "medium";
}

function scoreBrowserConfidence(
  skinSamples: PixelSample[],
  foregroundSamples: PixelSample[],
  width: number,
  height: number
) {
  const { foregroundRatio, skinRatio } = getSignalRatios(skinSamples, foregroundSamples, width, height);

  if (hasWrongPhotoSignal(skinSamples, foregroundSamples, width, height)) {
    return 24;
  }

  let confidence = 42;

  if (skinSamples.length >= 48) {
    confidence += 18;
  }

  if (skinRatio > 0.04) {
    confidence += 8;
  }

  if (foregroundRatio > 0.12) {
    confidence += 12;
  }

  if (foregroundRatio > 0.32) {
    confidence += 8;
  }

  if (width >= 110 && height >= 110) {
    confidence += 6;
  }

  if (skinSamples.length < 24) {
    confidence -= 10;
  }

  if (skinSamples.length < 24 && foregroundRatio < 0.16) {
    confidence -= 16;
  }

  return Math.max(35, Math.min(88, Math.round(confidence)));
}

function buildVisibleCues(
  skinSamples: PixelSample[],
  foregroundSamples: PixelSample[],
  dominantPalette: [string, string, string],
  width: number,
  height: number,
  undertone: VisionUndertone,
  fitProfile: VisionFitProfile
) {
  const { foregroundRatio } = getSignalRatios(skinSamples, foregroundSamples, width, height);

  if (hasWrongPhotoSignal(skinSamples, foregroundSamples, width, height)) {
    return [
      "wrong image for stylist",
      "no clear person detected",
      "upload portrait or full-body photo"
    ];
  }

  const faceCue = skinSamples.length >= 48 ? "face outline detected" : "limited face detail";
  const bodyCue = foregroundRatio > 0.28 ? "fuller body/clothing area visible" : "cropped upper-body signal";
  const colorCue = `dominant colors ${dominantPalette.slice(0, 2).join(" / ")}`;

  return [faceCue, colorCue, `${undertone} undertone + ${fitProfile} fit`, bodyCue].slice(0, 3);
}

export async function analyzeStylistPhoto(
  file: File,
  previewUrl: string,
  fallbackDemographic: Demographic
): Promise<VisionAnalysis> {
  const image = await loadUploadedImage(file, previewUrl);
  const maxSide = 160;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Browser image analysis is unavailable.");
  }

  context.drawImage(image, 0, 0, width, height);
  const data = context.getImageData(0, 0, width, height).data;
  const samples: PixelSample[] = [];
  const stride = width * height > 12000 ? 2 : 1;

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];

      if (alpha < 180) {
        continue;
      }

      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const { l, s } = rgbToHsl(r, g, b);
      samples.push({ b, g, l, r, s, x, y });
    }
  }

  const skinSamples = samples.filter((sample) => sample.y < height * 0.76 && isSkinLike(sample));
  const foregroundSamples = detectForeground(samples, width, height);
  const undertone = detectUndertone(skinSamples, samples);
  const faceShape = detectFaceShape(skinSamples, width, height);
  const fitProfile = detectFitProfile(foregroundSamples, skinSamples, width, height);
  const dominantPalette = getDominantForegroundPalette(foregroundSamples, undertone, height);
  const wrongPhotoSignal = hasWrongPhotoSignal(skinSamples, foregroundSamples, width, height);
  const fileSignal = `${file.name}-${file.size}-${file.lastModified}`.toLowerCase();
  const demographic =
    /(^|[^a-z])(female|woman|women|womens|womenswear|girl)([^a-z]|$)/.test(fileSignal)
      ? "womenswear"
      : /(^|[^a-z])(male|man|men|mens|menswear|boy)([^a-z]|$)/.test(fileSignal)
        ? "menswear"
        : fileSignal.includes("unisex")
          ? "unisex"
          : clampDemographic(fallbackDemographic);
  const ageBand = detectAgeBandFromImageSignal(fileSignal);
  const buildAndProportion = detectBuildAndProportion(fitProfile);
  const groomingState = detectGroomingStateFromSignal(fileSignal, demographic);
  const hairstyleVolume = detectHairstyleVolume(skinSamples, foregroundSamples, width, height);
  const profile = createVisionProfile({
    age_band: ageBand,
    demographic,
    detected_face_shape: faceShape,
    primary_color_undertone: undertone,
    recommended_color_palette: dominantPalette,
    suggested_fit_profile: fitProfile
  });

  return createVisionAnalysis({
    ...profile,
    analysis_confidence: scoreBrowserConfidence(skinSamples, foregroundSamples, width, height),
    avoid_notes: wrongPhotoSignal
      ? [
          "Upload a clear portrait or full-body photo with face and outfit visible.",
          "Avoid product-only, scenery, document, or very dark photos in the Stylist."
        ]
      : [
          `Avoid pieces outside the ${demographic} wardrobe profile unless they are clearly unisex.`,
          `Avoid colors that fight the detected photo palette ${dominantPalette.join(", ")}.`
        ],
    build_and_proportion: buildAndProportion,
    dominant_color: dominantPalette[0],
    extracted_palette: dominantPalette,
    grooming_state: groomingState,
    grooming_strategy:
      wrongPhotoSignal
        ? "Grooming cannot be read from this image because no clear face profile was detected."
        : demographic === "womenswear"
        ? `${faceShape} face structure works best with balanced face-framing hair and controlled volume.`
        : `${faceShape} face structure works best with grooming that sharpens the jaw and keeps side volume controlled.`,
    hairstyle_volume: hairstyleVolume,
    outfit_strategy: wrongPhotoSignal
      ? "This image is not suitable for a personal styling scan. Upload a clear portrait or full-body outfit photo."
      : `Prioritize ${fitProfile} ${demographic} pieces that match the detected photo palette ${dominantPalette.join(", ")}, then filter by the selected occasion and season.`,
    visible_cues: buildVisibleCues(
      skinSamples,
      foregroundSamples,
      dominantPalette,
      width,
      height,
      undertone,
      fitProfile
    )
  });
}
