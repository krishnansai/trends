import { NextResponse } from "next/server";
import { getGarments } from "@/lib/data";
import {
  createQueryCacheKey,
  getQueryCache,
  normalizeCacheText,
  setQueryCache
} from "@/lib/query-cache";
import { filterAndRankGarmentsByVibe, parseVibeSearch } from "@/lib/vibe-search";
import type { Garment } from "@/lib/types";

type VibeSearchRequest = {
  limit?: unknown;
  query?: unknown;
};

type VibeSearchResponse = {
  count: number;
  intent: ReturnType<typeof parseVibeSearch>;
  matches: Garment[];
};

async function readRequest(request: Request): Promise<VibeSearchRequest> {
  const text = await request.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as VibeSearchRequest;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const body = await readRequest(request);
  const query = normalizeCacheText(body.query);
  const limit = typeof body.limit === "number" && Number.isFinite(body.limit) ? body.limit : 48;
  const cacheKey = createQueryCacheKey("archive:vibe-search", {
    limit,
    query
  });
  const cachedResponse = getQueryCache<VibeSearchResponse>(cacheKey);

  if (cachedResponse) {
    return NextResponse.json(cachedResponse, {
      headers: {
        "X-Cache": "HIT"
      }
    });
  }

  const intent = parseVibeSearch(query);
  const garments = await getGarments({ limit: 350 });
  const matches = filterAndRankGarmentsByVibe(garments, intent).slice(0, limit);
  const responseBody = {
    count: matches.length,
    intent,
    matches
  };

  setQueryCache(cacheKey, responseBody);

  return NextResponse.json(responseBody, {
    headers: {
      "X-Cache": "MISS"
    }
  });
}
