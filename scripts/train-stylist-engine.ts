#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
{
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

type JsonRecord = Record<string, unknown>;
type Demographic = "menswear" | "womenswear" | "unisex";
type StylingOccasion =
  | "mall"
  | "street"
  | "beach"
  | "vacation"
  | "gym"
  | "athletic"
  | "sporty"
  | "formal"
  | "office"
  | "casual"
  | "pool"
  | "outdoor"
  | "travel";
type StylingSeason = "summer" | "winter" | "all-season";
type FitProfile = "slim" | "regular" | "relaxed" | "oversized" | "straight" | "boxy";
type FaceShape = "oval" | "square" | "round" | "heart" | "rectangle" | "diamond" | "oblong";

type Garment = JsonRecord & {
  category: string;
  demographic: Demographic;
  fit_profile: FitProfile;
  id: string;
  occasion: StylingOccasion[];
  season: StylingSeason[];
  style_tags: string[];
  title: string;
  year: number;
};

type GroomingTrend = JsonRecord & {
  category: "hairstyle" | "beard";
  face_shapes: FaceShape[];
  id: string;
  title: string;
  year: number;
};

type TrainingCase = {
  demographic: Demographic;
  face_shape: FaceShape;
  fit_profile: FitProfile;
  id: string;
  minimum_categories: number;
  occasion: StylingOccasion;
  season: StylingSeason;
};

const DATA_DIR = join(process.cwd(), "data");
const ARCHIVE_START_YEAR = 2022;
const ARCHIVE_END_YEAR = 2026;
const blockedMenswearCategories = new Set(["dresses", "skirts", "blouses"]);
const garmentJsonFiles = [
  "garments.json",
  "garments-sourced.json",
  "garments-visuals.json",
  "garments-womenswear.json",
  "garments-womenswear-latest-2026.json",
  "garments-launch-pack.json",
  "garments-context-expansion.json",
  "garments-latest-trends-2026.json",
  "garments-ultra-latest-2026.json",
  "garments-photo-profile-2026.json"
];
const garmentCsvFiles = ["garments-pro-launch.csv"];
const groomingFiles = [
  "grooming-seed.json",
  "grooming-seed-v2.json",
  "grooming-launch-pack.json",
  "grooming-pro-launch.json",
  "grooming-ultra-latest-2026.json"
];

const occasionGroups: Record<string, StylingOccasion[]> = {
  beach: ["beach", "vacation", "pool"],
  formal: ["formal", "office"],
  gym: ["gym", "athletic", "sporty"],
  mall: ["mall", "street", "casual"]
};

const compatibleFits: Record<FitProfile, FitProfile[]> = {
  boxy: ["oversized", "relaxed", "straight"],
  oversized: ["boxy", "relaxed", "straight"],
  regular: ["straight", "relaxed", "slim"],
  relaxed: ["straight", "boxy", "regular", "oversized"],
  slim: ["straight", "regular"],
  straight: ["regular", "relaxed", "slim", "boxy"]
};

function readJsonArray(fileName: string): JsonRecord[] {
  const path = join(DATA_DIR, fileName);

  if (!existsSync(path)) {
    throw new Error(`${fileName} is missing`);
  }

  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`${fileName} must contain an array`);
  }

  return parsed as JsonRecord[];
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

function readGarmentCsv(fileName: string): Garment[] {
  const path = join(DATA_DIR, fileName);

  if (!existsSync(path)) {
    throw new Error(`${fileName} is missing`);
  }

  const lines = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean);
  const [headerLine, ...rows] = lines;
  const headers = parseCsvLine(headerLine);

  return rows.map((row: string) => {
    const values = parseCsvLine(row);
    const record = headers.reduce<JsonRecord>((item, header, index) => {
      item[header] = values[index] ?? "";
      return item;
    }, {});

    return {
      ...record,
      category: String(record.category),
      color_palette: splitList(record.color_palette),
      demographic: record.demographic as Demographic,
      fit_profile: record.fit_profile as FitProfile,
      id: String(record.id),
      occasion: splitList(record.occasion) as StylingOccasion[],
      season: splitList(record.season) as StylingSeason[],
      style_tags: splitList(record.style_tags),
      title: String(record.title),
      year: Number(record.year)
    } as Garment;
  });
}

function toGarment(record: JsonRecord): Garment {
  return {
    ...record,
    category: String(record.category),
    demographic: record.demographic as Demographic,
    fit_profile: record.fit_profile as FitProfile,
    id: String(record.id),
    occasion: record.occasion as StylingOccasion[],
    season: record.season as StylingSeason[],
    style_tags: record.style_tags as string[],
    title: String(record.title),
    year: Number(record.year)
  } as Garment;
}

function getOccasionMatches(occasion: StylingOccasion) {
  return occasionGroups[occasion] ?? [occasion];
}

function getSeasonMatches(season: StylingSeason) {
  if (season === "summer") {
    return ["summer", "all-season"] as StylingSeason[];
  }

  if (season === "winter") {
    return ["winter", "all-season"] as StylingSeason[];
  }

  return ["all-season"] as StylingSeason[];
}

function isAllowedForDemographic(garment: Garment, demographic: Demographic) {
  const allowed =
    demographic === "unisex" ? garment.demographic === "unisex" : garment.demographic === demographic || garment.demographic === "unisex";

  if (demographic === "menswear") {
    return allowed && !blockedMenswearCategories.has(garment.category);
  }

  return allowed;
}

