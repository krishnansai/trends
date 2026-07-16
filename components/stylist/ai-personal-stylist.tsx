"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Loader2,
  Palette,
  RotateCcw,
  Ruler,
  Scissors,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Wand2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ARCHIVE_END_YEAR } from "@/lib/archive-window";
import { analyzeStylistPhoto } from "@/lib/photo-analysis";
import {
  getStyleProfile,
  type GroomingRecommendation,
  type GroomingRecommendationSet,
  type OutfitRecommendation,
  type StyleProfileId
} from "@/lib/stylist";
import type { Demographic, FaceShape, StylingOccasion, StylingSeason } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  createVisionProfile,
  type VisionAgeBand,
  type VisionDemographic,
  type VisionProfile
} from "@/lib/vision";

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

const demographicLabels: Record<Demographic, string> = {
  menswear: "Menswear",
  womenswear: "Womenswear",
  unisex: "Unisex"
};

const ageBandLabels: Record<VisionAgeBand, string> = {
  adult: "Adult",
  mature: "Mature",
  young_adult: "Young adult"
};

const stylistDemographics = ["menswear", "womenswear", "unisex"] as const satisfies readonly VisionDemographic[];

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

type RecommendationResponse = {
  contextWarning?: string;
  demographic: VisionDemographic;
  faceShape: FaceShape;
  grooming: GroomingRecommendationSet;
  occasion: StylingOccasion;
  recommendations: OutfitRecommendation[];
  season: StylingSeason;
  visionData: VisionProfile;
};

