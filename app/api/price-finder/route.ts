import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { generateAffiliateDeepLink, generateAffiliateLink } from "@/lib/affiliate";

type PriceFinderRequest = {
  imageUrl?: unknown;
  productUrl?: unknown;
  query?: unknown;
};

type ProductMetadata = {
  availability?: string;
  currency: string;
  imageUrl?: string;
  price?: number;
  retailer: string;
  sku?: string;
  title: string;
  url: string;
};

type PriceMatch = {
  id: string;
  availability: "In stock" | "Limited stock" | "Pre-order" | "Check retailer";
  buyNowUrl: string;
  currency: string;
  imageUrl?: string;
  logoMark: string;
  logoTone: string;
  matchConfidence?: "Exact" | "Similar" | "Search";
  priceBasis?: "extracted" | "estimated";
  price: number | null;
  productTitle: string;
  productUrl: string;
  retailer: string;
  sku?: string;
  sourceType: "exact" | "search" | "visual";
};

const fallbackMatches: PriceMatch[] = [
  {
    id: "myntra-linen-shirt",
    availability: "In stock",
    buyNowUrl: generateAffiliateDeepLink("https://www.myntra.com/"),
    currency: "INR",
    logoMark: "MY",
    logoTone: "#e23d6d",
    price: 1299,
    productTitle: "Relaxed linen-blend camp shirt",
    productUrl: "https://www.myntra.com/",
    retailer: "Myntra",
    sourceType: "visual"
  },
  {
    id: "ajio-resort-shirt",
    availability: "Limited stock",
    buyNowUrl: generateAffiliateDeepLink("https://www.ajio.com/"),
    currency: "INR",
    logoMark: "AJ",
    logoTone: "#24435b",
    price: 1490,
    productTitle: "Textured resort collar shirt",
    productUrl: "https://www.ajio.com/",
    retailer: "AJIO",
    sourceType: "visual"
  },
  {
    id: "amazon-cotton-shirt",
    availability: "In stock",
    buyNowUrl: generateAffiliateDeepLink("https://www.amazon.in/"),
    currency: "INR",
    logoMark: "AZ",
    logoTone: "#f2a900",
    price: 1699,
    productTitle: "Cotton relaxed-fit casual shirt",
    productUrl: "https://www.amazon.in/",
    retailer: "Amazon",
    sourceType: "visual"
  },
  {
    id: "uniqlo-oversized-shirt",
    availability: "In stock",
    buyNowUrl: generateAffiliateDeepLink("https://www.uniqlo.com/in/"),
    currency: "INR",
    logoMark: "UQ",
    logoTone: "#d71920",
    price: 1990,
    productTitle: "Oversized open-collar shirt",
    productUrl: "https://www.uniqlo.com/in/",
    retailer: "Uniqlo",
    sourceType: "visual"
  },
  {
    id: "zara-texture-shirt",
    availability: "Pre-order",
    buyNowUrl: generateAffiliateDeepLink("https://www.zara.com/in/"),
    currency: "INR",
    logoMark: "ZR",
    logoTone: "#111111",
    price: 2990,
    productTitle: "Structured textured shirt",
    productUrl: "https://www.zara.com/in/",
    retailer: "Zara",
    sourceType: "visual"
  }
];

const retailerProfiles = [
  { host: "amazon.", logoMark: "AZ", logoTone: "#f2a900", name: "Amazon" },
  { host: "myntra.", logoMark: "MY", logoTone: "#e23d6d", name: "Myntra" },
  { host: "ajio.", logoMark: "AJ", logoTone: "#24435b", name: "AJIO" },
  { host: "uniqlo.", logoMark: "UQ", logoTone: "#d71920", name: "Uniqlo" },
  { host: "zara.", logoMark: "ZR", logoTone: "#111111", name: "Zara" },
  { host: "hm.", logoMark: "HM", logoTone: "#cc071e", name: "H&M" },
  { host: "levi.", logoMark: "LV", logoTone: "#b21f2d", name: "Levi's" }
];

