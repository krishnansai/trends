#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
{
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

type JsonRecord = Record<string, unknown>;

const DATA_DIR = join(process.cwd(), "data");

const garmentFiles = [
  "garments.json",
  "garments-sourced.json",
  "garments-visuals.json",
  "garments-unsplash.json",
  "garments-womenswear.json",
  "garments-womenswear-latest-2026.json",
  "garments-launch-pack.json",
  "garments-context-expansion.json",
  "garments-latest-trends-2026.json",
  "garments-ultra-latest-2026.json",
  "garments-photo-profile-2026.json",
  "garments-accessories-footwear-2026.json",
  "garments-youtube-2026.json",
  "garments-video-trends-2024-2026.json"
];
const garmentCsvFiles = ["garments-pro-launch.csv"];
const trendFiles = [
  "trends.json",
  "trends-sourced.json",
  "trends-launch-pack.json",
  "trends-pro-launch.json",
  "trends-latest-2026.json",
  "trends-ultra-latest-2026.json",
  "trends-photo-profile-2026.json"
];
const groomingFiles = [
  "grooming-seed.json",
  "grooming-seed-v2.json",
  "grooming-launch-pack.json",
  "grooming-pro-launch.json",
  "grooming-ultra-latest-2026.json"
];
const stylistRuleFiles = ["stylist-filter-rules.json"];

const demographics = new Set(["menswear", "womenswear", "unisex"]);
const garmentCategories = new Set([
  "tops",
  "bottoms",
  "outerwear",
  "dresses",
  "skirts",
  "blouses",
  "footwear",
  "accessories",
  "accessory_watch",
  "accessory_jewelry",
  "accessory_bag",
  "accessory_headwear",
  "accessory_sunglasses"
]);
const fitProfiles = new Set(["slim", "regular", "relaxed", "oversized", "straight", "boxy"]);
const occasions = new Set([
  "mall",
  "street",
  "beach",
  "vacation",
  "gym",
  "athletic",
  "sporty",
  "formal",
  "office",
  "casual",
  "pool",
  "outdoor",
  "travel"
]);
const seasons = new Set(["summer", "winter", "all-season"]);
const ageBands = new Set(["young_adult", "adult", "mature"]);
const faceShapes = new Set(["oval", "square", "round", "heart", "rectangle", "diamond", "oblong"]);
const groomingCategories = new Set(["hairstyle", "beard"]);

const errors: string[] = [];

function readArray(fileName: string): JsonRecord[] {
  const path = join(DATA_DIR, fileName);

  if (!existsSync(path)) {
    errors.push(`${fileName}: missing file`);
    return [];
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));

    if (!Array.isArray(parsed)) {
      errors.push(`${fileName}: expected top-level array`);
      return [];
    }

    return parsed;
  } catch (error) {
    errors.push(`${fileName}: invalid JSON (${error instanceof Error ? error.message : "unknown error"})`);
    return [];
  }
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && nextChar === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function splitList(value: unknown) {
  return typeof value === "string"
    ? value
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
    : [];
}

function readGarmentCsv(fileName: string): JsonRecord[] {
  const path = join(DATA_DIR, fileName);

  if (!existsSync(path)) {
    errors.push(`${fileName}: missing file`);
    return [];
  }

  const lines = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean);
  const [headerLine, ...rows] = lines;

  if (!headerLine) {
    errors.push(`${fileName}: missing header`);
    return [];
  }

  const headers = parseCsvLine(headerLine);

  return rows.map((row: string, rowIndex: number) => {
    const values = parseCsvLine(row);
    const record = headers.reduce<JsonRecord>((item, header, index) => {
      item[header] = values[index] ?? "";
      return item;
    }, {});

    return {
      ...record,
      color_palette: splitList(record.color_palette),
      occasion: splitList(record.occasion),
      season: splitList(record.season),
      style_tags: splitList(record.style_tags),
      year: Number(record.year),
      __source_row: rowIndex + 2
    };
  });
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value: unknown): value is string {
  return isString(value) && /^https?:\/\//i.test(value);
}

