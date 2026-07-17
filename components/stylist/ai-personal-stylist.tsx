"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  RotateCcw,
  Sparkles,
  Upload,
  Wand2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { analyzeStylistPhoto } from "@/lib/photo-analysis";
import {
  bodyArchitectureLabels,
  getStyleProfile,
  type BodyArchitecture,
  type GroomingRecommendation,
  type GroomingRecommendationSet,
  type OutfitRecommendation,
  type StyleProfileId
} from "@/lib/stylist";
import type { Demographic, FaceShape, StylingOccasion, StylingSeason } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  type VisionAnalysis,
  type VisionDemographic
} from "@/lib/vision";

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
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

type RecommendationResponse = {
  bodyArchitecture: BodyArchitecture;
  contextWarning?: string;
  demographic: VisionDemographic;
  faceShape: FaceShape;
  grooming: GroomingRecommendationSet;
  occasion: StylingOccasion;
  recommendations: OutfitRecommendation[];
  season: StylingSeason;
  visionData: VisionAnalysis;
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

  return pickFeedbackCopy(profile, [
    {
      message: `Nice photo. I can read your ${profile.primary_color_undertone} color direction, ${profile.suggested_fit_profile} fit, and ${demographicLabels[profile.demographic]} wardrobe profile.`,
      title: "Looks ready for styling",
      tone: "positive"
    },
    {
      message: `Looks sharp. The scan has enough face, color, and proportion cues for a cleaner ${demographicLabels[profile.demographic]} recommendation.`,
      title: "Strong profile read",
      tone: "positive"
    },
    {
      message: `Good upload. The stylist can now match color palette, fit profile, and grooming direction with better confidence.`,
      title: "Profile scan is clean",
      tone: "positive"
    },
    {
      message: `This works well. The visible tones and proportions are clear enough for a personalized outfit match.`,
      title: "Style cues detected",
      tone: "positive"
    },
    {
      message: `Nice profile shot. The image gives enough detail to filter by wardrobe profile, season, and occasion.`,
      title: "Ready to style",
      tone: "positive"
    }
  ]);
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
  const selectedDemographic: VisionDemographic = "menswear";
  const [selectedOccasion, setSelectedOccasion] = useState<StylingOccasion>("mall");
  const [selectedSeason, setSelectedSeason] = useState<StylingSeason>("summer");
  const [selectedBodyArchitecture, setSelectedBodyArchitecture] =
    useState<BodyArchitecture>("athletic_tapered");
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
  const [scanStatusIndex, setScanStatusIndex] = useState(0);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photoFileRef = useRef<File | null>(null);
  const scanRunRef = useRef(0);

  const profile = useMemo(() => getStyleProfile(profileId), [profileId]);
  const profilePalette = visionProfile?.recommended_color_palette ?? [
    profile.palette[0],
    profile.palette[1],
    profile.palette[2]
  ];
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
  const wardrobeProfileLabel = detectedDemographic
    ? demographicLabels[detectedDemographic]
    : "Unclassified";
  const faceShapeLabel = detectedFaceShape ? `${titleCase(detectedFaceShape)} face` : "Unclassified";
  const fitProfileLabel = visionProfile
    ? titleCase(visionProfile.suggested_fit_profile)
    : profile.fitType;
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

  async function loadRecommendations(
    nextVisionProfile: VisionAnalysis,
    nextOccasion = selectedOccasion,
    nextSeason = selectedSeason,
    nextBodyArchitecture = selectedBodyArchitecture
  ) {
    setRecommendationError("");

    try {
      const response = await fetch("/api/stylist/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          bodyArchitecture: nextBodyArchitecture,
          occasion: nextOccasion,
          season: nextSeason,
          visionData: nextVisionProfile
        })
      });

      if (!response.ok) {
        throw new Error("Unable to load guarded recommendations.");
      }

      const data = (await response.json()) as RecommendationResponse;
      setRecommendations(data.recommendations);
      setContextWarning(data.contextWarning ?? "");
      setDetectedDemographic(data.demographic);
      setDetectedFaceShape(data.faceShape);
      setGrooming(data.grooming);
      setProfileId(data.visionData.primary_color_undertone);
      setVisionProfile(data.visionData);
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
    } catch (error) {
      console.error(error);
      return fallbackProfile;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function startScan(file: File, nextPreviewUrl = previewUrl) {
    const scanRun = scanRunRef.current + 1;
    scanRunRef.current = scanRun;
    setRecommendations([]);
    setContextWarning("");
    setGrooming({ beard: null, hairstyle: null });
    setRecommendationError("");
    setPhotoFeedback(null);
    setIsReady(false);
    setScanStatusIndex(0);
    setIsScanning(true);

    try {
      const fallbackVisionProfile = await analyzeStylistPhoto(file, nextPreviewUrl, selectedDemographic);
      const fallbackBodyArchitecture = inferBodyArchitecture(fallbackVisionProfile);
      setProfileId(fallbackVisionProfile.primary_color_undertone);
      setDetectedDemographic(fallbackVisionProfile.demographic);
      setDetectedFaceShape(fallbackVisionProfile.detected_face_shape);
      setSelectedBodyArchitecture(fallbackBodyArchitecture);
      setVisionProfile(fallbackVisionProfile);

      const nextVisionProfile = await refinePhotoAnalysis(file, fallbackVisionProfile);
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
        selectedSeason,
        nextBodyArchitecture
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
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(nextPreviewUrl);
    setUploadName(file.name);
    photoFileRef.current = file;
    void startScan(file, nextPreviewUrl);
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
    setSelectedOccasion("mall");
    setSelectedSeason("summer");
    setSelectedBodyArchitecture("athletic_tapered");
    setDetectedDemographic(null);
    setDetectedFaceShape(null);
    setVisionProfile(null);
    setRecommendations([]);
    setContextWarning("");
    setGrooming({ beard: null, hairstyle: null });
    setRecommendationError("");
    setPhotoFeedback(null);
    setScanStatusIndex(0);

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  function handleOccasionChange(nextOccasion: StylingOccasion) {
    setSelectedOccasion(nextOccasion);

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
      nextOccasion,
      selectedSeason,
      selectedBodyArchitecture
    );
  }

  function handleSeasonChange(nextSeason: StylingSeason) {
    setSelectedSeason(nextSeason);

    if (!visionProfile) {
      return;
    }

    setRecommendations([]);
    setGrooming({ beard: null, hairstyle: null });
    setIsReady(false);
    setIsScanning(true);
    void loadRecommendations(
      visionProfile,
      selectedOccasion,
      nextSeason,
      selectedBodyArchitecture
    );
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
            <div
              className={cn(
                "relative flex min-h-[500px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-[#BDAE9A] bg-[#F8F3EB] p-5 text-center transition-all duration-300 hover:border-[#7B5637] hover:bg-[#F3E8DA] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#8A6A4F]/25",
                previewUrl ? "border-solid border-[#D8CCBB] bg-white p-3 shadow-sm" : "",
                isScanning ? "pointer-events-none cursor-wait" : ""
              )}
              aria-label={previewUrl ? "Change styling profile photo" : "Select styling profile photo"}
              aria-disabled={isScanning}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                id="stylist-photo"
                type="file"
                accept="image/*"
                ref={photoInputRef}
                className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
                disabled={isScanning}
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

            {previewUrl ? (
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

            <div className="mt-5 rounded-md border border-[#D8CCBB] bg-white/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                {occasionOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selectedOccasion === option.value ? "default" : "outline"}
                    size="sm"
                    aria-pressed={selectedOccasion === option.value}
                    onClick={() => handleOccasionChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {seasonOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selectedSeason === option.value ? "default" : "outline"}
                    size="sm"
                    aria-pressed={selectedSeason === option.value}
                    onClick={() => handleSeasonChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

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
                <h2 className="mt-2 text-2xl font-light text-neutral-950">Your style match</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{recommendations.length} looks</Badge>
              </div>
            </div>

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
                <Badge>{selectedOccasionLabel}</Badge>
                <Badge>{selectedSeasonLabel}</Badge>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-light text-neutral-950">Trending Matches for You</h3>
                <Badge>{recommendations.length} outfits</Badge>
              </div>

              {recommendations.length ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {recommendations.map((recommendation) => (
                  <article
                    key={recommendation.id}
                    className="group overflow-hidden border border-[#D8CCBB] bg-white"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#EEE5D7]">
                      <img
                        src={recommendation.garment.image_url}
                        alt={recommendation.garment.description}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <Badge className="bg-white/90 text-[#3A2A1E]">
                          {recommendation.garment.demographic} • {selectedSeason}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4 p-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                          {recommendation.garment.year} - {titleCase(recommendation.garment.category)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-medium text-neutral-950">{recommendation.title}</h4>
                          <Badge>
                            {demographicLabels[recommendation.garment.demographic]}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {recommendation.garment.style_tags.slice(0, 2).map((tag) => (
                          <Badge key={tag}>
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="border border-[#D8CCBB] bg-[#FBF7F0] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                          Why this fits you
                        </p>
                        <p className="mt-2 text-xs leading-5 text-neutral-700">
                          {recommendation.fitReason}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm text-neutral-600">
                        {recommendation.supportPieces.map((piece) => (
                          <p key={piece} className="flex items-start gap-2">
                            <Check className="mt-0.5 size-4 shrink-0 text-[#7B5637]" />
                            <span>{piece}</span>
                          </p>
                        ))}
                      </div>

                      <p className="border-t border-[#D8CCBB] pt-3 text-xs font-medium text-neutral-700">
                        {recommendation.trendSignal}
                      </p>
                    </div>
                  </article>
                  ))}
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
                  {groomingCards.map((card) => (
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
                  ))}
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
    </section>
  );
}
