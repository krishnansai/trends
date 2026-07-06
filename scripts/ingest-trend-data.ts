#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
{
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { basename, dirname, resolve } = require("node:path");
const { randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

type CsvRow = Record<string, string>;

type TrendInsert = {
  title: string;
  description: string;
  forecast_year: number;
  confidence_score: number;
  season: string;
  forecast_image_url: string;
  source_url: string;
};

type CliOptions = {
  chunkSize: number;
  csvPath: string;
  defaultImageUrl: string;
  dryRun: boolean;
  limit?: number;
  localFile: string;
  target: "local" | "supabase";
  yearMax: number;
  yearMin: number;
};

const DEFAULT_YEAR_MIN = 2022;
const DEFAULT_YEAR_MAX = 2028;
const DEFAULT_CHUNK_SIZE = 100;

const FIELD_ALIASES = {
  confidence: ["confidence_score", "confidence", "score", "trend_score", "popularity", "rank_score"],
  description: ["description", "desc", "summary", "rationale", "details"],
  imageUrl: [
    "forecast_image_url",
    "image_url",
    "image",
    "image_link",
    "thumbnail",
    "look_image",
    "runway_image"
  ],
  season: ["season", "collection", "drop", "fashion_season"],
  sourceUrl: ["source_url", "source", "url", "link", "article_url", "collection_url"],
  title: ["title", "trend", "trend_name", "aesthetic", "style", "name"],
  year: ["forecast_year", "year", "season_year", "collection_year"]
} as const;

function usage() {
  return [
    "Usage:",
    "  npm run ingest:trends -- ./dataset/trends.csv [options]",
    "",
    "Options:",
    "  --dry-run                         Parse and normalize rows without inserting",
    "  --limit <n>                       Only process the first n CSV rows",
    "  --chunk-size <n>                  Supabase insert chunk size, default 100",
    "  --year-min <year>                 Skip rows before this year, default 2022",
    "  --year-max <year>                 Skip rows after this year, default 2028",
    "  --default-image-url <url>         Used when a row has no image URL",
    "  --target <local|supabase>         Storage target, default local",
    "  --local-file <path>               Local JSON file, default data/trends.json",
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
    dryRun: false,
    localFile: "data/trends.json",
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeYear(row: CsvRow) {
  const raw = `${getField(row, FIELD_ALIASES.year)} ${getField(row, FIELD_ALIASES.season)}`;
  const yearMatch = raw.match(/\b(20\d{2})\b/);
  return yearMatch ? Number(yearMatch[1]) : 2026;
}

function normalizeConfidence(row: CsvRow) {
  const raw = getField(row, FIELD_ALIASES.confidence);
  const value = Number(raw.replace("%", ""));

  if (Number.isFinite(value)) {
    return clamp(Math.round(value), 0, 100);
  }

  return 70;
}

function mapRowToTrend(row: CsvRow, options: CliOptions): { row?: TrendInsert; skip?: string } {
  const forecastYear = normalizeYear(row);
  if (forecastYear < options.yearMin || forecastYear > options.yearMax) {
    return { skip: `year ${forecastYear} outside ${options.yearMin}-${options.yearMax}` };
  }

  const title = getField(row, FIELD_ALIASES.title);
  const sourceUrl = getField(row, FIELD_ALIASES.sourceUrl);

  if (!title) {
    return { skip: "missing title" };
  }

  if (!sourceUrl) {
    return { skip: "missing source URL" };
  }

  const forecastImageUrl = getField(row, FIELD_ALIASES.imageUrl) || options.defaultImageUrl;

  if (!forecastImageUrl) {
    return { skip: "missing image URL" };
  }

  return {
    row: {
      confidence_score: normalizeConfidence(row),
      description: getField(row, FIELD_ALIASES.description) || title,
      forecast_image_url: forecastImageUrl,
      forecast_year: forecastYear,
      season: getField(row, FIELD_ALIASES.season) || `${forecastYear}`,
      source_url: sourceUrl,
      title
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

async function insertRows(rows: TrendInsert[], options: CliOptions) {
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
    const { error } = await supabase.from("trends").insert(chunk);

    if (error) {
      throw new Error(`Supabase insert failed at row ${index + 1}: ${error.message}`);
    }

    inserted += chunk.length;
    console.log(`Inserted ${inserted}/${rows.length} trends`);
  }
}

function readLocalRows(path: string) {
  if (!existsSync(path)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return Array.isArray(parsed) ? parsed : [];
}

function insertLocalRows(rows: TrendInsert[], options: CliOptions) {
  const localFile = resolve(options.localFile);
  const existingRows = readLocalRows(localFile);
  const now = new Date().toISOString();
  const rowsWithIds = rows.map((row) => ({
    id: `local-trend-${randomUUID()}`,
    created_at: now,
    ...row
  }));

  mkdirSync(dirname(localFile), { recursive: true });
  writeFileSync(localFile, `${JSON.stringify([...existingRows, ...rowsWithIds], null, 2)}\n`);
  console.log(`Inserted ${rowsWithIds.length} trends into ${localFile}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const csvPath = resolve(options.csvPath);

  if (!existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  const limitedRows = options.limit ? rows.slice(0, options.limit) : rows;
  const mappedRows: TrendInsert[] = [];
  const skips: string[] = [];

  for (const row of limitedRows) {
    const mapped = mapRowToTrend(row, options);
    if (mapped.row) {
      mappedRows.push(mapped.row);
    } else if (mapped.skip) {
      skips.push(mapped.skip);
    }
  }

  console.log(`Read ${rows.length} rows from ${basename(csvPath)}`);
  console.log(`Mapped ${mappedRows.length} trend rows`);
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
  console.log(`\nInserted ${mappedRows.length} trends into Supabase.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  console.error("");
  console.error(usage());
  process.exit(1);
});
}
