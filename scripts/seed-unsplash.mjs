#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_LIMIT = 50;
const DEFAULT_LOCAL_FILE = "data/garments-unsplash.json";
const DEFAULT_QUERY = "modern streetwear lookbook";
const DEFAULT_YEAR = 2026;
const PER_PAGE = 30;
const MIN_VERTICAL_RATIO = 1.15;

const colorHex = {
  beige: "#d9d0c1",
  black: "#111111",
  blue: "#0057b8",
  brown: "#6f4e37",
  charcoal: "#36454f",
  cream: "#f5f0e8",
  gold: "#c8a951",
  gray: "#808080",
  green: "#4f6f52",
  grey: "#808080",
  ivory: "#fffff0",
  khaki: "#c3b091",
  navy: "#1d2636",
  olive: "#6b705c",
  orange: "#d96b27",
  pink: "#e6a5b8",
  red: "#b43f2a",
  silver: "#c0c0c0",
  stone: "#d9d0c1",
  tan: "#c9b89b",
  white: "#ffffff"
};

function usage() {
  return [
    "Usage:",
    "  npm run seed:unsplash -- [options]",
    "",
    "Options:",
    `  --query <text>              Search query, default "${DEFAULT_QUERY}"`,
    "  --queries <a|b|c>           Pipe-separated query list",
    `  --limit <n>                 Max photos to fetch, default ${DEFAULT_LIMIT}`,
    "  --orientation <value>       landscape, portrait, or squarish; default portrait",
    "  --demographic <value>       menswear, womenswear, unisex, or auto; default auto",
    `  --year <year>               Archive year, default ${DEFAULT_YEAR}`,
    `  --local-file <path>         Output JSON file, default ${DEFAULT_LOCAL_FILE}`,
    "  --dry-run                   Fetch and normalize without writing",
    "",
    "Quality guards:",
    `  - Saves only vertical images with height/width >= ${MIN_VERTICAL_RATIO}`,
    "  - Skips duplicate Unsplash URLs across repeated runs",
    "  - Adds fallback fabric/GSM tags from detected keywords",
    "",
    "Environment:",
    "  UNSPLASH_ACCESS_KEY         Required Unsplash API access key"
  ].join("\n");
}

function loadEnvFile(fileName) {
  if (!existsSync(fileName)) {
    return;
  }

  const lines = readFileSync(fileName, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const options = {
    demographic: "auto",
    dryRun: false,
    limit: DEFAULT_LIMIT,
    localFile: DEFAULT_LOCAL_FILE,
    orientation: "portrait",
    queries: [DEFAULT_QUERY],
    year: DEFAULT_YEAR
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === "--demographic") {
      options.demographic = next;
    } else if (arg === "--limit") {
      options.limit = Number(next);
    } else if (arg === "--local-file") {
      options.localFile = next;
    } else if (arg === "--orientation") {
      options.orientation = next;
    } else if (arg === "--queries") {
      options.queries = next
        .split("|")
        .map((query) => query.trim())
        .filter(Boolean);
    } else if (arg === "--query") {
      options.queries = [next];
    } else if (arg === "--year") {
      options.year = Number(next);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }

    index += 1;
  }

  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error("--limit must be a positive integer.");
  }

  if (!Number.isInteger(options.year) || options.year < 2022 || options.year > 2026) {
    throw new Error("--year must be between 2022 and 2026.");
  }

  if (!["auto", "menswear", "womenswear", "unisex"].includes(options.demographic)) {
    throw new Error("--demographic must be auto, menswear, womenswear, or unisex.");
  }

  if (!["landscape", "portrait", "squarish"].includes(options.orientation)) {
    throw new Error("--orientation must be landscape, portrait, or squarish.");
  }

  return options;
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeHex(value, fallback = "#d9d0c1") {
  return /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value).toLowerCase() : fallback;
}

function inferDemographic(text, requestedDemographic) {
  if (requestedDemographic !== "auto") {
    return requestedDemographic;
  }

  if (/\b(women|woman|female|womenswear|dress|skirt|blouse)\b/.test(text)) {
    return "womenswear";
  }

  if (/\b(men|man|male|menswear|beard|barber)\b/.test(text)) {
    return "menswear";
  }

  return "unisex";
}

function inferCategory(text, demographic) {
  if (/\b(sneaker|shoe|shoes|loafer|boot|sandal|footwear)\b/.test(text)) {
    return "footwear";
  }

  if (/\b(jacket|coat|parka|overshirt|outerwear|blazer)\b/.test(text)) {
    return "outerwear";
  }

  if (/\b(jean|denim|pant|pants|trouser|trousers|shorts|cargo)\b/.test(text)) {
    return "bottoms";
  }

  if (demographic === "womenswear" && /\b(dress|gown)\b/.test(text)) {
    return "dresses";
  }

  if (demographic === "womenswear" && /\b(skirt)\b/.test(text)) {
    return "skirts";
  }

  if (demographic === "womenswear" && /\b(blouse)\b/.test(text)) {
    return "blouses";
  }

  return "tops";
}