type PhotoAnalysisResponse = {
  enabled: boolean;
  error?: string;
  model: string | null;
  source: "browser-fallback" | "ollama";
  visionData: VisionProfile;
};

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
  const [selectedDemographic, setSelectedDemographic] = useState<VisionDemographic>("menswear");
  const [selectedOccasion, setSelectedOccasion] = useState<StylingOccasion>("mall");
  const [selectedSeason, setSelectedSeason] = useState<StylingSeason>("summer");
  const [detectedDemographic, setDetectedDemographic] = useState<VisionDemographic | null>(null);
  const [detectedFaceShape, setDetectedFaceShape] = useState<FaceShape | null>(null);
  const [analysisSource, setAnalysisSource] = useState<PhotoAnalysisResponse["source"]>("browser-fallback");
  const [analysisModel, setAnalysisModel] = useState<string | null>(null);
  const [visionProfile, setVisionProfile] = useState<VisionProfile | null>(null);
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [contextWarning, setContextWarning] = useState("");
  const [grooming, setGrooming] = useState<GroomingRecommendationSet>({
    beard: null,
    hairstyle: null
  });
  const [recommendationError, setRecommendationError] = useState("");
  const [photoSeed, setPhotoSeed] = useState("");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photoFileRef = useRef<File | null>(null);
  const scanRunRef = useRef(0);

  const profile = useMemo(() => getStyleProfile(profileId), [profileId]);
  const profilePalette = visionProfile?.recommended_color_palette ?? [
    profile.palette[0],
    profile.palette[1],
    profile.palette[2]
  ];
  const analysisSourceLabel =
    analysisSource === "ollama"
      ? `Ollama${analysisModel ? ` ${analysisModel}` : ""}`
      : "Browser analysis";
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
  const wardrobeProfileLabel = detectedDemographic
    ? demographicLabels[detectedDemographic]
    : "Unclassified";
  const faceShapeLabel = detectedFaceShape ? `${titleCase(detectedFaceShape)} face` : "Unclassified";
  const fitProfileLabel = visionProfile
    ? titleCase(visionProfile.suggested_fit_profile)
    : profile.fitType;
  const undertoneLabel = visionProfile
    ? `${titleCase(visionProfile.primary_color_undertone)} undertone`
    : profile.title;
  const ageBandLabel = visionProfile ? ageBandLabels[visionProfile.age_band] : "Adult";

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function loadRecommendations(
    nextVisionProfile: VisionProfile,
    nextOccasion = selectedOccasion,
    nextSeason = selectedSeason
  ) {
    setRecommendationError("");

    try {
      const response = await fetch("/api/stylist/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
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

  async function refinePhotoAnalysis(file: File, fallbackProfile: VisionProfile) {
    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("age_band", fallbackProfile.age_band);
      formData.append("demographic", fallbackProfile.demographic);
      formData.append("detected_face_shape", fallbackProfile.detected_face_shape);
      formData.append("primary_color_undertone", fallbackProfile.primary_color_undertone);
      formData.append("suggested_fit_profile", fallbackProfile.suggested_fit_profile);
      formData.append(
        "recommended_color_palette",
        JSON.stringify(fallbackProfile.recommended_color_palette)
      );

      const response = await fetch("/api/stylist/analyze", {
        body: formData,
        method: "POST"
      });

      if (!response.ok) {
        return fallbackProfile;
      }

      const data = (await response.json()) as PhotoAnalysisResponse;
      setAnalysisSource(data.source);
      setAnalysisModel(data.model);

      return data.visionData;
    } catch (error) {
      console.error(error);
      setAnalysisSource("browser-fallback");
      setAnalysisModel(null);
      return fallbackProfile;
    }
  }

  async function startScan(file: File, nextPreviewUrl = previewUrl) {
    const scanRun = scanRunRef.current + 1;
    scanRunRef.current = scanRun;
    setRecommendations([]);
    setContextWarning("");
    setGrooming({ beard: null, hairstyle: null });
    setRecommendationError("");
    setIsReady(false);
    setIsScanning(true);

    try {
      const fallbackVisionProfile = await analyzeStylistPhoto(file, nextPreviewUrl, selectedDemographic);
      const nextVisionProfile = await refinePhotoAnalysis(file, fallbackVisionProfile);

      if (scanRun !== scanRunRef.current) {
        return;
      }

      setProfileId(nextVisionProfile.primary_color_undertone);
      setDetectedDemographic(nextVisionProfile.demographic);
      setDetectedFaceShape(nextVisionProfile.detected_face_shape);
      setVisionProfile(nextVisionProfile);
      await loadRecommendations(nextVisionProfile, selectedOccasion, selectedSeason);
    } catch (error) {
      console.error(error);

      if (scanRun !== scanRunRef.current) {
        return;
      }

      setRecommendationError("Photo analysis could not read this image. Try a clearer portrait or full-body photo.");
      setRecommendations([]);
      setGrooming({ beard: null, hairstyle: null });
      setIsReady(false);
      setIsScanning(false);
    }
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    const nextPhotoSeed = `${file.name}-${file.size}-${file.lastModified}`;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(nextPreviewUrl);
    setUploadName(file.name);
    setPhotoSeed(nextPhotoSeed);
    photoFileRef.current = file;
    void startScan(file, nextPreviewUrl);
  }

  function handleReset() {
    setPreviewUrl("");
    setUploadName("");
    setPhotoSeed("");
    photoFileRef.current = null;
    scanRunRef.current += 1;
    setIsScanning(false);
    setIsReady(false);
    setProfileId("neutral");
    setSelectedDemographic("menswear");
    setSelectedOccasion("mall");
    setSelectedSeason("summer");
    setDetectedDemographic(null);
    setDetectedFaceShape(null);
    setAnalysisSource("browser-fallback");
    setAnalysisModel(null);
    setVisionProfile(null);
    setRecommendations([]);
    setContextWarning("");
    setGrooming({ beard: null, hairstyle: null });
    setRecommendationError("");

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  function handleDemographicOverride(nextDemographic: VisionDemographic) {
    setSelectedDemographic(nextDemographic);
    setDetectedDemographic(nextDemographic);

    const nextVisionProfile = createVisionProfile({
      ...(visionProfile ?? createVisionProfile({})),
      demographic: nextDemographic
    });
    setVisionProfile(nextVisionProfile);
    setRecommendations([]);
    setContextWarning("");
    setGrooming({ beard: null, hairstyle: null });
    setIsReady(false);
    setIsScanning(true);
    void loadRecommendations(nextVisionProfile, selectedOccasion, selectedSeason);
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
    void loadRecommendations(visionProfile, nextOccasion, selectedSeason);
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
    void loadRecommendations(visionProfile, selectedOccasion, nextSeason);
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
            <div className="mb-5">
              <Label>Wardrobe profile</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {stylistDemographics.map((demographic) => (
                  <Button
                    key={demographic}
                    type="button"
                    variant={selectedDemographic === demographic ? "default" : "outline"}
                    size="sm"
                    aria-pressed={selectedDemographic === demographic}
                    onClick={() => setSelectedDemographic(demographic)}
                  >
                    {demographicLabels[demographic]}
                  </Button>
                ))}
              </div>
            </div>

            <input
              id="stylist-photo"
              type="file"
              accept="image/*"
              ref={photoInputRef}
              className="sr-only"
              onChange={handleUpload}
            />
            <button
              type="button"
              className={cn(
                "relative mt-3 flex min-h-[420px] w-full flex-col items-center justify-center overflow-hidden border border-dashed border-[#BDAE9A] bg-[#F6F0E6] p-5 text-center transition-all duration-300 hover:border-[#7B5637] hover:bg-[#F0E5D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6A4F]/25 disabled:cursor-wait",
                previewUrl ? "border-solid border-[#D8CCBB] bg-white" : ""
              )}
              disabled={isScanning}
              aria-label={previewUrl ? "Change styling profile photo" : "Select styling profile photo"}
              onClick={() => photoInputRef.current?.click()}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uploaded styling profile"
                  className="h-full max-h-[620px] w-full object-contain"
                />
              ) : (
                <>
                  <span className="grid size-12 place-items-center border border-[#D8CCBB] bg-white/70">
                    <Upload className="size-5" />
                  </span>
                  <span className="mt-3 text-sm font-medium uppercase tracking-[0.16em] text-neutral-800">
                    Select a photo
                  </span>
                  <span className="mt-1 text-xs text-neutral-500">
                    Portrait or full-body image works best
                  </span>
                </>
              )}

              {isScanning ? (
                <div className="absolute inset-0 overflow-hidden bg-stone-950/45 p-6 text-neutral-950 backdrop-blur-[2px]">
                  <div className="scan-sweep absolute inset-x-0 top-0 h-24" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
                  <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 text-center">
                    <div className="h-px w-40 bg-gradient-to-r from-transparent via-white to-transparent" />
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.26em] text-neutral-700">
                        ANALYZING AESTHETIC PROFILE & FACIAL STRUCTURE...
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-neutral-500">
                        Tone / Fit / Context / Grooming Matrix
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </button>

            <div className="mt-5 grid gap-4">
              <div>
                <Label>Occasion</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
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
              </div>

              <div>
                <Label>Season</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
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
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="truncate text-sm text-neutral-500">
                {uploadName || "No profile photo selected"}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isScanning}
                  onClick={() => {
                    if (photoSeed) {
                      if (photoFileRef.current) {
                        void startScan(photoFileRef.current);
                      }
                      return;
                    }

                    photoInputRef.current?.click();
                  }}
                >
                  {isScanning ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : photoSeed ? (
                    <Sparkles className="size-4" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {photoSeed ? "Analyze photo" : "Select photo"}
                </Button>
                <Button type="button" variant="outline" onClick={handleReset}>
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
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
                  Styling Output
                </p>
                <h2 className="mt-2 text-2xl font-light text-neutral-950">Profile analysis</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Analysis ready</Badge>
                <Badge>{analysisSourceLabel}</Badge>
                <Badge>{ARCHIVE_END_YEAR} trend forecast</Badge>
              </div>
            </div>

            <div className="mt-6 overflow-hidden border border-[#D8CCBB] bg-white/70">
              <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
                <div className="border-b border-[#D8CCBB] p-5 lg:border-b-0 lg:border-r lg:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                        Style DNA
                      </p>
                      <h3 className="mt-3 text-2xl font-light leading-tight text-neutral-950">
                        {wardrobeProfileLabel} · {ageBandLabel} · {fitProfileLabel}
                      </h3>
                    </div>
                    <div className="grid size-11 shrink-0 place-items-center border border-[#D8CCBB] bg-white/70">
                      <Sparkles className="size-5 text-neutral-800" />
                    </div>
                  </div>

                  <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-600">
                    The scan matched your profile to {undertoneLabel.toLowerCase()}, a {fitProfileLabel.toLowerCase()} fit direction, a {ageBandLabel.toLowerCase()} styling band, and a {selectedOccasionLabel.toLowerCase()} / {selectedSeasonLabel.toLowerCase()} context.
                  </p>

                  <div className="mt-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600">
                      <Palette className="size-4" />
                      Recommended palette
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {profilePalette.map((color) => (
                        <div
                          key={color}
                          className="flex h-14 items-end border border-[#D8CCBB] p-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/80 shadow-inner"
                          style={{ backgroundColor: color }}
                          title={color}
                        >
                          {color}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-neutral-600">{profile.dominantTones}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-[#D8CCBB] lg:grid-cols-3">
                  <div className="bg-white/70 p-4">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      <Ruler className="size-4" />
                      Fit
                    </div>
                    <p className="mt-3 text-sm font-medium text-neutral-950">{fitProfileLabel}</p>
                    <p className="mt-1 text-xs text-neutral-500">{undertoneLabel}</p>
                  </div>

                  <div className="bg-white/70 p-4">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      <ShieldCheck className="size-4" />
                      Wardrobe
                    </div>
                    <p className="mt-3 text-sm font-medium text-neutral-950">{wardrobeProfileLabel}</p>
                    <p className="mt-1 text-xs text-neutral-500">Guardrail active</p>
                  </div>

                  <div className="bg-white/70 p-4">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      <UserRound className="size-4" />
                      Style band
                    </div>
                    <p className="mt-3 text-sm font-medium text-neutral-950">{ageBandLabel}</p>
                    <p className="mt-1 text-xs text-neutral-500">Broad fit signal</p>
                  </div>

                  <div className="bg-white/70 p-4">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      <Scissors className="size-4" />
                      Face
                    </div>
                    <p className="mt-3 text-sm font-medium text-neutral-950">{faceShapeLabel}</p>
                    <p className="mt-1 text-xs text-neutral-500">Grooming input</p>
                  </div>

                  <div className="bg-white/70 p-4">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      <Sparkles className="size-4" />
                      Context
                    </div>
                    <p className="mt-3 text-sm font-medium text-neutral-950">{selectedOccasionLabel}</p>
                    <p className="mt-1 text-xs text-neutral-500">{selectedSeasonLabel}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#D8CCBB] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    Wardrobe override
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Change only when the scan selected the wrong shopping section.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {stylistDemographics.map((demographic) => (
                    <Button
                      key={demographic}
                      type="button"
                      variant={detectedDemographic === demographic ? "default" : "outline"}
                      size="sm"
                      aria-pressed={detectedDemographic === demographic}
                      onClick={() => handleDemographicOverride(demographic)}
                    >
                      {demographicLabels[demographic]}
                    </Button>
                  ))}
                </div>
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
                <h3 className="text-xl font-light text-neutral-950">2026 Grooming Architecture</h3>
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
