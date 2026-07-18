import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Garment, GroomingTrend, Trend } from "@/lib/types";

const DATA_DIR = join(process.cwd(), "data");

type CsvRow = Record<string, string>;

async function readJsonArray<T>(fileName: string): Promise<T[]> {
  try {
    const contents = await readFile(join(DATA_DIR, fileName), "utf8");
    const parsed = JSON.parse(contents) as unknown;

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    console.error(`Unable to read local data file ${fileName}`, error);
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

function splitList(value: string) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readCsvRows(fileName: string): Promise<CsvRow[]> {
  try {
    const contents = await readFile(join(DATA_DIR, fileName), "utf8");
    const lines = contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const [headerLine, ...rows] = lines;

    if (!headerLine) {
      return [];
    }

    const headers = parseCsvLine(headerLine);

    return rows.map((row) => {
      const values = parseCsvLine(row);
      return headers.reduce<CsvRow>((record, header, index) => {
        record[header] = values[index] ?? "";
        return record;
      }, {});
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    console.error(`Unable to read local CSV file ${fileName}`, error);
    return [];
  }
}

async function readGarmentCsv(fileName: string): Promise<Garment[]> {
  const rows = await readCsvRows(fileName);

  return rows.map((row) => ({
    age_group: row.age_group,
    category: row.category as Garment["category"],
    color_palette: splitList(row.color_palette),
    created_at: row.created_at,
    demographic: row.demographic as Garment["demographic"],
    description: row.description,
    fit_profile: row.fit_profile as Garment["fit_profile"],
    id: row.id,
    image_url: row.image_url,
    occasion: splitList(row.occasion) as Garment["occasion"],
    season: splitList(row.season) as Garment["season"],
    source_url: row.source_url,
    style_tags: splitList(row.style_tags),
    title: row.title,
    year: Number(row.year)
  }));
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const itemMap = new Map<string, T>();

  for (const item of items) {
    itemMap.set(item.id, item);
  }

  return Array.from(itemMap.values());
}

function normalizeMediaKey(value?: string) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed, "https://personal-stylist.local");
    url.search = "";
    url.hash = "";

    if (url.origin === "https://personal-stylist.local") {
      return url.pathname.toLowerCase();
    }

    return `${url.origin}${url.pathname}`.toLowerCase();
  } catch {
    return trimmed.split("#")[0].split("?")[0].toLowerCase();
  }
}

function scoreGarmentQuality(garment: Garment) {
  return (
    garment.year * 1000 +
    garment.style_tags.length * 12 +
    garment.occasion.length * 8 +
    garment.season.length * 8 +
    garment.color_palette.length * 4 +
    (garment.description ? Math.min(garment.description.length, 240) / 20 : 0) +
    (garment.source_url ? 6 : 0)
  );
}

function scoreTrendQuality(trend: Trend) {
  return (
    trend.forecast_year * 1000 +
    trend.confidence_score +
    (trend.description ? Math.min(trend.description.length, 240) / 20 : 0) +
    (trend.source_url ? 6 : 0)
  );
}

function scoreGroomingQuality(grooming: GroomingTrend) {
  return (
    grooming.year * 1000 +
    grooming.face_shapes.length * 10 +
    grooming.style_tags.length * 8 +
    grooming.recommended_products.length * 6 +
    (grooming.description ? Math.min(grooming.description.length, 240) / 20 : 0)
  );
}

function dedupeByMedia<T extends { id: string }>(
  items: T[],
  getMediaUrl: (item: T) => string | undefined,
  scoreItem: (item: T) => number
) {
  const dedupedById = dedupeById(items);
  const itemMap = new Map<string, T>();
  const mediaKeyToId = new Map<string, string>();

  for (const item of dedupedById) {
    const mediaKey = normalizeMediaKey(getMediaUrl(item));

    if (!mediaKey) {
      itemMap.set(item.id, item);
      continue;
    }

    const existingId = mediaKeyToId.get(mediaKey);

    if (!existingId) {
      mediaKeyToId.set(mediaKey, item.id);
      itemMap.set(item.id, item);
      continue;
    }

    const existing = itemMap.get(existingId);

    if (!existing || scoreItem(item) > scoreItem(existing)) {
      itemMap.delete(existingId);
      mediaKeyToId.set(mediaKey, item.id);
      itemMap.set(item.id, item);
    }
  }

  return Array.from(itemMap.values());
}

export function dedupeGarmentsByMedia(items: Garment[]) {
  return dedupeByMedia(items, (garment) => garment.image_url, scoreGarmentQuality);
}

export function dedupeTrendsByMedia(items: Trend[]) {
  return dedupeByMedia(items, (trend) => trend.forecast_image_url, scoreTrendQuality);
}

export function dedupeGroomingTrendsByMedia(items: GroomingTrend[]) {
  return dedupeByMedia(items, (grooming) => grooming.image_url, scoreGroomingQuality);
}

export async function getLocalGarments() {
  const garmentSets = await Promise.all([
    readJsonArray<Garment>("garments.json"),
    readJsonArray<Garment>("garments-sourced.json"),
    readJsonArray<Garment>("garments-visuals.json"),
    readJsonArray<Garment>("garments-unsplash.json"),
    readJsonArray<Garment>("garments-womenswear.json"),
    readJsonArray<Garment>("garments-launch-pack.json"),
    readJsonArray<Garment>("garments-context-expansion.json"),
    readJsonArray<Garment>("garments-latest-trends-2026.json"),
    readJsonArray<Garment>("garments-ultra-latest-2026.json"),
    readJsonArray<Garment>("garments-photo-profile-2026.json"),
    readJsonArray<Garment>("garments-accessories-footwear-2026.json"),
    readJsonArray<Garment>("garments-youtube-2026.json"),
    readJsonArray<Garment>("garments-video-trends-2024-2026.json"),
    readGarmentCsv("garments-pro-launch.csv")
  ]);

  return dedupeGarmentsByMedia(garmentSets.flat());
}

export async function getLocalTrends() {
  const trendSets = await Promise.all([
    readJsonArray<Trend>("trends.json"),
    readJsonArray<Trend>("trends-sourced.json"),
    readJsonArray<Trend>("trends-launch-pack.json"),
    readJsonArray<Trend>("trends-pro-launch.json"),
    readJsonArray<Trend>("trends-latest-2026.json"),
    readJsonArray<Trend>("trends-ultra-latest-2026.json"),
    readJsonArray<Trend>("trends-photo-profile-2026.json")
  ]);

  return dedupeTrendsByMedia(trendSets.flat());
}

export async function getLocalGroomingTrends() {
  const groomingSets = await Promise.all([
    readJsonArray<GroomingTrend>("grooming-seed.json"),
    readJsonArray<GroomingTrend>("grooming-seed-v2.json"),
    readJsonArray<GroomingTrend>("grooming-launch-pack.json"),
    readJsonArray<GroomingTrend>("grooming-pro-launch.json"),
    readJsonArray<GroomingTrend>("grooming-ultra-latest-2026.json")
  ]);
  return dedupeGroomingTrendsByMedia(groomingSets.flat());
}
