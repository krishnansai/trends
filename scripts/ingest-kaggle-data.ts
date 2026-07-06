#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
{
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { basename, dirname, resolve } = require("node:path");
const { randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

type Demographic = "menswear" | "womenswear" | "unisex";
type GarmentCategory =
  | "tops"
  | "bottoms"
  | "outerwear"
  | "dresses"
  | "skirts"
  | "blouses"
  | "footwear"
  | "accessories";

type CsvRow = Record<string, string>;

type GarmentInsert = {
  image_url: string;
  year: number;
  category: GarmentCategory;
  demographic: Demographic;
  style_tags: string[];
  color_palette: string[];
  age_group: string;
  description: string;
  source_url: string;
};

type CliOptions = {
  csvPath: string;
  chunkSize: number;
  defaultYear: number;
  defaultImageUrl: string;
  dryRun: boolean;
  limit?: number;
  localFile: string;
  target: "local" | "supabase";
  yearMax: number;
  yearMin: number;
};

const DEFAULT_YEAR_MIN = 2022;
const DEFAULT_YEAR_MAX = 2026;
const DEFAULT_CHUNK_SIZE = 100;
const MENSWEAR_BLOCKED_CATEGORIES = new Set<GarmentCategory>(["dresses", "skirts", "blouses"]);

const FIELD_ALIASES = {
  ageGroup: ["age_group", "agegroup", "age", "target_age", "age_range"],
  articleType: ["article_type", "articletype", "product_type", "producttype", "type"],
  brand: ["brand", "brand_name", "brandname", "manufacturer", "vendor"],
  category: ["category", "master_category", "mastercategory", "sub_category", "subcategory"],
  color: ["color_palette", "colour_palette", "color", "colour", "base_colour", "basecolour"],
  demographic: ["demographic", "gender", "section", "department", "target_gender", "product_gender"],
  description: ["description", "desc", "details", "product_description"],
  fit: ["fit", "fitting", "body_fit", "silhouette"],
  imageUrl: [
    "image_url",
    "imageurl",
    "image",
    "image_link",
    "imagelink",
    "image_src",
    "imagesrc",
    "product_image",
    "productimage",
    "img",
    "img_url",
    "thumbnail"
  ],
  material: ["material", "fabric", "fabric_type", "composition"],
  name: ["product_display_name", "productdisplayname", "product_name", "productname", "title", "name"],
  season: ["season", "usage", "collection", "drop"],
  sourceUrl: ["source_url", "sourceurl", "product_url", "producturl", "url", "link", "pdp_url"],
  styleTags: ["style_tags", "styletags", "tags", "attributes", "attribute", "aesthetic"],
  year: ["year", "release_year", "releaseyear", "season_year", "seasonyear", "created_year"]
} as const;

const COLOR_HEX: Record<string, string> = {
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
  purple: "#6f42c1",
  red: "#b43f2a",
  silver: "#c0c0c0",
  tan: "#c9b89b",
  white: "#ffffff",
  yellow: "#f2c94c"
};

function usage() {
  return [
    "Usage:",
    "  npm run ingest:kaggle -- ./dataset/fashion.csv [options]",
    "",
    "Options:",
    "  --dry-run                         Parse and normalize rows without inserting",
    "  --limit <n>                       Only process the first n CSV rows",
    "  --chunk-size <n>                  Supabase insert chunk size, default 100",
    "  --default-year <year>             Used when no year column exists, default 2026",
    "  --year-min <year>                 Skip rows before this year, default 2022",
    "  --year-max <year>                 Skip rows after this year, default 2026",
    "  --default-image-url <url>         Used when a row has no image URL",
    "  --target <local|supabase>         Storage target, default local",
    "  --local-file <path>               Local JSON file, default data/garments.json",
    "",
    "Environment:",
    "  SUPABASE_URL",
    "  SUPABASE_SERVICE_ROLE_KEY"
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    chunkSize: DEFAULT_CHUNK_SIZE,
    csvPath: "",
    defaultImageUrl: "",
    defaultYear: DEFAULT_YEAR_MAX,
    dryRun: false,
    localFile: "data/garments.json",
    target: "local",
    yearMax: DEFAULT_YEAR_MAX,
    yearMin: DEFAULT_YEAR_MIN
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg) {
      continue;
    }

    if (!arg.startsWith("--") && !options.csvPath) {
      options.csvPath = arg;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === "--chunk-size") {
      options.chunkSize = Number(next);
    } else if (arg === "--default-image-url") {
      options.defaultImageUrl = next;
    } else if (arg === "--default-year") {
      options.defaultYear = Number(next);
    } else if (arg === "--local-file") {
      options.localFile = next;
    } else if (arg === "--limit") {
      options.limit = Number(next);
    } else if (arg === "--target") {
      if (next !== "local" && next !== "supabase") {
        throw new Error("--target must be local or supabase.");
      }
      options.target = next;
    } else if (arg === "--year-max") {
      options.yearMax = Number(next);
    } else if (arg === "--year-min") {
      options.yearMin = Number(next);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }

    index += 1;
  }

  if (!options.csvPath) {
    throw new Error("CSV path is required.");
  }

  if (!Number.isInteger(options.chunkSize) || options.chunkSize < 1) {
    throw new Error("--chunk-size must be a positive integer.");
  }

  return options;
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    return;
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
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

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCsv(text: string): CsvRow[] {
  const records: string[][] = [];
  let currentField = "";
  let currentRecord: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRecord.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      currentRecord.push(currentField);
      records.push(currentRecord);
      currentRecord = [];
      currentField = "";
      continue;
    }

    currentField += char;
  }

  if (currentField || currentRecord.length) {
    currentRecord.push(currentField);
    records.push(currentRecord);
  }

  const [headers, ...dataRows] = records.filter((record) =>
    record.some((field) => field.trim().length > 0)
  );

  if (!headers?.length) {
    return [];
  }

  const normalizedHeaders = headers.map(normalizeKey);
  return dataRows.map((record) => {
    const row: CsvRow = {};
    normalizedHeaders.forEach((header, index) => {
      row[header] = (record[index] ?? "").trim();
    });
    return row;
  });
}