function isImageRef(value: unknown): value is string {
  return isHttpUrl(value) || (isString(value) && value.startsWith("/images/"));
}

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function validateStringArray(
  fileName: string,
  id: string,
  field: string,
  value: unknown,
  allowed?: Set<string>
) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${fileName}/${id}: ${field} must be a non-empty array`);
    return;
  }

  for (const item of value) {
    if (!isString(item)) {
      errors.push(`${fileName}/${id}: ${field} contains a non-string value`);
      continue;
    }

    if (allowed && !allowed.has(item)) {
      errors.push(`${fileName}/${id}: ${field} contains invalid value "${item}"`);
    }
  }
}

function validateGarment(fileName: string, item: JsonRecord) {
  const id = isString(item.id) ? item.id : "missing-id";

  for (const field of ["id", "title", "description", "age_group", "created_at"]) {
    if (!isString(item[field])) {
      errors.push(`${fileName}/${id}: ${field} is required`);
    }
  }

  if (!isImageRef(item.image_url)) {
    errors.push(`${fileName}/${id}: image_url must be an http(s) URL or /images/ asset`);
  }

  if (!isHttpUrl(item.source_url)) {
    errors.push(`${fileName}/${id}: source_url must be an http(s) URL`);
  }

  if (!Number.isInteger(item.year) || (item.year as number) < 2022 || (item.year as number) > 2026) {
    errors.push(`${fileName}/${id}: year must be between 2022 and 2026`);
  }

  if (!demographics.has(String(item.demographic))) {
    errors.push(`${fileName}/${id}: invalid demographic`);
  }

  if (!garmentCategories.has(String(item.category))) {
    errors.push(`${fileName}/${id}: invalid category`);
  }

  if (!fitProfiles.has(String(item.fit_profile))) {
    errors.push(`${fileName}/${id}: invalid fit_profile`);
  }

  validateStringArray(fileName, id, "style_tags", item.style_tags);
  validateStringArray(fileName, id, "occasion", item.occasion, occasions);
  validateStringArray(fileName, id, "season", item.season, seasons);

  if (!Array.isArray(item.color_palette) || item.color_palette.length === 0 || !item.color_palette.every(isHex)) {
    errors.push(`${fileName}/${id}: color_palette must contain hex colors`);
  }

  if (item.demographic === "menswear" && ["dresses", "skirts", "blouses"].includes(String(item.category))) {
    errors.push(`${fileName}/${id}: menswear item cannot use ${String(item.category)} category`);
  }
}

function validateTrend(fileName: string, item: JsonRecord) {
  const id = isString(item.id) ? item.id : "missing-id";

  for (const field of ["id", "title", "description", "season", "created_at"]) {
    if (!isString(item[field])) {
      errors.push(`${fileName}/${id}: ${field} is required`);
    }
  }

  if (!Number.isInteger(item.forecast_year) || (item.forecast_year as number) < 2022 || (item.forecast_year as number) > 2028) {
    errors.push(`${fileName}/${id}: forecast_year must be between 2022 and 2028`);
  }

  if (typeof item.confidence_score !== "number" || item.confidence_score < 0 || item.confidence_score > 100) {
    errors.push(`${fileName}/${id}: confidence_score must be 0-100`);
  }

  if (!isImageRef(item.forecast_image_url)) {
    errors.push(`${fileName}/${id}: forecast_image_url must be an http(s) URL or /images/ asset`);
  }

  if (!isHttpUrl(item.source_url)) {
    errors.push(`${fileName}/${id}: source_url must be an http(s) URL`);
  }
}

function validateGrooming(fileName: string, item: JsonRecord) {
  const id = isString(item.id) ? item.id : "missing-id";

  for (const field of ["id", "title", "description"]) {
    if (!isString(item[field])) {
      errors.push(`${fileName}/${id}: ${field} is required`);
    }
  }

  if (!Number.isInteger(item.year) || (item.year as number) < 2022 || (item.year as number) > 2028) {
    errors.push(`${fileName}/${id}: year must be between 2022 and 2028`);
  }

  if (!groomingCategories.has(String(item.category))) {
    errors.push(`${fileName}/${id}: invalid category`);
  }

  if (!isImageRef(item.image_url)) {
    errors.push(`${fileName}/${id}: image_url must be an http(s) URL or /images/ asset`);
  }

  validateStringArray(fileName, id, "face_shapes", item.face_shapes, faceShapes);
  validateStringArray(fileName, id, "style_tags", item.style_tags);

  if (!Array.isArray(item.recommended_products) || item.recommended_products.length === 0) {
    errors.push(`${fileName}/${id}: recommended_products must be a non-empty array`);
  }
}

function validateWeightObject(
  fileName: string,
  id: string,
  field: string,
  value: unknown,
  allowedKeys?: Set<string>
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${fileName}/${id}: ${field} must be an object`);
    return;
  }

  for (const [key, weight] of Object.entries(value as Record<string, unknown>)) {
    if (allowedKeys && !allowedKeys.has(key)) {
      errors.push(`${fileName}/${id}: ${field} contains invalid key "${key}"`);
    }

    if (typeof weight !== "number" || weight <= 0) {
      errors.push(`${fileName}/${id}: ${field}.${key} must be a positive number`);
    }
  }
}