function scoreGarment(garment: Garment, trainingCase: TrainingCase) {
  const occasionMatches = getOccasionMatches(trainingCase.occasion);
  const seasonMatches = getSeasonMatches(trainingCase.season);
  const exactOccasion = garment.occasion.includes(trainingCase.occasion);
  const groupedOccasion = garment.occasion.some((occasion) => occasionMatches.includes(occasion));
  const seasonMatch = garment.season.some((season) => seasonMatches.includes(season));
  const exactFit = garment.fit_profile === trainingCase.fit_profile;
  const compatibleFit = compatibleFits[trainingCase.fit_profile].includes(garment.fit_profile);
  const exactDemographic = garment.demographic === trainingCase.demographic;
  const recency = Math.max(0, garment.year - ARCHIVE_START_YEAR) * 4;

  return (
    (exactDemographic ? 20 : 10) +
    (exactOccasion ? 34 : groupedOccasion ? 24 : 0) +
    (seasonMatch ? 26 : 0) +
    (exactFit ? 26 : compatibleFit ? 14 : 0) +
    recency +
    (garment.year === ARCHIVE_END_YEAR ? 10 : 0)
  );
}

function pickDiverseGarments(items: Garment[]) {
  const selected: Garment[] = [];
  const categories = new Set<string>();

  for (const item of items) {
    if (selected.length >= 3) {
      break;
    }

    if (categories.has(item.category)) {
      continue;
    }

    selected.push(item);
    categories.add(item.category);
  }

  for (const item of items) {
    if (selected.length >= 3) {
      break;
    }

    if (!selected.some((selectedItem) => selectedItem.id === item.id)) {
      selected.push(item);
    }
  }

  return selected;
}

function pickGarments(garments: Garment[], trainingCase: TrainingCase) {
  const occasionMatches = getOccasionMatches(trainingCase.occasion);
  const seasonMatches = getSeasonMatches(trainingCase.season);

  const scored = garments
    .filter((garment) => isAllowedForDemographic(garment, trainingCase.demographic))
    .filter((garment) => garment.year >= ARCHIVE_START_YEAR && garment.year <= ARCHIVE_END_YEAR)
    .filter((garment) => garment.occasion.some((occasion) => occasionMatches.includes(occasion)))
    .filter((garment) => garment.season.some((season) => seasonMatches.includes(season)))
    .map((garment) => ({ garment, score: scoreGarment(garment, trainingCase) }))
    .sort((first, second) => second.score - first.score || second.garment.year - first.garment.year)
    .map(({ garment }) => garment);

  return pickDiverseGarments(scored);
}

function pickGrooming(grooming: GroomingTrend[], trainingCase: TrainingCase) {
  const hairstyle = grooming.find(
    (item) => item.category === "hairstyle" && item.face_shapes.includes(trainingCase.face_shape)
  );
  const beard =
    trainingCase.demographic === "womenswear"
      ? null
      : grooming.find(
          (item) => item.category === "beard" && item.face_shapes.includes(trainingCase.face_shape)
        );

  return { beard, hairstyle };
}

const garments = [
  ...garmentJsonFiles.flatMap((file) => readJsonArray(file).map(toGarment)),
  ...garmentCsvFiles.flatMap(readGarmentCsv)
];
const grooming = groomingFiles.flatMap((file) => readJsonArray(file) as GroomingTrend[]);
const trainingCases = readJsonArray("stylist-training-cases.json") as TrainingCase[];
const failures: string[] = [];

console.log(`Training stylist engine with ${garments.length} garments and ${grooming.length} grooming records.`);

for (const trainingCase of trainingCases) {
  const picks = pickGarments(garments, trainingCase);
  const categories = new Set(picks.map((garment) => garment.category));
  const groomingPicks = pickGrooming(grooming, trainingCase);
  const caseFailures: string[] = [];

  if (picks.length < 3) {
    caseFailures.push(`expected 3 garments but found ${picks.length}`);
  }

  if (categories.size < trainingCase.minimum_categories) {
    caseFailures.push(`expected ${trainingCase.minimum_categories} categories but found ${categories.size}`);
  }

  if (trainingCase.demographic === "menswear" && picks.some((garment) => blockedMenswearCategories.has(garment.category))) {
    caseFailures.push("menswear output included a blocked womenswear category");
  }

  if (!groomingPicks.hairstyle) {
    caseFailures.push(`missing hairstyle for ${trainingCase.face_shape}`);
  }

  if (trainingCase.demographic !== "womenswear" && !groomingPicks.beard) {
    caseFailures.push(`missing beard style for ${trainingCase.face_shape}`);
  }

  if (caseFailures.length > 0) {
    failures.push(`${trainingCase.id}: ${caseFailures.join("; ")}`);
  }

  console.log(
    `${caseFailures.length ? "FAIL" : "PASS"} ${trainingCase.id}: ${picks
      .map((garment) => garment.title)
      .join(" | ")}`
  );
}

if (failures.length > 0) {
  console.error(`\nStylist training failed with ${failures.length} issue(s):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`\nStylist training passed for ${trainingCases.length} launch scenarios.`);
}