const comparisonRetailers = [
  {
    availability: "In stock" as const,
    logoMark: "AJ",
    logoTone: "#24435b",
    multiplier: 0.82,
    name: "AJIO",
    searchUrl: (query: string) => `https://www.ajio.com/search/?text=${encodeURIComponent(query)}`
  },
  {
    availability: "In stock" as const,
    logoMark: "MY",
    logoTone: "#e23d6d",
    multiplier: 0.88,
    name: "Myntra",
    searchUrl: (query: string) => `https://www.myntra.com/${encodeURIComponent(query)}`
  },
  {
    availability: "In stock" as const,
    logoMark: "AZ",
    logoTone: "#f2a900",
    multiplier: 0.92,
    name: "Amazon",
    searchUrl: (query: string) => generateAffiliateLink(query)
  },
  {
    availability: "Limited stock" as const,
    logoMark: "HM",
    logoTone: "#cc071e",
    multiplier: 1,
    name: "H&M",
    searchUrl: (query: string) => `https://www2.hm.com/en_in/search-results.html?q=${encodeURIComponent(query)}`
  },
  {
    availability: "In stock" as const,
    logoMark: "UQ",
    logoTone: "#d71920",
    multiplier: 1.12,
    name: "Uniqlo",
    searchUrl: (query: string) => `https://www.uniqlo.com/in/en/search?q=${encodeURIComponent(query)}`
  },
  {
    availability: "Check retailer" as const,
    logoMark: "ZR",
    logoTone: "#111111",
    multiplier: 1.34,
    name: "Zara",
    searchUrl: (query: string) => `https://www.zara.com/in/en/search?searchTerm=${encodeURIComponent(query)}`
  }
];

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function normalizeWhitespace(value: string) {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function getRetailerProfile(url: URL, siteName?: string) {
  const hostname = url.hostname.toLowerCase();
  const profile = retailerProfiles.find((retailer) => hostname.includes(retailer.host));
  const fallbackName = siteName || hostname.replace(/^www\./, "").split(".")[0] || "Retailer";

  return {
    logoMark:
      profile?.logoMark ??
      fallbackName
        .slice(0, 2)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "R"),
    logoTone: profile?.logoTone ?? "#111111",
    name: profile?.name ?? normalizeWhitespace(fallbackName)
  };
}

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(normalized)) {
    return true;
  }

  if (normalized.endsWith(".local") || normalized.endsWith(".internal")) {
    return true;
  }

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    return (
      normalized.startsWith("10.") ||
      normalized.startsWith("127.") ||
      normalized.startsWith("169.254.") ||
      normalized.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
    );
  }

  return ipVersion === 6 && (normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd"));
}

function parseInputUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const trimmed = value.trim();
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const hasPublicHostname = url.hostname.includes(".") || isIP(url.hostname) !== 0;

    if (
      !hasPublicHostname ||
      !["http:", "https:"].includes(url.protocol) ||
      isPrivateHostname(url.hostname)
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function getSubmittedText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

async function readBodyLimited(response: Response, maxBytes = 1_200_000) {
  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let bytes = 0;

  while (bytes < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) {
      break;
    }

    bytes += value.byteLength;
    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

function parseAttributes(tag: string) {
  const attributes = new Map<string, string>();
  const pattern = /([a-zA-Z_:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(tag))) {
    attributes.set(match[1].toLowerCase(), normalizeWhitespace(match[2] ?? match[3] ?? match[4] ?? ""));
  }

  return attributes;
}

function extractMeta(html: string) {
  const meta = new Map<string, string>();
  const metaPattern = /<meta\s+[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = metaPattern.exec(html))) {
    const attributes = parseAttributes(match[0]);
    const key = attributes.get("property") ?? attributes.get("name") ?? attributes.get("itemprop");
    const content = attributes.get("content");

    if (key && content && !meta.has(key.toLowerCase())) {
      meta.set(key.toLowerCase(), content);
    }
  }

  return meta;
}

function extractCanonicalUrl(html: string, fallbackUrl: URL) {
  const links = html.match(/<link\s+[^>]*>/gi) ?? [];

  for (const link of links) {
    const attributes = parseAttributes(link);
    if (attributes.get("rel")?.toLowerCase() === "canonical" && attributes.get("href")) {
      return new URL(attributes.get("href") as string, fallbackUrl).toString();
    }
  }

  return fallbackUrl.toString();
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

function findProductSchema(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const node = value as Record<string, unknown>;
  const type = node["@type"];
  if (
    (typeof type === "string" && type.toLowerCase() === "product") ||
    (Array.isArray(type) && type.some((item) => String(item).toLowerCase() === "product"))
  ) {
    return node;
  }

  for (const key of ["@graph", "graph", "itemListElement"]) {
    const nested = node[key];
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const product = findProductSchema(item);
        if (product) {
          return product;
        }
      }
    }
  }

  return null;
}

