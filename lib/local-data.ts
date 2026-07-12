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

export async function getLocalGarments() {
  const garmentSets = await Promise.all([
    readJsonArray<Garment>("garments.json"),
    readJsonArray<Garment>("garments-sourced.json"),
    readJsonArray<Garment>("garments-visuals.json"),
    readJsonArray<Garment>("garments-womenswear.json"),
    readJsonArray<Garment>("garments-launch-pack.json"),
    readGarmentCsv("garments-pro-launch.csv")
  ]);

  return dedupeById(garmentSets.flat());
}

export async function getLocalTrends() {
  const trendSets = await Promise.all([
    readJsonArray<Trend>("trends.json"),
    readJsonArray<Trend>("trends-sourced.json"),
    readJsonArray<Trend>("trends-launch-pack.json"),
    readJsonArray<Trend>("trends-pro-launch.json")
  ]);

  return dedupeById(trendSets.flat());
}

export async function getLocalGroomingTrends() {
  const groomingSets = await Promise.all([
    readJsonArray<GroomingTrend>("grooming-seed.json"),
    readJsonArray<GroomingTrend>("grooming-seed-v2.json"),
    readJsonArray<GroomingTrend>("grooming-launch-pack.json"),
    readJsonArray<GroomingTrend>("grooming-pro-launch.json")
  ]);
  return dedupeById(groomingSets.flat());
}
