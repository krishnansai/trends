import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Garment, GroomingTrend, Trend } from "@/lib/types";

const DATA_DIR = join(process.cwd(), "data");

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
    readJsonArray<Garment>("garments-sourced.json")
  ]);

  return dedupeById(garmentSets.flat());
}

export async function getLocalTrends() {
  const trendSets = await Promise.all([
    readJsonArray<Trend>("trends.json"),
    readJsonArray<Trend>("trends-sourced.json")
  ]);

  return dedupeById(trendSets.flat());
}

export async function getLocalGroomingTrends() {
  const groomingSets = await Promise.all([
    readJsonArray<GroomingTrend>("grooming-seed.json"),
    readJsonArray<GroomingTrend>("grooming-seed-v2.json")
  ]);
  return dedupeById(groomingSets.flat());
}
