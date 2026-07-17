import express from "express";
import { PlaywrightCrawler, log } from "crawlee";
import type { Page } from "playwright";

type ScrapeRequest = {
  selectors?: {
    image?: string;
    price?: string;
    title?: string;
  };
  url?: unknown;
};

type ScrapedProduct = {
  availability: "In stock" | "Check retailer";
  currency: string;
  imageUrl: string | null;
  price: number | null;
  title: string | null;
  url: string;
};

const PORT = Number(process.env.PORT ?? 4000);
const MAX_REQUESTS_PER_CRAWL = 1;
const DEFAULT_TIMEOUT_MS = 12000;
const BLOCK_STYLESHEETS = process.env.PRICE_SCRAPER_BLOCK_STYLESHEETS === "true";
const BLOCKED_RESOURCE_TYPES = new Set([
  "font",
  "image",
  "media",
  ...(BLOCK_STYLESHEETS ? ["stylesheet"] : [])
]);
const USER_AGENT =
  process.env.PRICE_SCRAPER_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const priceSelectors = [
  "[itemprop='price']",
  "[data-testid*='price' i]",
  "[class*='price' i]",
  "[id*='price' i]",
  ".a-price .a-offscreen",
  ".pdp-price",
  ".product-price",
  ".price"
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getViewport() {
  const seed = Date.now() % 97;

  return {
    height: 900 + (seed % 140),
    width: 1366 + (seed % 220)
  };
}

function parsePrice(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  const price = match ? Number(match[0]) : Number.NaN;

  return Number.isFinite(price) ? price : null;
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

async function firstText(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();

    try {
      if ((await locator.count()) > 0) {
        const text = await locator.textContent({ timeout: 1800 });

        if (text?.trim()) {
          return normalizeWhitespace(text);
        }
      }
    } catch {
      // Continue to the next candidate selector.
    }
  }

  return null;
}

async function firstAttribute(page: Page, selectors: string[], attribute: string) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();

    try {
      if ((await locator.count()) > 0) {
        const value = await locator.getAttribute(attribute, { timeout: 1800 });

        if (value?.trim()) {
          return value;
        }
      }
    } catch {
      // Continue to the next candidate selector.
    }
  }

  return null;
}

async function metaContent(page: Page, selector: string) {
  return page.locator(selector).first().getAttribute("content").catch(() => null);
}

async function preparePage(page: Page) {
  await page.setViewportSize(getViewport());
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-IN,en;q=0.9",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": USER_AGENT
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => false
    });
  });
  await page.route("**/*", (route) => {
    const resourceType = route.request().resourceType();

    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
      return route.abort();
    }

    return route.continue();
  });
}

async function extractProduct(page: Page, url: string, selectors: ScrapeRequest["selectors"] = {}) {
  const title =
    (selectors.title ? await firstText(page, [selectors.title]) : null) ??
    (await metaContent(page, "meta[property='og:title']")) ??
    (await metaContent(page, "meta[name='twitter:title']")) ??
    normalizeWhitespace(await page.title().catch(() => ""));
  const priceText =
    (selectors.price ? await firstText(page, [selectors.price]) : null) ??
    (await metaContent(page, "meta[property='product:price:amount']")) ??
    (await metaContent(page, "meta[property='og:price:amount']")) ??
    (await firstText(page, priceSelectors));
  const currency =
    (await metaContent(page, "meta[property='product:price:currency']")) ??
    (await metaContent(page, "meta[property='og:price:currency']")) ??
    "INR";
  const image =
    (selectors.image ? await firstAttribute(page, [selectors.image], "src") : null) ??
    (await metaContent(page, "meta[property='og:image']")) ??
    (await metaContent(page, "meta[name='twitter:image']"));
  const imageUrl = image ? new URL(image, url).toString() : null;

  return {
    availability: "In stock",
    currency,
    imageUrl,
    price: parsePrice(priceText),
    title: title || null,
    url: page.url() || url
  } satisfies ScrapedProduct;
}

async function scrapeProduct(payload: ScrapeRequest) {
  const url = normalizeUrl(payload.url);

  if (!url) {
    throw new Error("A public http(s) url is required.");
  }

  let product: ScrapedProduct | null = null;
  const crawler = new PlaywrightCrawler({
    headless: true,
    launchContext: {
      launchOptions: {
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage",
          "--disable-infobars",
          "--no-sandbox",
          "--window-size=1440,980"
        ]
      }
    },
    maxRequestRetries: 1,
    maxRequestsPerCrawl: MAX_REQUESTS_PER_CRAWL,
    navigationTimeoutSecs: Math.ceil(DEFAULT_TIMEOUT_MS / 1000),
    requestHandlerTimeoutSecs: Math.ceil(DEFAULT_TIMEOUT_MS / 1000) + 4,
    async requestHandler({ page, request }) {
      await preparePage(page);
      await page.waitForLoadState("domcontentloaded", { timeout: DEFAULT_TIMEOUT_MS }).catch(() => undefined);
      product = await extractProduct(page, request.loadedUrl ?? url, payload.selectors);
    }
  });

  await crawler.run([url]);

  if (!product) {
    throw new Error("Product page could not be scraped.");
  }

  return product;
}

const app = express();
app.use(express.json({ limit: "128kb" }));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "price-scraper"
  });
});

app.post("/scrape", async (request, response) => {
  try {
    const product = await scrapeProduct(request.body as ScrapeRequest);
    response.json(product);
  } catch (error) {
    log.warning(error instanceof Error ? error.message : "Unknown scrape failure");
    response.status(422).json({
      error: error instanceof Error ? error.message : "Unable to scrape product page."
    });
  }
});

app.post("/scrape-product", async (request, response) => {
  try {
    const product = await scrapeProduct(request.body as ScrapeRequest);
    response.json(product);
  } catch (error) {
    log.warning(error instanceof Error ? error.message : "Unknown scrape failure");
    response.status(422).json({
      error: error instanceof Error ? error.message : "Unable to scrape product page."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  log.info(`Price scraper sidecar listening on port ${PORT}`);
});
