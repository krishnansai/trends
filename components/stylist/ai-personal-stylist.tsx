"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  Loader2,
  Palette,
  RotateCcw,
  Ruler,
  Scissors,
  ShieldCheck,
  Sparkles,
  Upload,
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
  demographic: VisionDemographic;
  faceShape: FaceShape;
  grooming: GroomingRecommendationSet;
  occasion: StylingOccasion;
  recommendations: OutfitRecommendation[];
  season: StylingSeason;
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
  const [visionProfile, setVisionProfile] = useState<VisionProfile | null>(null);
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
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
  const groomingCards = useMemo<GroomingRecommendation[]>(() => {
    return [grooming.hairstyle, grooming.beard].filter(
      (card): card is GroomingRecommendation => Boolean(card)
    );
  }, [grooming]);

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
      setGrooming({ beard: null, hairstyle: null });
      setIsReady(false);
    } finally {
      setIsScanning(false);
    }
  }

  async function startScan(file: File, nextPreviewUrl = previewUrl) {
    const scanRun = scanRunRef.current + 1;
    scanRunRef.current = scanRun;
    setRecommendations([]);
    setGrooming({ beard: null, hairstyle: null });
    setRecommendationError("");
    setIsReady(false);
    setIsScanning(true);

    try {
      const nextVisionProfile = await analyzeStylistPhoto(file, nextPreviewUrl, selectedDemographic);

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
    setVisionProfile(null);
    setRecommendations([]);
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
    <section className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-muted-foreground">AI Personal Stylist</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Trend-aware outfit matcher</h1>
        </div>
        <div className="flex items-center gap-3">
          {isUsingSampleData ? <Badge>Sample data</Badge> : <Badge>Original data</Badge>}
          <Badge>{archiveLookCount} archive looks</Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="border border-border bg-background p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Profile Input</p>
              <h2 className="mt-1 text-2xl font-semibold">Photo scan</h2>
            </div>
            <div className="grid size-11 place-items-center border border-border">
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

            <Label htmlFor="stylist-photo">Full-body or portrait photo</Label>
            <input
              id="stylist-photo"
              type="file"
              accept="image/*"
              ref={photoInputRef}
              className="mt-2 block w-full rounded-md border border-input bg-background text-sm text-foreground shadow-[0_1px_0_hsl(0_0%_100%/0.9)_inset,0_10px_26px_-24px_hsl(var(--foreground)/0.45)] file:mr-3 file:h-11 file:border-0 file:border-r file:border-border file:bg-muted file:px-4 file:text-sm file:font-semibold file:text-foreground"
              onChange={handleUpload}
            />
            <div
              className={cn(
                "relative mt-3 flex min-h-[420px] flex-col items-center justify-center overflow-hidden border border-dashed border-input bg-muted/45 p-5 text-center transition-colors",
                previewUrl ? "border-solid bg-background" : ""
              )}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uploaded styling profile"
                  className="h-full max-h-[620px] w-full object-contain"
                />
              ) : (
                <>
                  <span className="grid size-12 place-items-center border border-border bg-background">
                    <Upload className="size-5" />
                  </span>
                  <span className="mt-3 text-sm font-medium">Select a photo above</span>
                  <span className="mt-1 text-xs text-muted-foreground">Native file picker works best on mobile</span>
                </>
              )}

              {isScanning ? (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/45 p-6 text-background backdrop-blur-sm">
                  <div className="absolute inset-x-0 top-0 h-24 bg-background/25 scan-sweep" />
                  <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                    <Loader2 className="size-10 animate-spin" />
                    <div>
                      <p className="font-semibold">Scanning Profile...</p>
                      <p className="mt-1 text-sm text-background/80">
                        Detecting wardrobe profile, face shape, tone, and fit direction
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

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
              <p className="truncate text-sm text-muted-foreground">
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
                  {photoSeed ? "Analyze photo" : "Choose photo"}
                </Button>
                <Button type="button" variant="outline" onClick={handleReset}>
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
            </div>

            {recommendationError ? (
              <div className="mt-4 border border-border bg-muted/35 p-3 text-sm">
                {recommendationError}
              </div>
            ) : null}
          </div>
        </section>

        {isReady ? (
          <section className="border border-border bg-background p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-sm text-muted-foreground">Styling Output</p>
                <h2 className="mt-1 text-2xl font-semibold">Your Profile Analysis</h2>
              </div>
              <Badge>{ARCHIVE_END_YEAR} trend forecast</Badge>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="border border-border bg-muted/35 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Palette className="size-4" />
                  Dominant color tones
                </div>
                <p className="mt-3 text-base leading-7">{profile.dominantTones}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {profilePalette.map((color) => (
                    <div
                      key={color}
                      className="h-12 border border-border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="border border-border bg-muted/35 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Ruler className="size-4" />
                  Suggested fit type
                </div>
                <p className="mt-3 text-base leading-7">
                  {visionProfile ? titleCase(visionProfile.suggested_fit_profile) : profile.fitType}
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  {visionProfile
                    ? `${titleCase(visionProfile.primary_color_undertone)} undertone`
                    : profile.title}
                </p>
              </div>

              <div className="border border-border bg-muted/35 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="size-4" />
                  Wardrobe profile
                </div>
                <p className="mt-3 text-base leading-7">
                  {detectedDemographic ? demographicLabels[detectedDemographic] : "Unclassified"}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
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

              <div className="border border-border bg-muted/35 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Scissors className="size-4" />
                  Face shape
                </div>
                <p className="mt-3 text-base leading-7">
                  {detectedFaceShape ? `${titleCase(detectedFaceShape)} face` : "Unclassified"}
                </p>
                <p className="mt-4 text-sm text-muted-foreground">Grooming match input</p>
              </div>

              <div className="border border-border bg-muted/35 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="size-4" />
                  Context
                </div>
                <p className="mt-3 text-base leading-7">
                  {occasionOptions.find((option) => option.value === selectedOccasion)?.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {seasonOptions.find((option) => option.value === selectedSeason)?.label}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">Trending Matches for You</h3>
                <Badge>{recommendations.length} outfits</Badge>
              </div>

              {recommendations.length ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {recommendations.map((recommendation) => (
                  <article
                    key={recommendation.id}
                    className="overflow-hidden border border-border bg-background"
                  >
                    <div className="aspect-[4/5] bg-muted">
                      <img
                        src={recommendation.garment.image_url}
                        alt={recommendation.garment.description}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-4 p-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {recommendation.garment.year} - {titleCase(recommendation.garment.category)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold">{recommendation.title}</h4>
                          <Badge className="bg-muted">
                            {demographicLabels[recommendation.garment.demographic]}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {recommendation.garment.style_tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} className="bg-muted">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        {recommendation.supportPieces.map((piece) => (
                          <p key={piece} className="flex items-start gap-2">
                            <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                            <span>{piece}</span>
                          </p>
                        ))}
                      </div>

                      <p className="border-t border-border pt-3 text-xs font-medium">
                        {recommendation.trendSignal}
                      </p>
                    </div>
                  </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 border border-border bg-muted/35 p-4 text-sm text-muted-foreground">
                  No eligible outfits found after applying the demographic guardrail.
                </div>
              )}
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">2026 Grooming Architecture</h3>
                <Badge>{groomingCards.length} styles</Badge>
              </div>

              {groomingCards.length ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {groomingCards.map((card) => (
                    <article
                      key={card.id}
                      className="overflow-hidden border border-border bg-background"
                    >
                      <div className="aspect-[16/10] bg-muted">
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-4 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-muted">{titleCase(card.category)}</Badge>
                          <Badge>{titleCase(card.matchedFaceShape)} face</Badge>
                          {card.maintenanceLevel ? (
                            <Badge className="bg-muted">{card.maintenanceLevel}</Badge>
                          ) : null}
                        </div>

                        <div>
                          <h4 className="text-base font-semibold">{card.title}</h4>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {card.description}
                          </p>
                        </div>

                        <p className="border-t border-border pt-3 text-sm leading-6">
                          {card.rationale}
                        </p>

                        <a
                          href={card.affiliateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ className: "w-full" })}
                        >
                          <ExternalLink className="size-4" />
                          Get Styling Product
                        </a>
                        <p className="text-xs text-muted-foreground">{card.product.name}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 border border-border bg-muted/35 p-4 text-sm text-muted-foreground">
                  No grooming matches found for this face shape.
                </div>
              )}
            </div>

            <div className="mt-6 border border-border bg-muted/35 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4" />
                Rationale
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{profile.rationale}</p>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