function validateStylistRule(fileName: string, item: JsonRecord) {
  const id = isString(item.id) ? item.id : "missing-id";

  for (const field of ["id", "rationale"]) {
    if (!isString(item[field])) {
      errors.push(`${fileName}/${id}: ${field} is required`);
    }
  }

  validateStringArray(fileName, id, "demographics", item.demographics, demographics);
  if (item.age_bands !== undefined) {
    validateStringArray(fileName, id, "age_bands", item.age_bands, ageBands);
  }
  validateStringArray(fileName, id, "occasions", item.occasions, occasions);
  validateStringArray(fileName, id, "seasons", item.seasons, seasons);
  validateStringArray(fileName, id, "undertones", item.undertones, new Set(["warm", "cool", "neutral"]));
  validateStringArray(fileName, id, "face_shapes", item.face_shapes, faceShapes);
  validateStringArray(fileName, id, "fit_profiles", item.fit_profiles, fitProfiles);
  validateWeightObject(fileName, id, "category_weights", item.category_weights, garmentCategories);
  validateWeightObject(fileName, id, "tag_weights", item.tag_weights);
}

function validateUniqueIds(kind: string, records: JsonRecord[]) {
  const seen = new Set<string>();

  for (const item of records) {
    if (!isString(item.id)) {
      continue;
    }

    if (seen.has(item.id)) {
      errors.push(`${kind}: duplicate id ${item.id}`);
    }

    seen.add(item.id);
  }
}

const garments = garmentFiles.flatMap((file) => {
  const items = readArray(file);
  items.forEach((item) => validateGarment(file, item));
  return items;
});
const csvGarments = garmentCsvFiles.flatMap((file) => {
  const items = readGarmentCsv(file);
  items.forEach((item) => validateGarment(file, item));
  return items;
});
const trends = trendFiles.flatMap((file) => {
  const items = readArray(file);
  items.forEach((item) => validateTrend(file, item));
  return items;
});
const grooming = groomingFiles.flatMap((file) => {
  const items = readArray(file);
  items.forEach((item) => validateGrooming(file, item));
  return items;
});
const stylistRules = stylistRuleFiles.flatMap((file) => {
  const items = readArray(file);
  items.forEach((item) => validateStylistRule(file, item));
  return items;
});

const allGarments = [...garments, ...csvGarments];

validateUniqueIds("garments", allGarments);
validateUniqueIds("trends", trends);
validateUniqueIds("grooming", grooming);
validateUniqueIds("stylistRules", stylistRules);

const garmentDemographics = allGarments.reduce<Record<string, number>>((counts, item) => {
  const key = String(item.demographic);
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {});

if (errors.length > 0) {
  console.error(`Data validation failed with ${errors.length} issue(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Data validation passed.");
console.log(
  JSON.stringify(
    {
      garments: garments.length,
      garmentCsv: csvGarments.length,
      totalGarments: allGarments.length,
      garmentDemographics,
      grooming: grooming.length,
      stylistRules: stylistRules.length,
      trends: trends.length
    },
    null,
    2
  )
);
}
