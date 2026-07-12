"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
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
  matchConfidence?: "Exact" | "Similar" | "Search";
  discountPercent?: number;
  originalPrice?: number | null;
  priceBasis?: "extracted" | "estimated";
  productTitle: string;
  price: number | null;
  productUrl: string;
  rating?: number;
  reviewCount?: number;
  sku?: string;
  sourceType: "exact" | "live" | "search" | "visual";
  valueScore?: number;
};

type PriceFinderResponse = {
  matches: PriceMatch[];
  mode: "deep-link" | "live-search" | "visual-fallback";
  warning?: string;
};

type RankingMode = "best-value" | "lowest-price" | "highest-rating";

const rankingOptions: { label: string; value: RankingMode }[] = [
  { label: "Low price + rating", value: "best-value" },
  { label: "Lowest price", value: "lowest-price" },
  { label: "Highest rating", value: "highest-rating" }
];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 0,
  style: "currency"
});

function isLikelyImageUrl(value: string) {
  return /\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(value.trim());
}

function formatPrice(match: PriceMatch) {
  return formatMoney(match.price, match.currency);
}

function formatOriginalPrice(match: PriceMatch) {
  return formatMoney(match.originalPrice ?? null, match.currency);
}

function formatMoney(price: number | null, currency: string) {
  if (price === null) {
    return "Check site";
  }

  if (currency === "INR") {
    return currencyFormatter.format(price);
  }

  return `${currency} ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2
  }).format(price)}`;
}

function formatRating(match: PriceMatch) {
  if (!match.rating) {
    return "Rating not listed";
  }

  const prefix = match.sourceType === "exact" ? "" : "Est. ";

  return `${prefix}${match.rating.toFixed(1)} rating${
    match.reviewCount ? ` (${match.reviewCount.toLocaleString("en-IN")})` : ""
  }`;
}

function hasOfferPrice(match: PriceMatch) {
  return Boolean(match.originalPrice && match.price && match.originalPrice > match.price);
}

function isEstimatedMatch(match: PriceMatch) {
  return match.priceBasis === "estimated" || match.sourceType === "search" || match.sourceType === "visual";
}

function hasVerifiedOfferPrice(match: PriceMatch) {
  return hasOfferPrice(match) && !isEstimatedMatch(match);
}

function formatDisplayPrice(match: PriceMatch) {
  const price = formatPrice(match);

  if (isEstimatedMatch(match) && match.price !== null) {
    return `Est. ${price}`;
  }

  return price;
}

function formatOfferLabel(match: PriceMatch) {
  if (!hasVerifiedOfferPrice(match)) {
    return null;
  }

  return (
    <>
      <span className="line-through">{formatOriginalPrice(match)}</span>
      {match.discountPercent ? (
        <span className="ml-2 font-medium text-neutral-200">{match.discountPercent}% off</span>
      ) : null}
    </>
  );
}

function getMatchCta(match: PriceMatch) {
  if (match.sourceType === "exact") {
    return "Buy exact item";
  }

  if (match.sourceType === "live") {
    return "Open product";
  }

  return "View matches";
}

function getMatchBasisLabel(match: PriceMatch) {
  if (match.sourceType === "exact" && match.priceBasis === "extracted") {
    return "Exact product";
  }

  if (match.sourceType === "exact") {
    return "Exact link";
  }

  if (match.sourceType === "live") {
    return "Live product";
  }

  return "Search estimate";
}

function getDestinationLabel(match: PriceMatch) {
  if (match.sourceType === "exact") {
    return "Exact product link";
  }

  if (match.sourceType === "live") {
    return "Product result link";
  }

  return "Retailer search page";
}

function hasExactProductUrl(match: PriceMatch) {
  return match.sourceType === "exact" || match.sourceType === "live";
}

function getDisplayTitle(match: PriceMatch) {
  return match.productTitle.replace(/\s+-\s+high-rated search match$/i, "");
}

function getSourcePriority(match: PriceMatch) {
  if (match.sourceType === "exact") {
    return 0;
  }

  if (match.sourceType === "live") {
    return 1;
  }

  if (match.sourceType === "search") {
    return 2;
  }

  return 3;
}

function comparePricedMatches(first: PriceMatch, second: PriceMatch, rankingMode: RankingMode) {
  if (first.price === null && second.price === null) {
    return first.retailer.localeCompare(second.retailer);
  }

  if (first.price === null) {
    return 1;
  }

  if (second.price === null) {
    return -1;
  }

  const priceDifference = first.price - second.price;
  const ratingDifference = (second.rating ?? 0) - (first.rating ?? 0);
  const sourceDifference = getSourcePriority(first) - getSourcePriority(second);
  const valueDifference = (second.valueScore ?? 0) - (first.valueScore ?? 0);

  if (rankingMode === "lowest-price") {
    return priceDifference || ratingDifference || sourceDifference || valueDifference;
  }

  if (rankingMode === "highest-rating") {
    return ratingDifference || priceDifference || sourceDifference || valueDifference;
  }

  if (!first.rating && !second.rating && priceDifference !== 0) {
    return priceDifference;
  }

  if (Math.abs(priceDifference) >= 75) {
    return priceDifference;
  }

  return ratingDifference || priceDifference || sourceDifference || valueDifference;
}