function inferFit(text) {
  if (/\bboxy\b/.test(text)) {
    return "boxy";
  }

  if (/\boversized|baggy|wide\b/.test(text)) {
    return "oversized";
  }

  if (/\bslim|skinny|tailored\b/.test(text)) {
    return "slim";
  }

  if (/\bstraight\b/.test(text)) {
    return "straight";
  }

  if (/\brelaxed|loose|flowy|drape\b/.test(text)) {
    return "relaxed";
  }

  return "regular";
}

function inferOccasion(text) {
  const occasions = [];

  if (/\bbeach|pool|resort|vacation|coastal\b/.test(text)) {
    occasions.push("beach", "vacation");
  }

  if (/\bgym|athletic|sport|workout|training\b/.test(text)) {
    occasions.push("gym", "athletic");
  }

  if (/\boffice|formal|business|meeting|wedding|tailoring\b/.test(text)) {
    occasions.push("formal", "office");
  }

  if (/\bstreet|streetwear|mall|casual|lookbook|minimalist\b/.test(text)) {
    occasions.push("mall", "street", "casual");
  }

  return unique(occasions.length ? occasions : ["mall", "street", "casual"]);
}

function inferSeason(text) {
  if (/\bwinter|cold|snow|wool|puffer|coat|layering\b/.test(text)) {
    return ["winter", "all-season"];
  }

  if (/\bsummer|hot|linen|beach|resort|vacation|breathable\b/.test(text)) {
    return ["summer"];
  }

  return ["all-season"];
}

function inferTags(text, photoTags) {
  const tags = [];

  if (/\bstreetwear|street\b/.test(text)) {
    tags.push("streetwear", "urban");
  }

  if (/\bminimal|minimalist|quiet\b/.test(text)) {
    tags.push("minimalist", "quiet-luxury");
  }

  if (/\bold money|resort|linen|beach\b/.test(text)) {
    tags.push("resort", "old-money");
  }

  if (/\bboxy|oversized|relaxed\b/.test(text)) {
    tags.push("relaxed", "oversized");
  }

  if (/\boffice|formal|wedding|tailor\b/.test(text)) {
    tags.push("smart-casual", "tailoring");
  }

  if (/\bhoodie|sweatshirt|jacket|coat|overshirt|puffer\b/.test(text)) {
    tags.push("heavyweight-240gsm");
  }

  if (/\blinen|resort|beach|vacation|breathable|summer\b/.test(text)) {
    tags.push("breathable-linen", "lightweight-180gsm");
  }

  if (/\bdenim|jean|workwear|utility\b/.test(text)) {
    tags.push("raw-denim", "utility");
  }

  if (/\btrench|rain|rainy|nylon|shell|weather\b/.test(text)) {
    tags.push("weather-resistant");
  }

  if (/\bwool|knit|cardigan|sweater\b/.test(text)) {
    tags.push("wool-blend", "textured");
  }

  tags.push(...photoTags);

  return unique(tags.map((tag) => normalizeText(tag)).filter((tag) => tag.length > 2)).slice(0, 10);
}

function inferPalette(photoColor, text) {
  const palette = [normalizeHex(photoColor)];
  const matchedColors = Object.entries(colorHex)
    .filter(([name]) => text.includes(name))
    .map(([, hex]) => hex.toLowerCase());

  return unique([...palette, ...matchedColors, "#111111", "#f5f0e8"]).slice(0, 4);
}

function getPhotoTags(photo) {
  return Array.isArray(photo.tags)
    ? photo.tags
      .map((tag) => tag?.title)
      .filter((tag) => typeof tag === "string")
    : [];
}

function getImageUrl(photo) {
  if (photo.urls?.raw) {
    return `${photo.urls.raw}&w=900&fit=crop&crop=faces,edges&auto=format&q=85`;
  }

  return photo.urls?.regular ?? "";
}

