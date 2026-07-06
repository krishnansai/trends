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

export async function getLocalGarments() {
  return readJsonArray<Garment>("garments.json");
}

export async function getLocalTrends() {
  return readJsonArray<Trend>("trends.json");
}

export async function getLocalGroomingTrends() {
  const groomingSets = await Promise.all([
    readJsonArray<GroomingTrend>("grooming-seed.json"),
    readJsonArray<GroomingTrend>("grooming-seed-v2.json")
  ]);
  const groomingTrendMap = new Map<string, GroomingTrend>();

  for (const groomingTrend of groomingSets.flat()) {
    groomingTrendMap.set(groomingTrend.id, groomingTrend);
  }

  return Array.from(groomingTrendMap.values());
}
