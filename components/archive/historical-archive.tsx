"use client";

import { ArrowUpRight, Filter, Gauge, ImageOff, TrendingUp, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { ARCHIVE_END_YEAR, ARCHIVE_START_YEAR } from "@/lib/archive-window";
import type { Demographic, Garment, Trend } from "@/lib/types";
import { cn } from "@/lib/utils";

const yearMin = ARCHIVE_START_YEAR;
const yearMax = ARCHIVE_END_YEAR;

type ArchiveView = "archive" | "forecast";

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const demographicLabels: Record<Demographic, string> = {
  menswear: "Menswear",
  unisex: "Unisex",
  womenswear: "Womenswear"
};

function ArchiveImage({
  alt,
  className,
  label,
  src
}: {
  alt: string;
  className?: string;
  label: string;
  src: string;
}) {
  const [hasError, setHasError] = useState(!src);

  if (hasError) {
    return (
      <div
        className={cn(
          "grid h-full min-h-full w-full place-items-center bg-[#EEE5D7] p-5 text-center",
          className
        )}
      >
        <div>
          <div className="mx-auto grid size-12 place-items-center border border-[#D8CCBB] bg-white/70">
            <ImageOff className="size-5 text-neutral-500" />
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Image unavailable
          </p>
          <p className="mt-2 text-sm font-medium text-neutral-800">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
}

export function HistoricalArchive({
  garments,
  isUsingSampleData,
  trends
}: {
  garments: Garment[];
  isUsingSampleData: boolean;
  trends: Trend[];
}) {
  const [view, setView] = useState<ArchiveView>("archive");
  const [fromYear, setFromYear] = useState(yearMin);
  const [toYear, setToYear] = useState(yearMax);
  const [category, setCategory] = useState("all");
  const [demographic, setDemographic] = useState("all");
  const [selected, setSelected] = useState<Garment | null>(null);

  const categoryOptions = useMemo(
    () => Array.from(new Set(garments.map((garment) => garment.category))).sort(),
    [garments]
  );

  const demographicOptions = useMemo(
    () => Array.from(new Set(garments.map((garment) => garment.demographic))).sort(),
    [garments]
  );

  const filteredGarments = useMemo(() => {
    const lowerYear = Math.min(fromYear, toYear);
    const upperYear = Math.max(fromYear, toYear);

    return garments.filter((garment) => {
      const inYear = garment.year >= lowerYear && garment.year <= upperYear;
      const inCategory = category === "all" || garment.category === category;
      const inDemographic = demographic === "all" || garment.demographic === demographic;

      return inYear && inCategory && inDemographic;
    });
  }, [category, demographic, fromYear, garments, toYear]);

  return (
    <section className="mx-auto max-w-7xl animate-fade-in">
      <div className="border-b border-[#D8CCBB] pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
              Personal Stylist Archive
            </p>
            <h1 className="mt-3 text-3xl font-light tracking-[-0.01em] text-neutral-950 md:text-5xl">
              Fashion archive
            </h1>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-72">
            <Button
              type="button"
              variant={view === "archive" ? "default" : "outline"}
              onClick={() => setView("archive")}
            >
              Archive
            </Button>
            <Button
              type="button"
              variant={view === "forecast" ? "default" : "outline"}
              onClick={() => setView("forecast")}
            >
              Forecast
            </Button>
          </div>
        </div>
      </div>

      {view === "archive" ? (
        <>
          <div className="mt-5 border border-[#D8CCBB] bg-white/75 p-3 backdrop-blur-xl md:p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid gap-3 sm:grid-cols-2 xl:w-[330px]">
                <div>
                  <Label htmlFor="year-start">From</Label>
                  <Select
                    id="year-start"
                    value={String(fromYear)}
                    onChange={(event) => setFromYear(Number(event.target.value))}
                    className="mt-2"
                  >
                    {Array.from({ length: yearMax - yearMin + 1 }, (_, index) => yearMin + index).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="year-end">To</Label>
                  <Select
                    id="year-end"
                    value={String(toYear)}
                    onChange={(event) => setToYear(Number(event.target.value))}
                    className="mt-2"
                  >
                    {Array.from({ length: yearMax - yearMin + 1 }, (_, index) => yearMin + index).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={demographic === "all" ? "default" : "outline"} size="sm" onClick={() => setDemographic("all")}>
                  All
                </Button>
                {demographicOptions.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={demographic === option ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDemographic(option)}
                  >
                    {demographicLabels[option]}
                  </Button>
                ))}
              </div>

              <div className="xl:w-64">
                <Label htmlFor="category-filter">Category</Label>
                <Select
                  id="category-filter"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-2"
                >
                  <option value="all">All categories</option>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {titleCase(option)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#D8CCBB] pt-3 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.16em] text-neutral-600">
                <Filter className="size-3.5" />
                {filteredGarments.length} looks
              </span>
              <span>{Math.min(fromYear, toYear)}-{Math.max(fromYear, toYear)}</span>
              <span>{isUsingSampleData ? "Sample data" : "Original data"}</span>
              <span>{trends.length} forecasts</span>
            </div>
          </div>

          {garments.length === 0 ? (
            <div className="mt-6 border border-[#D8CCBB] bg-white/70 p-6">
              <p className="text-base font-medium text-neutral-950">No original garment data ingested yet.</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Add real clothing rows locally with `npm run ingest:kaggle -- ./dataset/fashion.csv`
                or configure Supabase and ingest there.
              </p>
            </div>
          ) : filteredGarments.length === 0 ? (
            <div className="mt-6 border border-[#D8CCBB] bg-white/70 p-6">
              <p className="text-base font-medium text-neutral-950">No looks match these filters.</p>
              <p className="mt-2 text-sm text-neutral-600">Adjust the year, section, or category.</p>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredGarments.map((garment) => (
              <button
                key={garment.id}
                type="button"
                className="group flex min-h-full flex-col overflow-hidden border border-[#D8CCBB] bg-white text-left transition-colors hover:border-[#AD9C87] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6A4F]/25"
                onClick={() => setSelected(garment)}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-[#EEE5D7]">
                  <ArchiveImage
                    src={garment.image_url}
                    alt={garment.description}
                    label={garment.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <Badge className="bg-white/90 text-[#3A2A1E]">{garment.year}</Badge>
                    <Badge className="bg-white/90 text-[#3A2A1E]">
                      {demographicLabels[garment.demographic]}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-1 flex-col space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      {titleCase(garment.category)}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-700">
                      {titleCase(garment.fit_profile)}
                    </span>
                  </div>
                  <h2 className="text-base font-medium leading-tight text-neutral-950">{garment.title}</h2>
                  <p className="line-clamp-3 text-sm leading-6 text-neutral-600">{garment.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {garment.style_tags.slice(0, 3).map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6">
          {trends.length === 0 ? (
            <div className="border border-[#D8CCBB] bg-white/70 p-6">
              <p className="text-base font-medium text-neutral-950">No original trend data ingested yet.</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Add sourced trend rows locally with `npm run ingest:trends -- ./dataset/trends.csv`.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            {trends.map((trend) => (
              <article
                key={trend.id}
                className="group overflow-hidden border border-[#D8CCBB] bg-white"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-[#EEE5D7]">
                  <ArchiveImage
                    src={trend.forecast_image_url}
                    alt={trend.title}
                    label={trend.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute left-3 top-3">
                    <Badge className="bg-white/90 text-[#3A2A1E]">
                      {trend.forecast_year} • {trend.season}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-5 p-5">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      <TrendingUp className="size-4" />
                      Forecast Signal
                    </p>
                    <h2 className="mt-3 text-2xl font-light leading-tight text-neutral-950">
                      {trend.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-neutral-600">{trend.description}</p>
                  </div>

                  <div className="space-y-3 border-t border-[#D8CCBB] pt-4">
                    <div className="flex items-center justify-between text-sm text-neutral-700">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <Gauge className="size-4" />
                        Confidence
                      </span>
                      <span>{trend.confidence_score}%</span>
                    </div>
                    <Progress value={trend.confidence_score} />
                  </div>

                  {trend.source_url ? (
                    <a
                      href={trend.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({
                        variant: "outline",
                        className: "mt-auto w-full"
                      })}
                    >
                      View source
                      <ArrowUpRight className="size-4" />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {selected ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-stone-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Garment details"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-auto border border-[#D8CCBB] bg-[#F6F0E6]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#D8CCBB] p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  {selected.year}
                </p>
                <h2 className="mt-1 text-xl font-light text-neutral-950">{selected.title}</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Close garment details"
                onClick={() => setSelected(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
              <ArchiveImage
                src={selected.image_url}
                alt={selected.description}
                label={selected.title}
                className="h-full min-h-[360px] w-full bg-[#EEE5D7] object-cover"
              />
              <div className="space-y-6 p-5 md:p-6">
                <div>
                  <Label>Description</Label>
                  <p className="mt-2 text-base leading-7 text-neutral-700">{selected.description}</p>
                </div>

                <div>
                  <Label>Style Tags</Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selected.style_tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Color Palette</Label>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {selected.color_palette.map((color) => (
                      <div key={color} className="space-y-2">
                        <div
                          className={cn(
                            "h-14 border border-[#D8CCBB]",
                            color.toLowerCase() === "#ffffff" ? "border-[#AD9C87]" : ""
                          )}
                          style={{ backgroundColor: color }}
                        />
                        <p className="text-xs text-neutral-500">{color}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-4 border-t border-[#D8CCBB] pt-5 text-sm">
                  <div>
                    <dt className="text-neutral-500">Age group</dt>
                    <dd className="mt-1 font-medium text-neutral-800">{selected.age_group}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Fit</dt>
                    <dd className="mt-1 font-medium text-neutral-800">
                      {titleCase(selected.fit_profile)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Occasion</dt>
                    <dd className="mt-1 font-medium text-neutral-800">
                      {selected.occasion.map((value) => titleCase(value)).join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Season</dt>
                    <dd className="mt-1 font-medium text-neutral-800">
                      {selected.season.map((value) => titleCase(value)).join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Source</dt>
                    <dd className="mt-1 font-medium text-neutral-800">
                      <a
                        href={selected.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-4"
                      >
                        Original
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