function extractJsonLdProducts(html: string) {
  const products: Record<string, unknown>[] = [];
  const scriptPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html))) {
    const rawJson = decodeHtml(match[1]);
    try {
      for (const item of asArray(JSON.parse(rawJson))) {
        const product = findProductSchema(item);
        if (product) {
          products.push(product);
        }
      }
    } catch {
      // Some retailers emit malformed JSON-LD; metadata tags still cover those pages.
    }
  }

  return products;
}

function getString(value: unknown) {
  if (typeof value === "string") {
    return normalizeWhitespace(value);
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function getProductImage(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string") {
      return first;
    }

    if (first && typeof first === "object" && "url" in first) {
      return getString((first as { url?: unknown }).url);
    }
  }

  if (value && typeof value === "object" && "url" in value) {
    return getString((value as { url?: unknown }).url);
  }

  return "";
}

function getOffer(product?: Record<string, unknown>) {
  const offers = product?.offers;
  if (Array.isArray(offers)) {
    return offers.find((offer) => offer && typeof offer === "object") as Record<string, unknown> | undefined;
  }

  return offers && typeof offers === "object" ? (offers as Record<string, unknown>) : undefined;
}

function parsePrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/)?.[0];
  const price = normalized ? Number(normalized) : Number.NaN;

  return Number.isFinite(price) ? price : undefined;
}

function extractSku(url: URL, product?: Record<string, unknown>) {
  const fromSchema = getString(product?.sku || product?.mpn || product?.productID);
  if (fromSchema) {
    return fromSchema;
  }

  const amazonMatch = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  if (amazonMatch) {
    return amazonMatch[1].toUpperCase();
  }

  const numericId = url.pathname.match(/(?:\/|_)(\d{5,})(?:\/|$|\?)/);
  return numericId?.[1];
}

function titleFromUrl(url: URL) {
  const segments = url.pathname.split("/").filter(Boolean);
  let lastSegment = "";

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (
      !/^[A-Z0-9]{10}$/i.test(segment) &&
      !/^\d+$/.test(segment) &&
      !["dp", "gp", "p", "product", "products"].includes(segment.toLowerCase())
    ) {
      lastSegment = segment;
      break;
    }
  }

  const cleaned = decodeURIComponent(lastSegment)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned ? normalizeWhitespace(cleaned) : "Exact product page";
}

function normalizeAvailability(value?: string): PriceMatch["availability"] {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("preorder") || normalized.includes("pre-order")) {
    return "Pre-order";
  }

  if (normalized.includes("limited") || normalized.includes("lowstock")) {
    return "Limited stock";
  }

  if (normalized.includes("instock") || normalized.includes("in stock") || normalized.includes("available")) {
    return "In stock";
  }

  return "Check retailer";
}

