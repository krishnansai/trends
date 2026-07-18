import { NextResponse } from "next/server";
import { getGarments } from "@/lib/data";
import {
  getCategoriesForOutfitRole,
  pickAlternativeGarment,
  type OutfitSlotRole
} from "@/lib/outfit-shuffle";
import {
  createQueryCacheKey,
  getQueryCache,
  setQueryCache
} from "@/lib/query-cache";
import {
  isDemographic,
  isStylingOccasion,
  isStylingSeason,
  type Demographic,
  type Garment,
  type StylingOccasion,
  type StylingSeason
} from "@/lib/types";

type ShuffleRequest = {
  demographic?: unknown;
  excludeIds?: unknown;
  occasion?: unknown;
  palette?: unknown;
  role?: unknown;
  season?: unknown;
};

type ShuffleResponse = {
  error?: string;
  garment?: Garment;
};

type CachedShuffleResponse = {
  body: ShuffleResponse;
  status: number;
};

const roleValues = ["Top / Layer", "Bottom", "Footwear"] as const satisfies readonly OutfitSlotRole[];

async function readRequest(request: Request): Promise<ShuffleRequest> {
  const text = await request.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as ShuffleRequest;
  } catch {
    return {};
  }
}

function normalizeRole(value: unknown): OutfitSlotRole {
  if (typeof value === "string" && roleValues.includes(value as OutfitSlotRole)) {
    return value as OutfitSlotRole;
  }

  return "Top / Layer";
}

function normalizeDemographic(value: unknown): Demographic {
  return isDemographic(value) ? value : "menswear";
}

function normalizeOccasion(value: unknown): StylingOccasion {
  return isStylingOccasion(value) ? value : "mall";
}

function normalizeSeason(value: unknown): StylingSeason {
  return isStylingSeason(value) ? value : "all-season";
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function POST(request: Request) {
  const body = await readRequest(request);
  const role = normalizeRole(body.role);
  const demographic = normalizeDemographic(body.demographic);
  const occasion = normalizeOccasion(body.occasion);
  const season = normalizeSeason(body.season);
  const palette = normalizeStringArray(body.palette);
  const excludeIds = normalizeStringArray(body.excludeIds);
  const cacheKey = createQueryCacheKey("stylist:shuffle", {
    demographic,
    excludeIds,
    occasion,
    palette,
    role,
    season
  });
  const cachedResponse = getQueryCache<CachedShuffleResponse>(cacheKey);

  if (cachedResponse) {
    return NextResponse.json(cachedResponse.body, {
      headers: {
        "X-Cache": "HIT"
      },
      status: cachedResponse.status
    });
  }

  const categories = getCategoriesForOutfitRole(role);
  const garments = await getGarments({
    categories,
    demographic,
    includeUnisex: false,
    limit: 350,
    occasion,
    season,
    strictContext: false
  });
  const garment = pickAlternativeGarment({
    demographic,
    excludeIds,
    garments,
    occasion,
    palette,
    role,
    season
  });

  if (!garment) {
    const responseBody = {
      error: `No ${role.toLowerCase()} alternatives found for ${occasion} + ${season}.`
    };

    setQueryCache(cacheKey, {
      body: responseBody,
      status: 404
    });

    return NextResponse.json(responseBody, {
      headers: {
        "X-Cache": "MISS"
      },
      status: 404
    });
  }

  const responseBody = { garment };

  setQueryCache(cacheKey, {
    body: responseBody,
    status: 200
  });

  return NextResponse.json(responseBody, {
    headers: {
      "X-Cache": "MISS"
    }
  });
}
