"use client";

import { Filter, Layers3, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ARCHIVE_END_YEAR, ARCHIVE_START_YEAR } from "@/lib/archive-window";
import type { Demographic, Garment } from "@/lib/types";
import { cn } from "@/lib/utils";

const yearMin = ARCHIVE_START_YEAR;
const yearMax = ARCHIVE_END_YEAR;

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const demographicLabels: Record<Demographic, string> = {
  menswear: "Menswear",
  unisex: "Unisex",
  womenswear: "Womenswear"
};

export function HistoricalArchive({
  garments,
  isUsingSampleData
}: {
  garments: Garment[];
  isUsingSampleData: boolean;
}) {
  const [fromYear, setFromYear] = useState(yearMin);
  const [toYear, setToYear] = useState(yearMax);
  const [ageGroup, setAgeGroup] = useState("all");
  const [category, setCategory] = useState("all");
  const [demographic, setDemographic] = useState("all");
  const [selected, setSelected] = useState<Garment | null>(null);

  const categoryOptions = useMemo(
    () => Array.from(new Set(garments.map((garment) => garment.category))).sort(),
    [garments]
  );

  const ageOptions = useMemo(
    () => Array.from(new Set(garments.map((garment) => garment.age_group))).sort(),
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
      const inAge = ageGroup === "all" || garment.age_group === ageGroup;
      const inCategory = category === "all" || garment.category === category;
      const inDemographic = demographic === "all" || garment.demographic === demographic;

      return inYear && inAge && inCategory && inDemographic;
    });
  }, [ageGroup, category, demographic, fromYear, garments, toYear]);

  const demographicCounts = useMemo(() => {
    return garments.reduce<Record<string, number>>(
      (counts, garment) => ({
        ...counts,
        [garment.demographic]: (counts[garment.demographic] ?? 0) + 1
      }),
      {}
    );
  }, [garments]);

  return (
    <section className="mx-auto max-w-7xl">
      <div className="overflow-hidden border border-border bg-background">
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-6">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Layers3 className="size-4 text-accent" />
              Historical Archive
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-normal md:text-5xl">
              Five years of visual signals
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Filter original menswear, womenswear, and unisex looks by year, category, age band, season, and context.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:min-w-72">
            <div className="border border-border bg-muted/35 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Visible</p>
              <p className="mt-2 text-3xl font-semibold">{filteredGarments.length}</p>
            </div>
            <div className="border border-border bg-muted/35 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Total</p>
              <p className="mt-2 text-3xl font-semibold">{garments.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="size-4" />
            Archive controls
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isUsingSampleData ? <Badge>Sample data</Badge> : <Badge>Original data</Badge>}
          <Badge>{filteredGarments.length} looks</Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-4">
        <Button
          type="button"
          variant={demographic === "all" ? "default" : "outline"}
          onClick={() => setDemographic("all")}
        >
          All Sections
          <span className="text-xs opacity-75">{garments.length}</span>
        </Button>
        {demographicOptions.map((option) => (
          <Button
            key={option}
            type="button"
            variant={demographic === option ? "default" : "outline"}
            onClick={() => setDemographic(option)}
          >
            {demographicLabels[option]}
            <span className="text-xs opacity-75">{demographicCounts[option] ?? 0}</span>
          </Button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 border border-border bg-background p-4 md:grid-cols-[minmax(260px,1.2fr)_1fr_1fr]">
        <div>
          <div className="flex items-center justify-between">
            <Label>Year Range</Label>
            <span className="text-sm font-medium">
              {Math.min(fromYear, toYear)}-{Math.max(fromYear, toYear)}
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            <input
              type="range"
              min={yearMin}
              max={yearMax}
              value={fromYear}
              aria-label="Archive start year"
              onChange={(event) => setFromYear(Number(event.target.value))}
              className="w-full accent-foreground"
            />
            <input
              type="range"
              min={yearMin}
              max={yearMax}
              value={toYear}
              aria-label="Archive end year"
              onChange={(event) => setToYear(Number(event.target.value))}
              className="w-full accent-foreground"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="age-filter">Age Category</Label>
          <Select
            id="age-filter"
            value={ageGroup}
            onChange={(event) => setAgeGroup(event.target.value)}
            className="mt-2"
          >
            <option value="all">All age groups</option>
            {ageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="category-filter">Clothing Type</Label>
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

      {garments.length === 0 ? (
        <div className="mt-6 border border-border bg-muted/35 p-6">
          <p className="text-base font-semibold">No original garment data ingested yet.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add real clothing rows locally with `npm run ingest:kaggle -- ./dataset/fashion.csv`
            or configure Supabase and ingest there. The archive no longer renders bundled sample
            looks by default.
          </p>
        </div>
      ) : filteredGarments.length === 0 ? (
        <div className="mt-6 border border-border bg-muted/35 p-6">
          <p className="text-base font-semibold">No looks match these filters.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Adjust the year range, age group, or clothing type.
          </p>
        </div>
      ) : null}

      <div className="masonry mt-6 columns-1 sm:columns-2 xl:columns-3 2xl:columns-4">
        {filteredGarments.map((garment) => (
          <button
            key={garment.id}
            type="button"
            className="group w-full overflow-hidden border border-border bg-background text-left transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
            onClick={() => setSelected(garment)}
          >
            <div className="relative overflow-hidden bg-muted">
              <img
                src={garment.image_url}
                alt={garment.description}
                className="w-full bg-muted object-cover transition duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                <Badge className="border-background/50 bg-background/90">{garment.year}</Badge>
                <Badge className="border-background/50 bg-background/90">
                  {demographicLabels[garment.demographic]}
                </Badge>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{titleCase(garment.category)}</span>
                <span className="text-xs font-medium text-accent">{titleCase(garment.fit_profile)}</span>
              </div>
              <h2 className="text-base font-semibold leading-tight">{garment.title}</h2>
              <p className="text-sm text-muted-foreground">{garment.description}</p>
              <div className="flex flex-wrap gap-2">
                {garment.style_tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} className="bg-muted">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/35 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Garment details"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-auto border border-border bg-background"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <p className="text-sm text-muted-foreground">{selected.year}</p>
                <h2 className="text-xl font-semibold">{selected.title}</h2>
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
              <img
                src={selected.image_url}
                alt={selected.description}
                className="h-full min-h-[360px] w-full bg-muted object-cover"
              />
              <div className="space-y-6 p-5 md:p-6">
                <div>
                  <Label>Description</Label>
                  <p className="mt-2 text-base leading-7">{selected.description}</p>
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
                            "h-14 border border-border",
                            color.toLowerCase() === "#ffffff" ? "border-foreground/20" : ""
                          )}
                          style={{ backgroundColor: color }}
                        />
                        <p className="text-xs text-muted-foreground">{color}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Age group</dt>
                    <dd className="mt-1 font-medium">{selected.age_group}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Fit</dt>
                    <dd className="mt-1 font-medium">{titleCase(selected.fit_profile)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Occasion</dt>
                    <dd className="mt-1 font-medium">
                      {selected.occasion.map((value) => titleCase(value)).join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Season</dt>
                    <dd className="mt-1 font-medium">
                      {selected.season.map((value) => titleCase(value)).join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Source</dt>
                    <dd className="mt-1 font-medium">
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
