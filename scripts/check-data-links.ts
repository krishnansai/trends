#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
{
const { existsSync, readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

type LinkKind = "image" | "source";

type LinkRef = {
  field: string;
  fileName: string;
  id: string;
  kind: LinkKind;
  value: string;
};

type LinkResult = {
  contentType: string;
  error?: string;
  kind: LinkKind;
  refs: LinkRef[];
  status: number | "local-missing" | "local-ok" | "network-error" | "timeout";
  url: string;
};

const DATA_DIR = join(process.cwd(), "data");
const PUBLIC_DIR = join(process.cwd(), "public");
const CONCURRENCY = Number(process.env.CHECK_LINK_CONCURRENCY ?? 8);
const TIMEOUT_MS = Number(process.env.CHECK_LINK_TIMEOUT_MS ?? 12000);
const urlFields = new Set(["forecast_image_url", "image_url", "source_url"]);

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

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCheckedUrlField(field: string) {
  return urlFields.has(field) || field.endsWith("_url");
}

function getLinkKind(field: string): LinkKind {
  return field === "image_url" || field === "forecast_image_url" ? "image" : "source";
}

function readJsonLinks(fileName: string): LinkRef[] {
  const filePath = join(DATA_DIR, fileName);
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((record, index): LinkRef[] => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return [];
    }

    const item = record as Record<string, unknown>;
    const id = isString(item.id) ? item.id : `row-${index + 1}`;

    return Object.entries(item)
      .filter(([field, value]) => isCheckedUrlField(field) && isString(value))
      .map(([field, value]) => ({
        field,
        fileName,
        id,
        kind: getLinkKind(field),
        value: value as string
      }));
  });
}

function readCsvLinks(fileName: string): LinkRef[] {
  const filePath = join(DATA_DIR, fileName);
  const lines = readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean);
  const [headerLine, ...rows] = lines;

  if (!headerLine) {
    return [];
  }

  const headers = parseCsvLine(headerLine);

  return rows.flatMap((row: string, rowIndex: number): LinkRef[] => {
    const values = parseCsvLine(row);
    const record = headers.reduce<Record<string, string>>((item, header, index) => {
      item[header] = values[index] ?? "";
      return item;
    }, {});
    const id = record.id || `row-${rowIndex + 2}`;

    return headers
      .filter((field) => isCheckedUrlField(field) && isString(record[field]))
      .map((field) => ({
        field,
        fileName,
        id,
        kind: getLinkKind(field),
        value: record[field]
      }));
  });
}

function readAllLinks(): LinkRef[] {
  return readdirSync(DATA_DIR)
    .filter((fileName: string) => fileName.endsWith(".json") || fileName.endsWith(".csv"))
    .flatMap((fileName: string) => {
      try {
        return fileName.endsWith(".json") ? readJsonLinks(fileName) : readCsvLinks(fileName);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown parse error";
        return [
          {
            field: "file",
            fileName,
            id: "parse-error",
            kind: "source" as const,
            value: `parse-error:${message}`
          }
        ];
      }
    });
}

function normalizeLocalAssetPath(value: string) {
  return join(PUBLIC_DIR, value.replace(/^\/+/, ""));
}

async function fetchWithTimeout(url: string, method: "GET" | "HEAD") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": method === "HEAD" ? "*/*" : "text/html,image/avif,image/webp,image/*,*/*",
        ...(method === "GET" ? { "Range": "bytes=0-4096" } : {}),
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
      },
      method,
      redirect: "follow",
      signal: controller.signal
    });

    return {
      contentType: response.headers.get("content-type") ?? "",
      status: response.status
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkRemoteUrl(url: string, kind: LinkKind, refs: LinkRef[]): Promise<LinkResult> {
  try {
    let response = await fetchWithTimeout(url, "HEAD");

    if ([401, 402, 403, 405, 429].includes(response.status) || (kind === "image" && !response.contentType)) {
      response = await fetchWithTimeout(url, "GET");
    }

    return {
      contentType: response.contentType,
      kind,
      refs,
      status: response.status,
      url
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";

    return {
      contentType: "",
      error: error instanceof Error ? error.message : "network error",
      kind,
      refs,
      status: isAbort ? "timeout" : "network-error",
      url
    };
  }
}

function checkLocalUrl(url: string, kind: LinkKind, refs: LinkRef[]): LinkResult {
  return {
    contentType: "local",
    kind,
    refs,
    status: existsSync(normalizeLocalAssetPath(url)) ? "local-ok" : "local-missing",
    url
  };
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isBroken(result: LinkResult) {
  if (result.status === "local-missing" || result.status === "network-error" || result.status === "timeout") {
    return true;
  }

  if (typeof result.status !== "number") {
    return false;
  }

  if (result.status < 200 || result.status >= 400) {
    return true;
  }

  return result.kind === "image" && Boolean(result.contentType) && !result.contentType.startsWith("image/");
}

function isBlocked(result: LinkResult) {
  return typeof result.status === "number" && [401, 402, 403, 429].includes(result.status);
}

async function runPool<T, R>(items: T[], worker: (item: T) => Promise<R>) {
  const results: R[] = [];
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index]);
      }
    })
  );

  return results;
}

function compactRef(ref: LinkRef) {
  return `${ref.fileName}/${ref.id}/${ref.field}`;
}

async function main() {
  const links = readAllLinks().filter((link) => isHttpUrl(link.value) || link.value.startsWith("/"));
  const linkMap = new Map<string, LinkRef[]>();

  for (const link of links) {
    const refs = linkMap.get(link.value) ?? [];
    refs.push(link);
    linkMap.set(link.value, refs);
  }

  const uniqueLinks = Array.from(linkMap.entries()).map(([url, refs]) => ({
    kind: refs.some((ref) => ref.kind === "image") ? "image" as const : "source" as const,
    refs,
    url
  }));

  console.log(`Checking ${uniqueLinks.length} unique URLs from ${links.length} data references...`);

  const results = await runPool(uniqueLinks, ({ kind, refs, url }) => {
    return url.startsWith("/")
      ? Promise.resolve(checkLocalUrl(url, kind, refs))
      : checkRemoteUrl(url, kind, refs);
  });
  const broken = results.filter(isBroken);
  const blocked = broken.filter(isBlocked);
  const unavailable = broken.filter((result) => !isBlocked(result));

  console.log(
    JSON.stringify(
      {
        blocked: blocked.length,
        checked: results.length,
        dataReferences: links.length,
        ok: results.length - broken.length,
        unavailable: unavailable.length
      },
      null,
      2
    )
  );

  for (const result of unavailable) {
    console.error(
      `[UNAVAILABLE] ${result.status} ${result.kind} ${result.url}\n  ${result.refs
        .slice(0, 5)
        .map(compactRef)
        .join("\n  ")}`
    );
  }

  for (const result of blocked) {
    console.warn(
      `[BLOCKED] ${result.status} ${result.kind} ${result.url}\n  ${result.refs
        .slice(0, 5)
        .map(compactRef)
        .join("\n  ")}`
    );
  }

  if (unavailable.length > 0) {
    process.exitCode = 1;
  }
}

void main();
}
