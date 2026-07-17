# Atelier Signal

A Next.js dashboard prototype for a fashion trend forecasting and historical archive product.

The archive data window is 2022-2026. The app also includes consumer-facing modules for
price comparison and AI styling recommendations. By default, the app expects original local JSON or
Supabase data and does not render bundled sample rows.

## Stack

- Next.js App Router
- Tailwind CSS with shadcn-style local UI primitives
- Supabase PostgreSQL and Storage
- Recharts for collaboration insights
- Python ingestion script for local image datasets
- TypeScript ingestion script for downloaded Kaggle fashion CSVs
- TypeScript ingestion script for sourced trend CSVs

## Run Locally

```bash
npm install
npm run dev
```

The UI reads original data from local JSON files under `data/` when Supabase is not configured.
Bundled sample rows are disabled unless
`NEXT_PUBLIC_ALLOW_SAMPLE_DATA=true` is set for a local demo.

```bash
cp .env.example .env.local
```

## Supabase Setup

Run the SQL files in `database/` from the Supabase SQL editor:

1. `database/001_create_fashion_archive.sql`
2. `database/002_seed_example_trends.sql`
3. `database/003_seed_last_five_year_garments.sql`
4. `database/004_add_garment_demographic_guardrail.sql`
5. `database/005_add_trend_source_url.sql`

The first migration creates:

- `garments`
- `trends`
- search indexes for year, category, style tags, and forecast fields
- public read policies for prototype browsing
- a public storage bucket named `fashion-garments`

## App Modules

- `/archive` - five-year visual archive, 2022-2026, with Forecast mode built in
- `/price-finder` - image URL/upload price comparison prototype
- `/stylist` - AI personal stylist prototype connected to garment archive data
- `/collaborations` - brand partnership inquiry and trend insights

## Optional Ollama Vision Analysis

The stylist page works without a trained cloud model. It first runs a fast browser-side photo
analysis, then can optionally send the uploaded image to a local Ollama vision model for stricter
profile extraction. The normalized AI output includes wardrobe profile, broad age styling band,
face shape, undertone, fit direction, confidence, visible cues, outfit strategy, grooming strategy,
and avoid notes.

CPU-only Ollama works, but image analysis can be slow. Keep the browser fallback enabled for launch
so uploads still work if Ollama is not running.

Install Ollama and pull a vision model:

```bash
ollama pull llava:latest
ollama serve
```

Enable local vision in `.env.local`:

```bash
OLLAMA_VISION_ENABLED=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_VISION_MODEL=llava:latest
OLLAMA_VISION_TIMEOUT_MS=30000
```

The `/stylist` result panel shows whether analysis came from `Ollama` or `Browser analysis`.
If Ollama is unavailable, the app keeps using browser analysis and still returns guarded
recommendations from the local trend archive.

## Price Finder Provider Mode

The Price Finder is designed to run in local/no-API mode during product buildout:

- Pasted product URLs are fetched server-side and parsed for page metadata when the retailer allows it.
- Typed searches such as `black shirt` open ranked retailer result pages with clearly labeled estimates.

Use this mode for prototype and launch prep:

```bash
PRICE_FINDER_LIVE_PROVIDER=local
```

Later, switch this provider behind the same route to affiliate network APIs or approved retailer
feeds. If a temporary live shopping provider is needed for typed-query testing, enable SerpAPI:

```bash
PRICE_FINDER_LIVE_PROVIDER=serpapi
SERPAPI_API_KEY=your_serpapi_key
```

Keep provider keys in `.env.local`; never commit them.

Run launch checks after data or scoring changes:

```bash
npm run validate:data
npm run train:stylist
npm run typecheck
npm run lint
npm run build
```

## Image Ingestion

Install script dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
```

Expected metadata CSV columns:

```csv
filename,year,category,demographic,style_tags,color_palette,age_group,description,source_url
look-001.jpg,2024,tops,womenswear,"sheer layering, mesh","#f3eee6,#222222",18-34,Sheer tonal layering,https://example.com/source
```

Run ingestion:

```bash
python scripts/ingest_fashion_images.py ./dataset/images --metadata ./dataset/metadata.csv
```

Required environment variables for ingestion:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

## Kaggle CSV Ingestion

Downloaded Kaggle files such as Zara/H&M retail catalogs or Fashionpedia-style CSV exports can be
normalized into local storage with:

```bash
npm run ingest:kaggle -- ./dataset/fashion-catalog.csv --dry-run
```

The script maps common column names into:

```csv
image_url,year,category,style_tags,color_palette,demographic,age_group,description,source_url
```

It normalizes `MAN`, `Men`, and similar values to `menswear`, `WOMAN`, `Women`, and similar
values to `womenswear`, and `unisex` values to `unisex`. Menswear rows are blocked from inserting
`dresses`, `skirts`, or `blouses`.

Insert rows after checking the dry-run output:

```bash
npm run ingest:kaggle -- ./dataset/fashion-catalog.csv --chunk-size 100
```

That writes to `data/garments.json` by default. To insert into Supabase instead:

```bash
npm run ingest:kaggle -- ./dataset/fashion-catalog.csv --target supabase --chunk-size 100
```

Useful options:

- `--limit 500`
- `--year-min 2022`
- `--year-max 2026`
- `--default-year 2026`
- `--default-image-url https://example.com/fallback.jpg`
- `--target local`
- `--local-file data/garments.json`

## Original Trend Ingestion

Use sourced trend exports instead of hand-written sample forecasts:

```bash
npm run ingest:trends -- ./dataset/trend-sources.csv --dry-run
```

Expected source-oriented columns can use flexible names such as:

```csv
title,description,forecast_year,confidence_score,season,forecast_image_url,source_url
Utility Tailoring,Structured utility jackets and relaxed trousers,2026,84,Spring 2026,https://example.com/look.jpg,https://example.com/source
```

Rows without a `source_url` or image URL are skipped by default so Forecast mode only shows
attributable trend data.

Insert locally after checking the dry run:

```bash
npm run ingest:trends -- ./dataset/trend-sources.csv
```

That writes to `data/trends.json` by default. To insert into Supabase instead:

```bash
npm run ingest:trends -- ./dataset/trend-sources.csv --target supabase
```