function getSourceUrl(photo) {
  const url = photo.links?.html ?? `https://unsplash.com/photos/${photo.id}`;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}utm_source=personal_stylist_archive&utm_medium=referral`;
}

function normalizePhoto(photo, query, options) {
  const photoTags = getPhotoTags(photo);
  const text = normalizeText(
    [
      query,
      photo.alt_description,
      photo.description,
      photo.user?.name,
      ...photoTags
    ].join(" ")
  );
  const demographic = inferDemographic(text, options.demographic);
  const category = inferCategory(text, demographic);
  const fit = inferFit(text);
  const titleSeed = photo.alt_description || photo.description || query;
  const photographer = photo.user?.name ? ` by ${photo.user.name}` : "";

  return {
    age_group: "18-44",
    category,
    color_palette: inferPalette(photo.color, text),
    created_at: new Date().toISOString(),
    demographic,
    description: `Unsplash editorial fashion image${photographer}, normalized for the ${query} archive seed.`,
    fit_profile: fit,
    id: `gar-unsplash-${options.year}-${String(photo.id).replace(/[^a-zA-Z0-9_-]/g, "")}`,
    image_url: getImageUrl(photo),
    occasion: inferOccasion(text),
    season: inferSeason(text),
    source_url: getSourceUrl(photo),
    style_tags: inferTags(text, photoTags),
    title: titleCase(normalizeText(titleSeed)).slice(0, 84) || titleCase(query),
    year: options.year
  };
}

async function fetchUnsplashPage(accessKey, query, page, orientation) {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("client_id", accessKey);
  url.searchParams.set("content_filter", "high");
  url.searchParams.set("orientation", orientation);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("query", query);

  const response = await fetch(url);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Unsplash request failed (${response.status}): ${message.slice(0, 180)}`);
  }

  return response.json();
}

function isVerticalPhoto(photo) {
  const width = Number(photo.width);
  const height = Number(photo.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }

  return height / width >= MIN_VERTICAL_RATIO;
}

async function fetchPhotos(accessKey, options) {
  const photos = [];
  let skippedHorizontal = 0;
  const perQueryLimit = Math.ceil(options.limit / options.queries.length);

  for (const query of options.queries) {
    let page = 1;

    while (photos.filter((photo) => photo.query === query).length < perQueryLimit) {
      const data = await fetchUnsplashPage(accessKey, query, page, options.orientation);
      const results = Array.isArray(data.results) ? data.results : [];

      if (results.length === 0) {
        break;
      }

      const verticalResults = results.filter(isVerticalPhoto);
      skippedHorizontal += results.length - verticalResults.length;
      photos.push(...verticalResults.map((photo) => ({ ...photo, query })));

      if (photos.length >= options.limit) {
        return {
          photos: photos.slice(0, options.limit),
          skippedHorizontal
        };
      }

      if (page >= Number(data.total_pages ?? page)) {
        break;
      }

      page += 1;
    }
  }

  return {
    photos: photos.slice(0, options.limit),
    skippedHorizontal
  };
}

function readJsonArray(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8"));

  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON array.`);
  }

  return parsed;
}

function writeJsonArray(filePath, records) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(records, null, 2)}\n`);
}

function normalizeUrlKey(value) {
  if (typeof value !== "string" || !value) {
    return "";
  }

  try {
    const url = new URL(value);
    url.searchParams.delete("utm_source");
    url.searchParams.delete("utm_medium");
    url.searchParams.delete("utm_campaign");
    return url.toString();
  } catch {
    return value;
  }
}

function mergeByIdAndUrl(existingRecords, nextRecords) {
  const recordMap = new Map(existingRecords.map((record) => [record.id, record]));
  const imageUrls = new Set(existingRecords.map((record) => normalizeUrlKey(record.image_url)));
  const sourceUrls = new Set(existingRecords.map((record) => normalizeUrlKey(record.source_url)));
  let duplicatesSkipped = 0;

  for (const record of nextRecords) {
    const imageUrl = normalizeUrlKey(record.image_url);
    const sourceUrl = normalizeUrlKey(record.source_url);

    if (!recordMap.has(record.id) && (imageUrls.has(imageUrl) || sourceUrls.has(sourceUrl))) {
      duplicatesSkipped += 1;
      continue;
    }

    recordMap.set(record.id, record);
    imageUrls.add(imageUrl);
    sourceUrls.add(sourceUrl);
  }

  return {
    duplicatesSkipped,
    records: Array.from(recordMap.values()).sort((first, second) =>
      String(first.id).localeCompare(String(second.id))
    )
  };
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const options = parseArgs(process.argv.slice(2));
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    throw new Error("UNSPLASH_ACCESS_KEY is required. Add it to .env.local or export it in your shell.");
  }

  const { photos, skippedHorizontal } = await fetchPhotos(accessKey, options);
  const nextRecords = photos
    .map((photo) => normalizePhoto(photo, photo.query, options))
    .filter((record) => record.image_url && record.source_url);
  const outputPath = resolve(options.localFile);
  const existingRecords = readJsonArray(outputPath);
  const { duplicatesSkipped, records: mergedRecords } = mergeByIdAndUrl(existingRecords, nextRecords);

  if (!options.dryRun) {
    writeJsonArray(outputPath, mergedRecords);
  }

  const demographicCounts = nextRecords.reduce((counts, record) => {
    counts[record.demographic] = (counts[record.demographic] ?? 0) + 1;
    return counts;
  }, {});

  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        duplicatesSkipped,
        fetched: photos.length,
        normalized: nextRecords.length,
        output: options.localFile,
        queries: options.queries,
        skippedHorizontal,
        totalRecordsInFile: mergedRecords.length,
        demographicCounts
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
