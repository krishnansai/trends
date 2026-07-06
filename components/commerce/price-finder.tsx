"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Loader2,
  RotateCcw,
  Search,
  Upload
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PriceMatch = {
  id: string;
  availability: "In stock" | "Limited stock" | "Pre-order" | "Check retailer";
  buyNowUrl: string;
  currency: string;
  imageUrl?: string;
  retailer: string;
  logoMark: string;
  logoTone: string;
  productTitle: string;
  price: number | null;
  productUrl: string;
  sku?: string;
  sourceType: "exact" | "search" | "visual";
};

type PriceFinderResponse = {
  matches: PriceMatch[];
  mode: "deep-link" | "visual-fallback";
  warning?: string;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 0,
  style: "currency"
});

function isLikelyImageUrl(value: string) {
  return /\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(value.trim());
}

function formatPrice(match: PriceMatch) {
  if (match.price === null) {
    return "Check site";
  }

  if (match.currency === "INR") {
    return currencyFormatter.format(match.price);
  }

  return `${match.currency} ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2
  }).format(match.price)}`;
}

export function PriceFinder() {
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [matches, setMatches] = useState<PriceMatch[]>([]);
  const [warning, setWarning] = useState("");

  const sortedMatches = useMemo(() => {
    return [...matches].sort((first, second) => {
      if (first.price === null && second.price === null) {
        return first.retailer.localeCompare(second.retailer);
      }

      if (first.price === null) {
        return 1;
      }

      if (second.price === null) {
        return -1;
      }

      return first.price - second.price;
    });
  }, [matches]);

  const canSearch = imageUrl.trim().length > 0 || previewUrl.length > 0;
  const trimmedInputUrl = imageUrl.trim();
  const visiblePreview = previewUrl || (isLikelyImageUrl(trimmedInputUrl) ? trimmedInputUrl : "");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setUploadName(file.name);
    setImageUrl("");
    setHasSearched(false);
    setMatches([]);
    setWarning("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSearch) {
      return;
    }

    setHasSearched(false);
    setIsLoading(true);
    setWarning("");

    try {
      const response = await fetch("/api/price-finder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageUrl: trimmedInputUrl || undefined,
          productUrl: trimmedInputUrl || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Unable to extract product metadata.");
      }

      const data = (await response.json()) as PriceFinderResponse;
      setMatches(data.matches);
      setWarning(data.warning ?? "");
      setHasSearched(true);
    } catch (error) {
      console.error(error);
      setMatches([]);
      setWarning("Unable to scan this URL. Try a public product page with visible metadata.");
      setHasSearched(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setImageUrl("");
    setPreviewUrl("");
    setUploadName("");
    setIsLoading(false);
    setHasSearched(false);
    setMatches([]);
    setWarning("");
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Price Finder</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Copy-paste price comparison</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge>Deep-link metadata</Badge>
          {hasSearched ? <Badge>{sortedMatches.length} matches</Badge> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form className="border border-border bg-background p-5" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Source Item</p>
              <h2 className="mt-1 text-2xl font-semibold">Image input</h2>
            </div>
            <div className="grid size-11 place-items-center border border-border">
              <ImagePlus className="size-5" />
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <Label htmlFor="product-image-url">Product URL or image URL</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="product-image-url"
                  type="url"
                  value={imageUrl}
                  placeholder="https://retailer.com/product-page"
                  onChange={(event) => {
                    setImageUrl(event.target.value);
                    setPreviewUrl("");
                    setUploadName("");
                    setHasSearched(false);
                    setMatches([]);
                    setWarning("");
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="product-upload">Photo upload</Label>
              <label
                htmlFor="product-upload"
                className="mt-2 flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-input bg-muted/45 p-5 text-center transition-colors hover:border-foreground hover:bg-muted"
              >
                {visiblePreview ? (
                  <img
                    src={visiblePreview}
                    alt="Selected clothing item"
                    className="max-h-72 w-full object-contain"
                  />
                ) : trimmedInputUrl ? (
                  <>
                    <span className="grid size-12 place-items-center border border-border bg-background">
                      <ExternalLink className="size-5" />
                    </span>
                    <span className="max-w-full truncate text-sm font-medium">Product page ready</span>
                    <span className="max-w-full truncate text-xs text-muted-foreground">
                      {trimmedInputUrl}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="grid size-12 place-items-center border border-border bg-background">
                      <Upload className="size-5" />
                    </span>
                    <span className="text-sm font-medium">Upload a clothing item</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG, or WebP</span>
                  </>
                )}
              </label>
              <input
                id="product-upload"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleUpload}
              />
              {uploadName ? (
                <p className="mt-2 truncate text-xs text-muted-foreground">{uploadName}</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Button type="submit" disabled={!canSearch || isLoading}>
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                Find lowest price
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>
          </div>
        </form>

        <section className="border border-border bg-background p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm text-muted-foreground">Retailer Matches</p>
              <h2 className="mt-1 text-2xl font-semibold">Lowest price first</h2>
            </div>
            {hasSearched ? <Badge>Sorted by price</Badge> : null}
          </div>

          {isLoading ? (
            <div className="mt-6 grid min-h-[420px] place-items-center border border-border bg-muted/35">
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="size-10 animate-spin" />
                <div>
                  <p className="font-medium">Scanning retailer catalogs</p>
                  <p className="mt-1 text-sm text-muted-foreground">Matching visual features and prices</p>
                </div>
              </div>
            </div>
          ) : hasSearched ? (
            <div className="mt-6 space-y-3">
              {warning ? (
                <div className="border border-border bg-muted/35 p-3 text-sm text-muted-foreground">
                  {warning}
                </div>
              ) : null}
              {sortedMatches.map((match, index) => (
                <article
                  key={match.id}
                  className={cn(
                    "grid gap-4 border border-border bg-background p-4 md:grid-cols-[72px_1fr_auto]",
                    index === 0 ? "border-foreground" : ""
                  )}
                >
                  {match.imageUrl ? (
                    <div className="size-[72px] overflow-hidden border border-border bg-muted">
                      <img
                        src={match.imageUrl}
                        alt={match.productTitle}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="grid size-[72px] place-items-center border border-border text-sm font-semibold text-white"
                      style={{ backgroundColor: match.logoTone }}
                      aria-label={`${match.retailer} logo`}
                    >
                      {match.logoMark}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{match.productTitle}</h3>
                      {index === 0 && match.price !== null ? <Badge>Best price</Badge> : null}
                      {match.sourceType === "exact" ? <Badge>Exact URL</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{match.retailer}</p>
                    {match.sku ? (
                      <p className="mt-1 text-xs text-muted-foreground">SKU / ID: {match.sku}</p>
                    ) : null}
                    <p className="mt-3 inline-flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 text-accent" />
                      {match.availability}
                    </p>
                  </div>
                  <div className="flex flex-col justify-between gap-3 md:items-end">
                    <p className="text-2xl font-semibold">{formatPrice(match)}</p>
                    <a
                      href={match.buyNowUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({ className: "w-full md:w-auto" })}
                    >
                      Buy Now
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid min-h-[420px] place-items-center border border-border bg-muted/35 p-6 text-center">
              <div>
                <Search className="mx-auto size-9" />
                <p className="mt-4 font-medium">No image scanned yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Results appear after an uploaded photo or image URL is matched.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
