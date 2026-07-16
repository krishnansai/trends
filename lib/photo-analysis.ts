import type { Demographic } from "@/lib/types";
import {
  createVisionProfile,
  type VisionAgeBand,
  type VisionDemographic,
  type VisionFitProfile,
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

export async function analyzeStylistPhoto(
  file: File,
  previewUrl: string,
  fallbackDemographic: Demographic
): Promise<VisionProfile> {
  const image = await loadImage(previewUrl);
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
  const fileSignal = `${file.name}-${file.size}-${file.lastModified}`.toLowerCase();
  const demographic =
    /(^|[^a-z])(female|woman|women|womens|womenswear|girl)([^a-z]|$)/.test(fileSignal)
      ? "womenswear"
      : /(^|[^a-z])(male|man|men|mens|menswear|boy)([^a-z]|$)/.test(fileSignal)
        ? "menswear"
          : fileSignal.includes("unisex")
            ? "unisex"
            : clampDemographic(fallbackDemographic);

  return createVisionProfile({
    age_band: detectAgeBandFromImageSignal(fileSignal),
    demographic,
    detected_face_shape: faceShape,
    primary_color_undertone: undertone,
    recommended_color_palette: paletteByUndertone[undertone],
    suggested_fit_profile: fitProfile
  });
}