function extractProductMetadata(html: string, sourceUrl: URL): ProductMetadata {
  const meta = extractMeta(html);
  const product = extractJsonLdProducts(html)[0];
  const offer = getOffer(product);
  const canonicalUrl = meta.get("og:url") || extractCanonicalUrl(html, sourceUrl);
  const url = new URL(canonicalUrl, sourceUrl);
  const retailer = getRetailerProfile(sourceUrl, meta.get("og:site_name"));
  const title =
    getString(product?.name) ||
    meta.get("og:title") ||
    meta.get("twitter:title") ||
    meta.get("title") ||
    "Exact product";
  const rawImage =
    getProductImage(product?.image) ||
    meta.get("og:image:secure_url") ||
    meta.get("og:image") ||
    meta.get("twitter:image");
  const imageUrl = rawImage ? new URL(rawImage, sourceUrl).toString() : undefined;
  const price =
    parsePrice(offer?.price) ??
    parsePrice(meta.get("product:price:amount")) ??
    parsePrice(meta.get("og:price:amount")) ??
    parsePrice(meta.get("price")) ??
    parsePrice(meta.get("twitter:data1"));
  const currency =
    getString(offer?.priceCurrency) ||
    meta.get("product:price:currency") ||
    meta.get("og:price:currency") ||
    "INR";

  return {
    availability: getString(offer?.availability),
    currency,
    imageUrl,
    price,
    retailer: retailer.name,
    sku: extractSku(sourceUrl, product),
    title: normalizeWhitespace(title),
    url: url.toString()
  };
}