function getField(row: CsvRow, aliases: readonly string[]) {
  for (const alias of aliases) {
    const value = row[normalizeKey(alias)];
    if (value) {
      return value.trim();
    }
  }
  return "";
}

function splitValues(value: string) {
  if (!value) {
    return [];
  }

  return value
    .replace(/^\[|\]$/g, "")
    .replace(/"/g, "")
    .split(/[|,;/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeYear(row: CsvRow, options: CliOptions) {
  const explicitYear = getField(row, FIELD_ALIASES.year);
  const season = getField(row, FIELD_ALIASES.season);
  const yearMatch = `${explicitYear} ${season}`.match(/\b(20\d{2})\b/);
  return yearMatch ? Number(yearMatch[1]) : options.defaultYear;
}

function normalizeDemographic(row: CsvRow, category: GarmentCategory): Demographic {
  const value = getField(row, FIELD_ALIASES.demographic).toLowerCase();

  if (/(^|[^a-z])(man|men|mens|male|boy|boys)([^a-z]|$)/.test(value)) {
    return "menswear";
  }

  if (/(^|[^a-z])(woman|women|womens|female|girl|girls|ladies|lady)([^a-z]|$)/.test(value)) {
    return "womenswear";
  }

  if (/(^|[^a-z])(unisex|uni|all gender|gender neutral)([^a-z]|$)/.test(value)) {
    return "unisex";
  }

  if (MENSWEAR_BLOCKED_CATEGORIES.has(category)) {
    return "womenswear";
  }

  return "unisex";
}

function normalizeCategory(row: CsvRow): GarmentCategory {
  const value = [
    getField(row, FIELD_ALIASES.category),
    getField(row, FIELD_ALIASES.articleType),
    getField(row, FIELD_ALIASES.name),
    getField(row, FIELD_ALIASES.description)
  ]
    .join(" ")
    .toLowerCase();

  if (/\b(dress|gown|saree|sari)\b/.test(value)) {
    return "dresses";
  }

  if (/\b(skirt|skorts)\b/.test(value)) {
    return "skirts";
  }

  if (/\b(blouse|camisole)\b/.test(value)) {
    return "blouses";
  }

  if (/\b(shoe|sneaker|boot|loafer|sandal|heel|footwear)\b/.test(value)) {
    return "footwear";
  }

  if (/\b(bag|belt|watch|glasses|sunglasses|hat|cap|scarf|jewelry|jewellery|accessor)/.test(value)) {
    return "accessories";
  }

  if (/\b(jacket|coat|blazer|hoodie|sweater|sweatshirt|cardigan|outerwear)\b/.test(value)) {
    return "outerwear";
  }

  if (/\b(pant|pants|trouser|jean|shorts|chino|bottom|legging)\b/.test(value)) {
    return "bottoms";
  }

  return "tops";
}

function normalizeColorPalette(row: CsvRow) {
  const values = splitValues(getField(row, FIELD_ALIASES.color));
  const colors = values
    .map((value) => value.toLowerCase().trim())
    .map((value) => {
      const hexMatch = value.match(/#[0-9a-f]{6}\b/i);
      return hexMatch ? hexMatch[0].toLowerCase() : COLOR_HEX[value] ?? "";
    })
    .filter(Boolean);

  return dedupe(colors).slice(0, 5);
}

function normalizeStyleTags(row: CsvRow, category: GarmentCategory, demographic: Demographic) {
  const rawValues = [
    ...splitValues(getField(row, FIELD_ALIASES.styleTags)),
    getField(row, FIELD_ALIASES.articleType),
    getField(row, FIELD_ALIASES.material),
    getField(row, FIELD_ALIASES.fit),
    getField(row, FIELD_ALIASES.season),
    getField(row, FIELD_ALIASES.brand),
    category,
    demographic
  ];

  return dedupe(
    rawValues
      .flatMap((value) => splitValues(value).length ? splitValues(value) : [value])
      .map((value) => value.toLowerCase())
  ).slice(0, 12);
}

function normalizeImageUrl(row: CsvRow, options: CliOptions) {
  const imageUrl = getField(row, FIELD_ALIASES.imageUrl);
  if (imageUrl) {
    return imageUrl;
  }

  return options.defaultImageUrl;
}

function mapRowToGarment(row: CsvRow, options: CliOptions): { row?: GarmentInsert; skip?: string } {
  const year = normalizeYear(row, options);
  if (year < options.yearMin || year > options.yearMax) {
    return { skip: `year ${year} outside ${options.yearMin}-${options.yearMax}` };
  }

  const category = normalizeCategory(row);
  const demographic = normalizeDemographic(row, category);

  if (demographic === "menswear" && MENSWEAR_BLOCKED_CATEGORIES.has(category)) {
    return { skip: `blocked menswear category ${category}` };
  }

  const imageUrl = normalizeImageUrl(row, options);
  if (!imageUrl) {
    return { skip: "missing image URL" };
  }

  const name = getField(row, FIELD_ALIASES.name);
  const description = getField(row, FIELD_ALIASES.description) || name;
  const sourceUrl = getField(row, FIELD_ALIASES.sourceUrl);

  return {
    row: {
      age_group: getField(row, FIELD_ALIASES.ageGroup) || "18-44",
      category,
      color_palette: normalizeColorPalette(row),
      demographic,
      description: description || `${demographic} ${category} look from ${year}`,
      image_url: imageUrl,
      source_url: sourceUrl,
      style_tags: normalizeStyleTags(row, category, demographic),
      year
    }
  };
}

function summarizeSkips(skips: string[]) {
  const counts = new Map<string, number>();
  for (const reason of skips) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((first, second) => second[1] - first[1])
    .map(([reason, count]) => `- ${reason}: ${count}`)
    .join("\n");
}

async function insertRows(rows: GarmentInsert[], options: CliOptions) {
  loadEnvFile(resolve(".env.local"));
  loadEnvFile(resolve(".env"));

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running ingestion.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  let inserted = 0;
  for (let index = 0; index < rows.length; index += options.chunkSize) {
    const chunk = rows.slice(index, index + options.chunkSize);
    const { error } = await supabase.from("garments").insert(chunk);

    if (error) {
      throw new Error(`Supabase insert failed at row ${index + 1}: ${error.message}`);
    }

    inserted += chunk.length;
    console.log(`Inserted ${inserted}/${rows.length} garments`);
  }
}

function readLocalRows(path: string) {
  if (!existsSync(path)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return Array.isArray(parsed) ? parsed : [];
}

function insertLocalRows(rows: GarmentInsert[], options: CliOptions) {
  const localFile = resolve(options.localFile);
  const existingRows = readLocalRows(localFile);
  const now = new Date().toISOString();
  const rowsWithIds = rows.map((row) => ({
    id: `local-garment-${randomUUID()}`,
    created_at: now,
    ...row
  }));

  mkdirSync(dirname(localFile), { recursive: true });
  writeFileSync(localFile, `${JSON.stringify([...existingRows, ...rowsWithIds], null, 2)}\n`);
  console.log(`Inserted ${rowsWithIds.length} garments into ${localFile}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const csvPath = resolve(options.csvPath);

  if (!existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  const limitedRows = options.limit ? rows.slice(0, options.limit) : rows;
  const mappedRows: GarmentInsert[] = [];
  const skips: string[] = [];

  for (const row of limitedRows) {
    const mapped = mapRowToGarment(row, options);
    if (mapped.row) {
      mappedRows.push(mapped.row);
    } else if (mapped.skip) {
      skips.push(mapped.skip);
    }
  }

  console.log(`Read ${rows.length} rows from ${basename(csvPath)}`);
  console.log(`Mapped ${mappedRows.length} garment rows`);
  console.log(`Skipped ${skips.length} rows`);

  if (skips.length) {
    console.log("\nSkip summary:");
    console.log(summarizeSkips(skips));
  }

  if (mappedRows.length) {
    console.log("\nSample normalized rows:");
    console.log(JSON.stringify(mappedRows.slice(0, 3), null, 2));
  }

  if (options.dryRun) {
    console.log("\nDry run complete. No rows inserted.");
    return;
  }

  if (options.target === "local") {
    insertLocalRows(mappedRows, options);
    return;
  }

  await insertRows(mappedRows, options);
  console.log(`\nInserted ${mappedRows.length} garments into Supabase.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  console.error("");
  console.error(usage());
  process.exit(1);
});
}
