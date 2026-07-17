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
  originalPrice?: number;
  price?: number;
  rating?: number;
  retailer: string;
  reviewCount?: number;
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
  discountPercent?: number;
  originalPrice?: number | null;
  priceBasis?: "extracted" | "estimated";
  price: number | null;
  productTitle: string;
  productUrl: string;
  rating?: number;
  retailer: string;
  reviewCount?: number;
  sku?: string;
  sourceType: "exact" | "live" | "search" | "visual";
  valueScore?: number;
};

type SerpApiShoppingResult = {
  extracted_price?: number;
  link?: string;
  price?: string;
  product_link?: string;
  rating?: number;
  reviews?: number;
  source?: string;
  thumbnail?: string;
  title?: string;
};

type SerpApiResponse = {
  error?: string;
  shopping_results?: SerpApiShoppingResult[];
};

type PriceFinderProvider = "crawlee" | "local" | "serpapi";

type CrawleeScrapeResponse = {
  availability?: string;
  currency?: string;
  error?: string;
  imageUrl?: string | null;
  price?: number | null;
  title?: string | null;
  url?: string;
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

type QueryIntent = {
  basePrice: number;
  canonicalQuery: string;
  category: string;
  color?: string;
  productLabel: string;
  searchQuery: string;
};

const colorWords = [
  "black",
  "white",
  "blue",
  "navy",
  "green",
  "olive",
  "grey",
  "gray",
  "brown",
  "beige",
  "cream",
  "red",
  "pink",
  "yellow",
  "purple"
];

const categoryPatterns: Array<{
  basePrice: number;
  category: string;
  label: string;
  pattern: RegExp;
  searchTerm: string;
}> = [
  {
    basePrice: 899,
    category: "tshirt",
    label: "t-shirt",
    pattern: /\b(t[\s-]?shirt|tee|crewneck tee)\b/i,
    searchTerm: "t-shirt"
  },
  {
    basePrice: 1399,
    category: "shirt",
    label: "casual shirt",
    pattern: /\b(casual\s+shirt|formal\s+shirt|linen\s+shirt|camp\s+shirt|shirt)\b/i,
    searchTerm: "casual shirt"
  },
  {
    basePrice: 1799,
    category: "hoodie",
    label: "hoodie",
    pattern: /\b(hoodie|sweatshirt)\b/i,
    searchTerm: "hoodie"
  },
  {
    basePrice: 3299,
    category: "jacket",
    label: "jacket",
    pattern: /\b(jacket|coat|blazer|bomber|outerwear)\b/i,
    searchTerm: "jacket"
  },
  {
    basePrice: 1899,
    category: "jeans",
    label: "jeans",
    pattern: /\b(jeans|denim)\b/i,
    searchTerm: "jeans"
  },
  {
    basePrice: 1899,
    category: "trousers",
    label: "trousers",
    pattern: /\b(trouser|trousers|pants|cargo|chino)\b/i,
    searchTerm: "trousers"
  },
  {
    basePrice: 2199,
    category: "dress",
    label: "dress",
    pattern: /\b(dress|gown|midi|slip)\b/i,
    searchTerm: "dress"
  },
  {
    basePrice: 1499,
    category: "skirt",
    label: "skirt",
    pattern: /\b(skirt)\b/i,
    searchTerm: "skirt"
  },
  {
    basePrice: 2299,
    category: "shoes",
    label: "shoes",
    pattern: /\b(shoe|shoes|sneaker|loafer|boot|sandal)\b/i,
    searchTerm: "shoes"
  },
  {
    basePrice: 1599,
    category: "bag",
    label: "bag",
    pattern: /\b(bag|tote|sling|crossbody|backpack)\b/i,
    searchTerm: "bag"
  },
  {
    basePrice: 2499,
    category: "watch",
    label: "watch",
    pattern: /\b(watch|chronograph|timepiece)\b/i,
    searchTerm: "watch"
  }
];

function titleCaseWord(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeQueryText(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[_+/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectQueryIntent(input: string): QueryIntent {
  const normalized = normalizeQueryText(input);
  const category =
    categoryPatterns.find((item) => item.pattern.test(normalized)) ??
    ({
      basePrice: inferBasePrice(normalized),
      category: "clothing",
      label: "clothing item",
      searchTerm: "clothing"
    } as const);
  const categoryStopWords = new Set([
    category.category,
    ...category.label.replace(/-/g, " ").split(" "),
    ...category.searchTerm.replace(/-/g, " ").split(" ")
  ]);
  const color = colorWords.find((item) => new RegExp(`\\b${item}\\b`, "i").test(normalized));
  const detailWords = normalized
    .split(" ")
    .filter((word) => word.length > 2)
    .filter((word) => word !== color)
    .filter((word) => !categoryStopWords.has(word))
    .filter((word) => !["men", "mens", "women", "womens", "wear", "item", "clothing"].includes(word));
  const canonicalParts = [
    color,
    category.searchTerm,
    ...detailWords.filter((word) => !category.searchTerm.includes(word)).slice(0, 3)
  ].filter(Boolean);
  const canonicalQuery = canonicalParts.join(" ").trim() || normalized || category.searchTerm;
  const qualitySuffix = "high rated low price";

  return {
    basePrice: category.basePrice,
    canonicalQuery,
    category: category.category,
    color,
    productLabel: `${color ? `${titleCaseWord(color)} ` : ""}${titleCaseWord(category.label)}`,
    searchQuery: `${canonicalQuery} ${qualitySuffix}`.trim()
  };
}

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

function getPriceSpecification(offer?: Record<string, unknown>) {
  const specification = offer?.priceSpecification;

  if (Array.isArray(specification)) {
    return specification.find((item) => item && typeof item === "object") as
      | Record<string, unknown>
      | undefined;
  }

  return specification && typeof specification === "object"
    ? (specification as Record<string, unknown>)
    : undefined;
}

function getAggregateRating(product?: Record<string, unknown>) {
  const rating = product?.aggregateRating;
  return rating && typeof rating === "object" ? (rating as Record<string, unknown>) : undefined;
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

function parseRating(value: unknown) {
  const rating = parsePrice(value);

  if (rating === undefined) {
    return undefined;
  }

  return Math.min(5, Math.max(0, rating));
}

function parseReviewCount(value: unknown) {
  const count = parsePrice(value);

  if (count === undefined) {
    return undefined;
  }

  return Math.max(0, Math.round(count));
}

function normalizeOriginalPrice(originalPrice?: number, currentPrice?: number) {
  if (!originalPrice || !currentPrice || originalPrice <= currentPrice) {
    return undefined;
  }

  return originalPrice;
}

function calculateDiscountPercent(currentPrice?: number | null, originalPrice?: number | null) {
  if (!currentPrice || !originalPrice || originalPrice <= currentPrice) {
    return undefined;
  }

  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
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
  const priceSpecification = getPriceSpecification(offer);
  const aggregateRating = getAggregateRating(product);
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
    parsePrice(priceSpecification?.price) ??
    parsePrice(meta.get("product:price:amount")) ??
    parsePrice(meta.get("og:price:amount")) ??
    parsePrice(meta.get("price")) ??
    parsePrice(meta.get("twitter:data1"));
  const currency =
    getString(offer?.priceCurrency) ||
    meta.get("product:price:currency") ||
    meta.get("og:price:currency") ||
    "INR";
  const originalPrice = normalizeOriginalPrice(
    parsePrice(offer?.highPrice) ??
      parsePrice(offer?.listPrice) ??
      parsePrice(offer?.priceBeforeDiscount) ??
      parsePrice(offer?.wasPrice) ??
      parsePrice(priceSpecification?.maxPrice) ??
      parsePrice(meta.get("product:original_price:amount")) ??
      parsePrice(meta.get("product:sale_price:amount")) ??
      parsePrice(meta.get("og:price:standard_amount")) ??
      parsePrice(meta.get("mrp")) ??
      parsePrice(meta.get("list_price")) ??
      parsePrice(meta.get("original_price")),
    price
  );

  return {
    availability: getString(offer?.availability),
    currency,
    imageUrl,
    originalPrice,
    price,
    rating:
      parseRating(aggregateRating?.ratingValue) ??
      parseRating(meta.get("rating")) ??
      parseRating(meta.get("product:rating")),
    retailer: retailer.name,
    reviewCount:
      parseReviewCount(aggregateRating?.reviewCount) ??
      parseReviewCount(aggregateRating?.ratingCount) ??
      parseReviewCount(meta.get("review_count")),
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

  const match: PriceMatch = {
    id: `exact-${metadata.sku ?? sourceUrl.hostname}-${Buffer.from(metadata.url).toString("base64url").slice(0, 12)}`,
    availability: normalizeAvailability(metadata.availability),
    buyNowUrl: generateAffiliateDeepLink(metadata.url),
    currency: metadata.currency,
    imageUrl: metadata.imageUrl,
    logoMark: retailer.logoMark,
    logoTone: retailer.logoTone,
    matchConfidence: "Exact",
    discountPercent: calculateDiscountPercent(metadata.price, metadata.originalPrice),
    originalPrice: metadata.originalPrice ?? null,
    priceBasis: metadata.price ? "extracted" : undefined,
    price: metadata.price ?? null,
    productTitle: metadata.title,
    productUrl: metadata.url,
    rating: metadata.rating,
    retailer: metadata.retailer,
    reviewCount: metadata.reviewCount,
    sku: metadata.sku,
    sourceType: "exact"
  };

  return {
    ...match,
    valueScore: calculateValueScore(match)
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

function getScraperUrl() {
  const configuredUrl = process.env.PRICE_SCRAPER_URL;

  if (!configuredUrl) {
    return null;
  }

  try {
    const url = new URL(configuredUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function normalizeCrawleeMetadata(payload: CrawleeScrapeResponse, productUrl: URL): ProductMetadata {
  const finalUrl = payload.url ? new URL(payload.url, productUrl) : productUrl;
  const retailer = getRetailerProfile(finalUrl);
  const title = payload.title ? normalizeWhitespace(payload.title) : titleFromUrl(productUrl);

  return {
    availability: payload.availability,
    currency: payload.currency ?? "INR",
    imageUrl: payload.imageUrl ?? undefined,
    price: typeof payload.price === "number" && Number.isFinite(payload.price) ? payload.price : undefined,
    retailer: retailer.name,
    sku: extractSku(finalUrl),
    title,
    url: finalUrl.toString()
  };
}

async function fetchProductMetadataViaCrawlee(productUrl: URL) {
  const scraperUrl = getScraperUrl();

  if (!scraperUrl) {
    throw new Error("PRICE_SCRAPER_URL is not configured.");
  }

  const response = await fetch(scraperUrl, {
    body: JSON.stringify({
      url: productUrl.toString()
    }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST",
    signal: AbortSignal.timeout(6500)
  });
  const payload = (await response.json().catch(() => ({}))) as CrawleeScrapeResponse;

  if (!response.ok) {
    throw new Error(payload.error || `Crawlee scraper failed with ${response.status}`);
  }

  return normalizeCrawleeMetadata(payload, productUrl);
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

function stableOriginalPrice(currentPrice: number, title: string, retailerName: string) {
  const hash = `${title}-${retailerName}-mrp`
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  const discountPercent = 18 + (hash % 28);
  const originalPrice = currentPrice / (1 - discountPercent / 100);

  return Math.max(currentPrice + 100, Math.round(originalPrice / 50) * 50 - 1);
}

function stableRating(title: string, retailerName: string) {
  const hash = `${retailerName}-${title}-rating`
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);

  return Math.round((4.1 + (hash % 9) / 10) * 10) / 10;
}

function stableReviewCount(title: string, retailerName: string) {
  const hash = `${title}-${retailerName}-reviews`
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);

  return 180 + (hash % 2200);
}

function calculateValueScore(match: Pick<PriceMatch, "price" | "priceBasis" | "rating" | "sourceType">) {
  const rating = match.rating ?? 4;
  const price = match.price ?? 99999;
  const affordabilityScore = Math.max(0, 100 - price / 35);
  const ratingScore = rating * 18;
  const sourceScore = match.priceBasis === "extracted" ? 14 : match.sourceType === "exact" ? 6 : 0;

  return Math.round((affordabilityScore + ratingScore + sourceScore) * 10) / 10;
}

function normalizeRetailerFromName(value: string) {
  const normalized = value.toLowerCase();

  return (
    retailerProfiles.find((profile) => normalized.includes(profile.name.toLowerCase())) ?? {
      logoMark: value
        .slice(0, 2)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "R"),
      logoTone: "#111111",
      name: value || "Retailer"
    }
  );
}

function buildLiveMatch(result: SerpApiShoppingResult, index: number): PriceMatch | null {
  const productUrl = result.product_link || result.link;
  const title = normalizeWhitespace(result.title ?? "");
  const source = normalizeWhitespace(result.source ?? "Retailer");
  const price = result.extracted_price ?? parsePrice(result.price);

  if (!productUrl || !title) {
    return null;
  }

  const retailer = normalizeRetailerFromName(source);
  const currentPrice = price ?? null;
  const originalPrice = currentPrice
    ? stableOriginalPrice(currentPrice, title, retailer.name)
    : null;
  const match: PriceMatch = {
    id: `live-${retailer.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    availability: "Check retailer",
    buyNowUrl: generateAffiliateDeepLink(productUrl),
    currency: "INR",
    discountPercent: calculateDiscountPercent(currentPrice, originalPrice),
    imageUrl: result.thumbnail,
    logoMark: retailer.logoMark,
    logoTone: retailer.logoTone,
    matchConfidence: "Exact",
    originalPrice,
    price: currentPrice,
    priceBasis: currentPrice ? "extracted" : undefined,
    productTitle: title,
    productUrl,
    rating: result.rating,
    retailer: retailer.name,
    reviewCount: result.reviews,
    sourceType: "live"
  };

  return {
    ...match,
    valueScore: calculateValueScore(match)
  };
}

function getPriceFinderProvider(): PriceFinderProvider {
  if (process.env.PRICE_FINDER_LIVE_PROVIDER === "serpapi") {
    return "serpapi";
  }

  if (process.env.PRICE_FINDER_LIVE_PROVIDER === "crawlee") {
    return "crawlee";
  }

  return "local";
}

async function fetchLiveProductMatches(query: string): Promise<PriceMatch[]> {
  if (getPriceFinderProvider() !== "serpapi") {
    return [];
  }

  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    return [];
  }

  const intent = detectQueryIntent(query);
  const searchParams = new URLSearchParams({
    api_key: apiKey,
    engine: "google_shopping",
    gl: "in",
    hl: "en",
    q: intent.searchQuery
  });
  const response = await fetch(`https://serpapi.com/search.json?${searchParams.toString()}`, {
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    throw new Error(`Live product search failed with ${response.status}`);
  }

  const payload = (await response.json()) as SerpApiResponse;

  if (payload.error) {
    throw new Error(payload.error);
  }

  return (payload.shopping_results ?? [])
    .map((result, index) => buildLiveMatch(result, index))
    .filter((match): match is PriceMatch => Boolean(match))
    .slice(0, 8);
}

function normalizeRetailerName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildComparisonMatches(
  title: string,
  options: { basePrice?: number; exactMatch?: PriceMatch } = {}
): PriceMatch[] {
  const intent = detectQueryIntent(title);
  const basePrice = options.basePrice ?? intent.basePrice;
  const exactRetailer = options.exactMatch ? normalizeRetailerName(options.exactMatch.retailer) : "";
  const titleToken = Buffer.from(intent.canonicalQuery).toString("base64url").slice(0, 10);
  const comparisonMatches = comparisonRetailers
    .filter((retailer) => normalizeRetailerName(retailer.name) !== exactRetailer)
    .map((retailer) => {
      const productUrl = retailer.searchUrl(intent.searchQuery);
      const price = stablePrice(intent.canonicalQuery, retailer.name, basePrice, retailer.multiplier);
      const originalPrice = stableOriginalPrice(price, intent.canonicalQuery, retailer.name);
      const match: PriceMatch = {
        id: `compare-${retailer.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${titleToken}`,
        availability: retailer.availability,
        buyNowUrl: generateAffiliateDeepLink(productUrl),
        currency: "INR",
        logoMark: retailer.logoMark,
        logoTone: retailer.logoTone,
        matchConfidence: "Search" as const,
        discountPercent: calculateDiscountPercent(price, originalPrice),
        originalPrice,
        price,
        priceBasis: "estimated" as const,
        productTitle: `${intent.productLabel} - high-rated search match`,
        productUrl,
        rating: stableRating(intent.canonicalQuery, retailer.name),
        retailer: retailer.name,
        reviewCount: stableReviewCount(intent.canonicalQuery, retailer.name),
        sourceType: "search" as const
      };

      return {
        ...match,
        valueScore: calculateValueScore(match)
      };
    });

  return options.exactMatch
    ? [
        {
          ...options.exactMatch,
          valueScore: calculateValueScore(options.exactMatch)
        },
        ...comparisonMatches
      ]
    : comparisonMatches;
}

function sortMatches(matches: PriceMatch[]) {
  return matches.sort((first, second) => {
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

    const priceDifference = first.price - second.price;
    const ratingDifference = (second.rating ?? 0) - (first.rating ?? 0);

    if (!first.rating && !second.rating && priceDifference !== 0) {
      return priceDifference;
    }

    if (Math.abs(priceDifference) >= 75) {
      return priceDifference;
    }

    if (ratingDifference !== 0) {
      return ratingDifference;
    }

    const valueDifference =
      (second.valueScore ?? calculateValueScore(second)) -
      (first.valueScore ?? calculateValueScore(first));

    return valueDifference || priceDifference || first.retailer.localeCompare(second.retailer);
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PriceFinderRequest;
  const submittedText = getSubmittedText(body.query, body.productUrl, body.imageUrl);
  const productUrl = parseInputUrl(body.productUrl) ?? parseInputUrl(body.imageUrl);

  if (!productUrl) {
    if (submittedText) {
      try {
        const liveMatches = await fetchLiveProductMatches(submittedText);

        if (liveMatches.length > 0) {
          return NextResponse.json({
            matches: sortMatches(liveMatches).slice(0, 7),
            metadata: null,
            mode: "live-search"
          });
        }
      } catch (error) {
        console.error("Unable to fetch live product matches", error);
      }

      return NextResponse.json({
        matches: sortMatches(buildComparisonMatches(submittedText)).slice(0, 6),
        metadata: null,
        mode: "visual-fallback",
        warning:
          "Local mode: showing retailer result pages. Paste a product URL for exact-page metadata."
      });
    }

    return NextResponse.json({
      matches: sortMatches([...fallbackMatches]),
      metadata: null,
      mode: "visual-fallback"
    });
  }

  try {
    const metadata =
      getPriceFinderProvider() === "crawlee"
        ? await fetchProductMetadataViaCrawlee(productUrl).catch(async (error) => {
            console.error("Unable to fetch Crawlee product metadata", error);
            return fetchProductMetadata(productUrl);
          })
        : await fetchProductMetadata(productUrl);
    const exactMatch = buildExactMatch(metadata, productUrl);
    const typicalBasePrice = detectQueryIntent(metadata.title).basePrice;
    const comparisonMatches = buildComparisonMatches(metadata.title, {
      basePrice: metadata.price ? Math.min(metadata.price, typicalBasePrice) : typicalBasePrice,
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