async function fetchProductMetadata(productUrl: URL) {
  const response = await fetch(productUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (compatible; AtelierSignalPriceFinder/1.0; +https://localhost)"
    },
    signal: AbortSignal.timeout(9000)
  });

  if (!response.ok) {
    throw new Error(`Product page fetch failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error("URL did not return an HTML product page.");
  }

  return extractProductMetadata(await readBodyLimited(response), productUrl);
}

function buildExactMatch(metadata: ProductMetadata, sourceUrl: URL): PriceMatch {
  const retailer = getRetailerProfile(sourceUrl, metadata.retailer);

  return {
    id: `exact-${metadata.sku ?? sourceUrl.hostname}-${Buffer.from(metadata.url).toString("base64url").slice(0, 12)}`,
    availability: normalizeAvailability(metadata.availability),
    buyNowUrl: generateAffiliateDeepLink(metadata.url),
    currency: metadata.currency,
    imageUrl: metadata.imageUrl,
    logoMark: retailer.logoMark,
    logoTone: retailer.logoTone,
    matchConfidence: "Exact",
    priceBasis: metadata.price ? "extracted" : undefined,
    price: metadata.price ?? null,
    productTitle: metadata.title,
    productUrl: metadata.url,
    retailer: metadata.retailer,
    sku: metadata.sku,
    sourceType: "exact"
  };
}

function buildFallbackMetadataFromUrl(productUrl: URL): ProductMetadata {
  const retailer = getRetailerProfile(productUrl);
  const sku = extractSku(productUrl);
  const title = titleFromUrl(productUrl);

  return {
    currency: "INR",
    retailer: retailer.name,
    sku,
    title: title === "Exact product page" && sku ? `Product ${sku}` : title,
    url: productUrl.toString()
  };
}

function inferBasePrice(title: string) {
  const normalized = title.toLowerCase();

  if (/(watch|chronograph|timepiece)/.test(normalized)) {
    return 2499;
  }

  if (/(bag|tote|sling|crossbody|backpack)/.test(normalized)) {
    return 1599;
  }

  if (/(shoe|sneaker|loafer|boot|sandal)/.test(normalized)) {
    return 2299;
  }

  if (/(jacket|coat|blazer|parka|bomber|outerwear)/.test(normalized)) {
    return 3299;
  }

  if (/(jean|denim|trouser|pant|cargo|bottom|short)/.test(normalized)) {
    return 1899;
  }

  if (/(dress|gown|midi|slip)/.test(normalized)) {
    return 2199;
  }

  if (/(skirt)/.test(normalized)) {
    return 1499;
  }

  if (/(blouse|shirt|resort|camp|linen)/.test(normalized)) {
    return 1399;
  }

  if (/(hoodie|sweater|knit|sweatshirt)/.test(normalized)) {
    return 1799;
  }

  if (/(tee|t-shirt|top|tank|polo)/.test(normalized)) {
    return 899;
  }

  return 1499;
}

function stablePrice(title: string, retailerName: string, basePrice: number, multiplier: number) {
  const hash = `${title}-${retailerName}`.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const variance = 0.92 + (hash % 17) / 100;
  const rawPrice = basePrice * multiplier * variance;

  return Math.max(299, Math.round(rawPrice / 50) * 50 - 1);
}

function normalizeRetailerName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildComparisonMatches(
  title: string,
  options: { basePrice?: number; exactMatch?: PriceMatch } = {}
): PriceMatch[] {
  const basePrice = options.basePrice ?? inferBasePrice(title);
  const exactRetailer = options.exactMatch ? normalizeRetailerName(options.exactMatch.retailer) : "";
  const titleToken = Buffer.from(title).toString("base64url").slice(0, 10);
  const comparisonMatches = comparisonRetailers
    .filter((retailer) => normalizeRetailerName(retailer.name) !== exactRetailer)
    .map((retailer) => {
      const productUrl = retailer.searchUrl(title);

      return {
        id: `compare-${retailer.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${titleToken}`,
        availability: retailer.availability,
        buyNowUrl: generateAffiliateDeepLink(productUrl),
        currency: "INR",
        logoMark: retailer.logoMark,
        logoTone: retailer.logoTone,
        matchConfidence: "Similar" as const,
        price: stablePrice(title, retailer.name, basePrice, retailer.multiplier),
        priceBasis: "estimated" as const,
        productTitle: `Similar match: ${title}`,
        productUrl,
        retailer: retailer.name,
        sourceType: "search" as const
      };
    });

  return options.exactMatch ? [options.exactMatch, ...comparisonMatches] : comparisonMatches;
}

function sortMatches(matches: PriceMatch[]) {
  return matches.sort((first, second) => {
    if (first.sourceType === "exact" && second.sourceType !== "exact" && first.price === second.price) {
      return -1;
    }

    if (second.sourceType === "exact" && first.sourceType !== "exact" && first.price === second.price) {
      return 1;
    }

    if (first.price === null && second.price === null) {
      if (first.sourceType === "exact" && second.sourceType !== "exact") {
        return -1;
      }

      if (second.sourceType === "exact" && first.sourceType !== "exact") {
        return 1;
      }

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
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PriceFinderRequest;
  const submittedText = getSubmittedText(body.query, body.productUrl, body.imageUrl);
  const productUrl = parseInputUrl(body.productUrl) ?? parseInputUrl(body.imageUrl);

  if (!productUrl) {
    if (submittedText) {
      return NextResponse.json({
        matches: sortMatches(buildComparisonMatches(submittedText)).slice(0, 6),
        metadata: null,
        mode: "visual-fallback",
        warning: "No exact product page was detected, so these are comparable retailer search prices for your input."
      });
    }

    return NextResponse.json({
      matches: sortMatches([...fallbackMatches]),
      metadata: null,
      mode: "visual-fallback"
    });
  }

  try {
    const metadata = await fetchProductMetadata(productUrl);
    const exactMatch = buildExactMatch(metadata, productUrl);
    const comparisonMatches = buildComparisonMatches(metadata.title, {
      basePrice: metadata.price,
      exactMatch
    });

    return NextResponse.json({
      matches: sortMatches(comparisonMatches).slice(0, 7),
      metadata,
      mode: "deep-link"
    });
  } catch (error) {
    console.error("Unable to extract product metadata", error);
    const metadata = buildFallbackMetadataFromUrl(productUrl);
    const exactMatch = buildExactMatch(metadata, productUrl);

    return NextResponse.json({
      matches: sortMatches(
        buildComparisonMatches(metadata.title, {
          exactMatch
        })
      ).slice(0, 7),
      metadata,
      mode: "visual-fallback",
      warning:
        error instanceof Error
          ? error.message
          : "Unable to extract metadata from the submitted URL."
    });
  }
}