export function PriceFinder() {
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [matches, setMatches] = useState<PriceMatch[]>([]);
  const [rankingMode, setRankingMode] = useState<RankingMode>("best-value");
  const [warning, setWarning] = useState("");

  const sortedMatches = useMemo(() => {
    return [...matches].sort((first, second) => comparePricedMatches(first, second, rankingMode));
  }, [matches, rankingMode]);

  const trimmedInputUrl = imageUrl.trim();
  const visiblePreview = previewUrl || (isLikelyImageUrl(trimmedInputUrl) ? trimmedInputUrl : "");
  const pricedMatches = sortedMatches.filter((match) => match.price !== null);
  const bestMatch = pricedMatches[0];
  const similarMatches = bestMatch
    ? sortedMatches.filter((match) => match.id !== bestMatch.id).slice(0, 4)
    : [];
  const hasProductPageLinks = sortedMatches.some((match) => hasExactProductUrl(match));
  const isSearchOnlyMode = sortedMatches.length > 0 && !hasProductPageLinks;
  const highestPrice = pricedMatches.at(-1)?.price ?? null;
  const savings =
    bestMatch?.price !== null && bestMatch?.price !== undefined && highestPrice !== null
      ? Math.max(0, highestPrice - bestMatch.price)
      : 0;

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

    const formData = new FormData(event.currentTarget);
    const submittedInput = String(formData.get("product-input") ?? "").trim();
    const effectiveInput = submittedInput || trimmedInputUrl;

    if (!effectiveInput && !previewUrl && !uploadName) {
      setWarning("Paste a product link, enter a clothing search term, or upload a photo first.");
      setHasSearched(false);
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
          imageUrl: effectiveInput || undefined,
          productUrl: effectiveInput || undefined,
          query: effectiveInput || uploadName || "mens clothing item"
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
    <section className="mx-auto max-w-7xl animate-fade-in">
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
            PERSONAL STYLIST
          </p>
          <h1 className="mt-3 text-3xl font-light tracking-[-0.01em] text-neutral-100 md:text-5xl">
            Best-value price comparison
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge>{isSearchOnlyMode ? "Search estimates" : "Exact URL + search estimates"}</Badge>
          {hasSearched ? <Badge>{sortedMatches.length} matches</Badge> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form
          className="border border-white/[0.07] bg-[#121214]/80 p-5 backdrop-blur-xl md:p-6"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Source Item
              </p>
              <h2 className="mt-2 text-2xl font-light text-neutral-100">Image input</h2>
            </div>
            <div className="grid size-11 place-items-center border border-white/10 bg-white/[0.03]">
              <ImagePlus className="size-5" />
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <Label htmlFor="product-image-url">Exact product URL or search text</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="product-image-url"
                  name="product-input"
                  type="text"
                  inputMode="url"
                  value={imageUrl}
                  placeholder="Paste exact URL or type black shirt"
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
                className="mt-2 flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-neutral-800 bg-[#09090A] p-5 text-center transition-all duration-300 hover:border-neutral-500 hover:bg-black"
              >
                {visiblePreview ? (
                  <img
                    src={visiblePreview}
                    alt="Selected clothing item"
                    className="max-h-72 w-full object-contain"
                  />
                ) : trimmedInputUrl ? (
                  <>
                    <span className="grid size-12 place-items-center border border-white/10 bg-white/[0.03]">
                      <ExternalLink className="size-5" />
                    </span>
                    <span className="max-w-full truncate text-sm font-medium uppercase tracking-[0.16em] text-neutral-200">
                      Product page ready
                    </span>
                    <span className="max-w-full truncate text-xs text-neutral-500">
                      {trimmedInputUrl}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="grid size-12 place-items-center border border-white/10 bg-white/[0.03]">
                      <Upload className="size-5" />
                    </span>
                    <span className="text-sm font-medium uppercase tracking-[0.16em] text-neutral-200">
                      Upload a clothing item
                    </span>
                    <span className="text-xs text-neutral-500">JPG, PNG, or WebP</span>
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
                <p className="mt-2 truncate text-xs text-neutral-500">{uploadName}</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                Compare prices
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>
          </div>
        </form>

        <section className="border border-white/[0.07] bg-[#121214]/80 p-5 backdrop-blur-xl md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Retailer Matches
              </p>
              <h2 className="mt-2 text-2xl font-light text-neutral-100">Ranked product links</h2>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              {hasSearched ? <Badge>{pricedMatches.length} websites compared</Badge> : null}
              <div className="flex flex-wrap gap-2">
                {rankingOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={rankingMode === option.value ? "default" : "outline"}
                    onClick={() => setRankingMode(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 grid min-h-[420px] place-items-center border border-white/[0.07] bg-black/40">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-px w-40 animate-pulse bg-gradient-to-r from-transparent via-white to-transparent" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-300">
                    Scanning retailer catalogs
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Ranking low price and high-rated matches
                  </p>
                </div>
              </div>
            </div>
          ) : hasSearched ? (
            <div className="mt-6 space-y-3">
              {warning ? (
                <div className="border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm text-neutral-400">
                  {warning}
                </div>
              ) : null}

              {bestMatch ? (
                <div className="grid gap-4 border border-white/10 bg-white/[0.04] p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      {isSearchOnlyMode ? "Best retailer result" : "Top ranked product"}
                    </p>
                    <h3 className="mt-2 text-xl font-light text-neutral-100">{getDisplayTitle(bestMatch)}</h3>
                    <div className="mt-2 flex flex-wrap items-end gap-3">
                      <div>
                        {isSearchOnlyMode ? (
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                            Est. starting price
                          </p>
                        ) : null}
                        <p className="text-3xl font-light text-neutral-100">{formatPrice(bestMatch)}</p>
                        {formatOfferLabel(bestMatch) ? (
                          <p className="mt-1 text-sm text-neutral-500">{formatOfferLabel(bestMatch)}</p>
                        ) : null}
                      </div>
                      <Badge>{bestMatch.retailer}</Badge>
                      <Badge>{getMatchBasisLabel(bestMatch)}</Badge>
                      {bestMatch.rating ? <Badge>{formatRating(bestMatch)}</Badge> : null}
                      {savings > 0 && !isEstimatedMatch(bestMatch) ? (
                        <Badge>Save up to {currencyFormatter.format(savings)}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-neutral-400">
                      {hasExactProductUrl(bestMatch)
                        ? `Compared on this page across ${pricedMatches.length} retailer websites using price and rating signals.`
                        : `Ranked by low estimated price and rating. Open the retailer result page to choose the exact item.`}
                    </p>
                    <div className="mt-3 border border-white/[0.07] bg-black/30 p-3 text-sm">
                      {hasExactProductUrl(bestMatch) ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                            Exact product URL
                          </p>
                          <a
                            href={bestMatch.productUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex max-w-full items-center gap-2 font-medium text-neutral-200 underline underline-offset-4"
                          >
                            <span className="truncate">{bestMatch.productUrl}</span>
                            <ExternalLink className="size-3.5 shrink-0" />
                          </a>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                            Retailer result page
                          </p>
                          <a
                            href={bestMatch.productUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex max-w-full items-center gap-2 font-medium text-neutral-200 underline underline-offset-4"
                          >
                            <span className="truncate">{bestMatch.productUrl}</span>
                            <ExternalLink className="size-3.5 shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>
                    <a
                      href={bestMatch.buyNowUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({ className: "mt-4 w-full sm:w-auto" })}
                    >
                      {getMatchCta(bestMatch)}
                      <ArrowUpRight className="size-4" />
                    </a>
                  </div>
                  <div className="border-t border-white/[0.07] pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-100">
                          {isSearchOnlyMode ? "Other retailer pages" : "Similar product links"}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Other retailer result pages ranked with the same filter.
                        </p>
                      </div>
                      <Badge>{similarMatches.length}</Badge>
                    </div>
                    <div className="mt-3 divide-y divide-white/[0.07]">
                      {similarMatches.length ? (
                        similarMatches.map((match) => (
                          <a
                            key={`similar-${match.id}`}
                            href={match.buyNowUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="grid grid-cols-[36px_1fr_auto] items-center gap-3 py-3 text-sm text-neutral-300 transition-colors hover:text-white"
                          >
                            <span
                              className="grid size-9 place-items-center text-xs font-semibold text-white"
                              style={{ backgroundColor: match.logoTone }}
                            >
                              {match.logoMark}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{getDisplayTitle(match)}</span>
                              <span className="mt-0.5 block truncate text-xs text-neutral-500">
                                {match.retailer} · {getDestinationLabel(match)}
                              </span>
                            </span>
                            <span className="text-right">
                              <span className="block whitespace-nowrap font-semibold">
                                {formatDisplayPrice(match)}
                              </span>
                              <span className="block whitespace-nowrap text-xs text-neutral-500">
                                {match.rating ? `${match.rating.toFixed(1)} / 5` : getMatchBasisLabel(match)}
                              </span>
                            </span>
                          </a>
                        ))
                      ) : (
                        <p className="py-3 text-sm text-neutral-500">
                          No parallel links were returned for this search.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {pricedMatches.length ? (
                <div className="overflow-hidden border border-white/[0.07] bg-black/25">
                  <div className="grid grid-cols-[1.1fr_0.8fr_0.9fr] bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 sm:grid-cols-[1.1fr_0.7fr_0.9fr_0.9fr]">
                    <span>Website</span>
                    <span>Price</span>
                    <span className="hidden sm:block">Rating</span>
                    <span className="text-right">Link</span>
                  </div>
                  {pricedMatches.map((match, index) => (
                    <div
                      key={`row-${match.id}`}
                      className="grid grid-cols-[1.1fr_0.8fr_0.9fr] items-center gap-2 border-t border-white/[0.07] px-3 py-3 text-sm text-neutral-300 transition-colors hover:bg-white/[0.04] sm:grid-cols-[1.1fr_0.7fr_0.9fr_0.9fr]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="grid size-8 shrink-0 place-items-center text-xs font-semibold text-white"
                          style={{ backgroundColor: match.logoTone }}
                        >
                          {match.logoMark}
                        </span>
                        <span className="min-w-0 truncate font-medium text-neutral-200">
                          {index === 0 ? "Best - " : ""}
                          {match.retailer}
                        </span>
                      </div>
                      <span className="font-semibold">
                        {formatDisplayPrice(match)}
                        {formatOfferLabel(match) ? (
                          <span className="mt-0.5 block text-xs font-normal text-neutral-500">
                            {formatOfferLabel(match)}
                          </span>
                        ) : null}
                      </span>
                      <span className="hidden text-neutral-500 sm:block">
                        {match.rating ? `${match.rating.toFixed(1)} / 5` : "Not listed"}
                      </span>
                      <a
                        href={match.buyNowUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="justify-self-end text-xs font-semibold uppercase tracking-[0.12em] text-neutral-200 underline underline-offset-4 hover:text-white"
                      >
                        {match.sourceType === "exact" ? "View" : "Matches"}
                      </a>
                    </div>
                  ))}
                </div>
              ) : null}

              {hasProductPageLinks ? (
                <div className="grid gap-3">
                  {sortedMatches.map((match, index) => (
                    <article
                      key={match.id}
                      className={cn(
                        "grid gap-4 border border-white/[0.07] bg-black/30 p-4 md:grid-cols-[64px_1fr_auto]",
                        index === 0 ? "border-white/20 bg-white/[0.05]" : ""
                      )}
                    >
                      {match.imageUrl ? (
                        <div className="size-16 overflow-hidden border border-white/10 bg-neutral-900">
                          <img
                            src={match.imageUrl}
                            alt={match.productTitle}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="grid size-16 place-items-center border border-white/10 text-sm font-semibold text-white"
                          style={{ backgroundColor: match.logoTone }}
                          aria-label={`${match.retailer} logo`}
                        >
                          {match.logoMark}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-medium text-neutral-100">{getDisplayTitle(match)}</h3>
                          {index === 0 && match.price !== null ? <Badge>Best value</Badge> : null}
                          <Badge>{getMatchBasisLabel(match)}</Badge>
                          {match.priceBasis === "estimated" ? <Badge>Estimated</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-neutral-500">{match.retailer}</p>
                        <p className="mt-1 text-sm text-neutral-500">{formatRating(match)}</p>
                        <a
                          href={match.productUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex max-w-full items-center gap-2 text-xs font-medium text-neutral-300 underline underline-offset-4 hover:text-white"
                        >
                          <span className="shrink-0">{getDestinationLabel(match)}:</span>
                          <span className="truncate text-neutral-500">{match.productUrl}</span>
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                        {match.sku ? (
                          <p className="mt-1 text-xs text-neutral-500">SKU / ID: {match.sku}</p>
                        ) : null}
                        <p className="mt-3 inline-flex items-center gap-2 text-sm">
                          <CheckCircle2 className="size-4 text-white" />
                          {match.availability}
                        </p>
                      </div>
                      <div className="flex flex-col justify-between gap-3 md:items-end">
                        <div className="md:text-right">
                          <p className="text-2xl font-semibold">{formatDisplayPrice(match)}</p>
                          {formatOfferLabel(match) ? (
                            <p className="mt-1 text-sm text-neutral-500">
                              {formatOfferLabel(match)}
                            </p>
                          ) : null}
                        </div>
                        <a
                          href={match.buyNowUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ className: "w-full md:w-auto" })}
                        >
                          {getMatchCta(match)}
                          <ArrowUpRight className="size-4" />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 grid min-h-[420px] place-items-center border border-white/[0.07] bg-black/35 p-6 text-center">
              <div>
                <Search className="mx-auto size-9" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-200">
                  No image scanned yet
                </p>
                <p className="mt-2 text-sm text-neutral-500">
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
