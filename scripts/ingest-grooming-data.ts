#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
{
const { existsSync, readFileSync } = require("node:fs");
const { basename, resolve } = require("node:path");
const { createClient } = require("@supabase/supabase-js");

type GroomingCategory = "hairstyle" | "beard";
type FaceShape = "oval" | "square" | "round" | "heart" | "rectangle" | "diamond" | "oblong";

type RecommendedProduct = {
  name: string;
  search_query: string;
};

type GroomingTrendInsert = {
  id: string;
  year: number;
  category: GroomingCategory;
  title: string;
  description: string;
  face_shapes: FaceShape[];
  style_tags: string[];
  maintenance_level?: string;
  recommended_products: RecommendedProduct[];
  image_url: string;
};

type CliOptions = {
  chunkSize: number;
  dryRun: boolean;
  seedFiles: string[];
};

const DEFAULT_CHUNK_SIZE = 100;
const groomingCategories = new Set<GroomingCategory>(["hairstyle", "beard"]);
const faceShapes = new Set<FaceShape>([
  "oval",
  "square",
  "round",
  "heart",
  "rectangle",
  "diamond",
  "oblong"
]);

function usage() {
  return [
    "Usage:",
    "  npm run ingest:grooming -- [options]",
    "",
    "Options:",
    "  --dry-run                         Validate rows without inserting",
    "  --chunk-size <n>                  Supabase upsert chunk size, default 100",
    "  --seed-file <path>                Seed JSON file, repeatable",
    "",
    "Environment:",
    "  SUPABASE_URL",
    "  SUPABASE_SERVICE_ROLE_KEY"
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    chunkSize: DEFAULT_CHUNK_SIZE,
    dryRun: false,
    seedFiles: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg) {
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
    } else if (arg === "--seed-file") {
      options.seedFiles.push(next);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }

    index += 1;
  }

  if (!Number.isInteger(options.chunkSize) || options.chunkSize < 1) {
    throw new Error("--chunk-size must be a positive integer.");
  }

  if (options.seedFiles.length === 0) {
    options.seedFiles = ["data/grooming-seed.json", "data/grooming-seed-v2.json"];
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

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function assertSeedRow(value: unknown, index: number): GroomingTrendInsert {
  if (!value || typeof value !== "object") {
    throw new Error(`Seed row ${index + 1} must be an object.`);
  }

  const row = value as Partial<GroomingTrendInsert>;
  if (!row.id || typeof row.id !== "string") {
    throw new Error(`Seed row ${index + 1} is missing id.`);
  }

  if (!Number.isInteger(row.year)) {
    throw new Error(`Seed row ${row.id} has an invalid year.`);
  }

  if (!row.category || !groomingCategories.has(row.category)) {
    throw new Error(`Seed row ${row.id} has an invalid category.`);
  }

  if (!row.title || typeof row.title !== "string") {
    throw new Error(`Seed row ${row.id} is missing title.`);
  }

  if (typeof row.description !== "string") {
    throw new Error(`Seed row ${row.id} is missing description.`);
  }

  if (!isStringArray(row.face_shapes) || !row.face_shapes.every((shape) => faceShapes.has(shape as FaceShape))) {
    throw new Error(`Seed row ${row.id} has invalid face_shapes.`);
  }

  if (!isStringArray(row.style_tags)) {
    throw new Error(`Seed row ${row.id} has invalid style_tags.`);
  }

  if (row.maintenance_level && typeof row.maintenance_level !== "string") {
    throw new Error(`Seed row ${row.id} has invalid maintenance_level.`);
  }

  if (
    !Array.isArray(row.recommended_products) ||
    !row.recommended_products.every((product) => {
      return (
        product &&
        typeof product === "object" &&
        typeof product.name === "string" &&
        typeof product.search_query === "string"
      );
    })
  ) {
    throw new Error(`Seed row ${row.id} has invalid recommended_products.`);
  }

  if (!row.image_url || typeof row.image_url !== "string") {
    throw new Error(`Seed row ${row.id} is missing image_url.`);
  }

  return row as GroomingTrendInsert;
}

function readSeedRows(path: string) {
  const resolvedPath = resolve(path);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Seed file not found: ${resolvedPath}`);
  }

  const parsed = JSON.parse(readFileSync(resolvedPath, "utf8")) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Seed file must contain a JSON array.");
  }

  return parsed.map(assertSeedRow);
}

function readAllSeedRows(paths: string[]) {
  const rowMap = new Map<string, GroomingTrendInsert>();

  for (const path of paths) {
    const rows = readSeedRows(path);
    for (const row of rows) {
      rowMap.set(row.id, row);
    }
  }

  return Array.from(rowMap.values());
}

async function upsertRows(rows: GroomingTrendInsert[], options: CliOptions) {
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
    const { error } = await supabase
      .from("grooming_trends")
      .upsert(chunk, { onConflict: "id" });

    if (error) {
      throw new Error(`Supabase upsert failed at row ${index + 1}: ${error.message}`);
    }

    inserted += chunk.length;
    console.log(`Upserted ${inserted}/${rows.length} grooming trends`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rows = readAllSeedRows(options.seedFiles);

  console.log(
    `Read ${rows.length} grooming rows from ${options.seedFiles.map((path) => basename(path)).join(", ")}`
  );
  console.log(JSON.stringify(rows.slice(0, 2), null, 2));

  if (options.dryRun) {
    console.log("\nDry run complete. No rows inserted.");
    return;
  }

  await upsertRows(rows, options);
  console.log(`\nUpserted ${rows.length} grooming trends into Supabase.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  console.error("");
  console.error(usage());
  process.exit(1);
});
}
