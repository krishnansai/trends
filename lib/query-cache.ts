type QueryCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ITEMS = 250;

declare global {
  var __personalStylistQueryCache: Map<string, QueryCacheEntry<unknown>> | undefined;
}

const queryCache =
  globalThis.__personalStylistQueryCache ??
  new Map<string, QueryCacheEntry<unknown>>();

globalThis.__personalStylistQueryCache = queryCache;

export function normalizeCacheText(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}

function normalizeCacheValue(value: unknown): unknown {
  if (typeof value === "string") {
    return normalizeCacheText(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeCacheValue).sort();
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
        .map(([key, item]) => [key, normalizeCacheValue(item)])
    );
  }

  return value;
}

export function createQueryCacheKey(namespace: string, payload: Record<string, unknown>) {
  return `${namespace}:${JSON.stringify(normalizeCacheValue(payload))}`;
}

function pruneExpiredEntries(now = Date.now()) {
  for (const [key, entry] of queryCache.entries()) {
    if (entry.expiresAt <= now) {
      queryCache.delete(key);
    }
  }
}

function pruneOverflow(maxItems: number) {
  while (queryCache.size > maxItems) {
    const oldestKey = queryCache.keys().next().value as string | undefined;

    if (!oldestKey) {
      return;
    }

    queryCache.delete(oldestKey);
  }
}

export function getQueryCache<T>(key: string) {
  const entry = queryCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    queryCache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setQueryCache<T>(
  key: string,
  value: T,
  options: { maxItems?: number; ttlMs?: number } = {}
) {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;

  pruneExpiredEntries();
  queryCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value
  });
  pruneOverflow(maxItems);
}

export function getQueryCacheStats() {
  pruneExpiredEntries();

  return {
    maxItems: DEFAULT_MAX_ITEMS,
    size: queryCache.size,
    ttlMs: DEFAULT_TTL_MS
  };
}
