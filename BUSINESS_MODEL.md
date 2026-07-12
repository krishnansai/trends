# PERSONAL STYLIST - Project and Business Model

## Executive Summary

PERSONAL STYLIST is a premium fashion intelligence and styling platform. The product combines a
visual fashion archive, AI-assisted personal styling, grooming recommendations, and price discovery
into one consumer-facing experience.

The current version is built as a Next.js application with local JSON data support, optional
Supabase integration, and launch-ready UI direction. The product is intentionally structured so it
can run locally during MVP development, then later connect to affiliate network APIs, approved
retailer feeds, and live commerce providers.

## What We Have Built So Far

### 1. Premium Brand UI

- Rebranded the app into `PERSONAL STYLIST`.
- Added a luxury editorial dark theme inspired by premium fashion retail experiences.
- Updated navigation, buttons, badges, inputs, cards, and panels to a consistent high-end visual
  system.
- Removed clutter from the main product navigation.

### 2. Archive + Forecast Combined Page

- Consolidated `/forecasting` into `/archive`.
- `/archive` now has two clean modes:
  - `Archive`: browse historical clothing looks from 2022-2026.
  - `Forecast`: view forecast trend cards inside the same page.
- `/forecasting` redirects to `/archive`.
- Removed the old standalone Forecasting nav item.

### 3. Removed Non-Launch Dataset Page

- Removed CelebA from the visible navigation.
- `/celeba` redirects to `/archive`.
- Kept internal dataset helper/API code for future training or local experiments.

### 4. AI Personal Stylist

- Built `/stylist` with photo upload and analysis flow.
- Detects/handles:
  - demographic profile: menswear, womenswear, unisex
  - face shape
  - color undertone
  - fit profile
  - recommended color palette
  - occasion and season context
- Added strict demographic guardrails to prevent wrong-category recommendations.
- Added environment and season filters such as mall, beach, gym, formal, summer, winter, all-season.
- Added grooming recommendations:
  - hairstyle
  - beard style
  - matching face shape
  - product CTA links
- Added optional Ollama vision analysis while keeping browser fallback.

### 5. Price Finder

- Built `/price-finder` for product URL/search/photo input.
- Current launch mode is local/no-API:
  - Pasted product URLs are parsed server-side when retailer metadata is available.
  - Typed searches open ranked retailer result pages.
  - Estimate-only results are clearly labeled as estimated.
- SerpAPI support exists behind a provider flag but is disabled by default.
- Architecture is ready to swap in affiliate network APIs later.

### 6. Data Layer

- Added local data files for garments, trends, grooming, and launch packs.
- Added ingestion scripts for:
  - Kaggle/retail catalog CSVs
  - sourced trend CSVs
  - grooming seed data
  - stylist training/validation
- Added Supabase migrations and schema support for:
  - garments
  - trends
  - grooming trends
  - demographic guardrails
  - occasion and season filters

## Current Product Modules

| Module | Route | Status |
| --- | --- | --- |
| Archive + Forecast | `/archive` | Active |
| Price Finder | `/price-finder` | Active |
| AI Personal Stylist | `/stylist` | Active |
| Settings | `/settings` | Active |
| Forecasting | `/forecasting` | Redirects to `/archive` |
| CelebA Preview | `/celeba` | Redirects to `/archive` |

## Target Users

### Consumer Users

- People who want outfit recommendations based on their photo, style context, and season.
- Shoppers who want to compare product prices before buying.
- Users looking for grooming suggestions aligned with face shape and fashion profile.

### B2B Users

- Fashion brands seeking trend insight and product discovery funnels.
- Retailers and boutiques that want data-driven styling placement.
- Affiliate commerce partners seeking high-intent purchase traffic.

## Business Model

### 1. Affiliate Commerce Revenue

The main monetization path is affiliate commission from product clicks and purchases.

Potential partners:

- Amazon Associates / Product Advertising API
- Flipkart Affiliate
- Myntra/AJIO partner or affiliate programs where available
- Cuelinks, Admitad, Impact, Rakuten, ShareASale, or similar networks
- Brand-direct affiliate agreements

Current implementation uses local/search-page mode. When affiliate APIs are approved, the provider
layer can return exact product links, prices, images, availability, ratings, and commission-wrapped
URLs.

### 2. Premium Styling Subscription

Possible consumer subscription tiers:

- Free: basic archive, limited stylist scans, retailer search links.
- Premium: unlimited style scans, saved profiles, grooming cards, trend-aware outfit boards.
- Pro: personal wardrobe history, event-specific outfit planning, deeper price alerts.

### 3. B2B Brand Placement

Brands can pay for preferred placement only when their products genuinely match:

- user demographic
- occasion
- season
- fit profile
- color profile
- trend category

This keeps recommendations useful while creating a direct conversion funnel.

### 4. Trend Intelligence Dashboard

The archive and forecast data can become a paid insights product for small brands:

- trend category movement
- demographic demand signals
- season/occasion product mapping
- emerging grooming and accessory demand
- product gap analysis

### 5. Sponsored Editorial Collections

Curated brand collections can be surfaced as editorial lookbooks:

- Summer resort edit
- Mall/streetwear edit
- Workwear edit
- Grooming architecture edit

## Launch Positioning

PERSONAL STYLIST is not just a dashboard. It is positioned as:

> A premium AI styling and fashion discovery platform that helps users decide what looks good,
> where to buy it, and how to complete the look with grooming and accessories.

## Technical Architecture

### Frontend

- Next.js App Router
- Tailwind CSS
- Local shadcn-style primitives
- Premium dark editorial UI system

### Backend/API

- Next.js API routes
- Local JSON fallback
- Optional Supabase
- Optional Ollama vision route
- Price Finder provider abstraction

### Data

- `data/garments.json`
- `data/trends.json`
- grooming launch packs
- garment/trend/grooming ingestion scripts
- Supabase SQL migrations

### AI/Recommendation Logic

- Browser-side photo analysis fallback
- Optional Ollama vision analysis
- Strict demographic filtering
- occasion and season filtering
- fit profile matching
- face-shape grooming matching

## Current Launch Mode

The app is currently configured for local/no-API development:

```bash
PRICE_FINDER_LIVE_PROVIDER=local
```

This avoids depending on paid APIs during product completion. Later, affiliate APIs can be added as
provider adapters without changing the UI.

## Next Milestones

1. Add more real garment and trend data.
2. Improve exact product scraping for pasted retailer URLs.
3. Add saved user profile state.
4. Add affiliate provider adapters.
5. Add product click tracking.
6. Add admin/import dashboard for CSV uploads.
7. Prepare launch landing copy and privacy policy.
8. Deploy production build.

## Launch Risks

- Retailer scraping may fail or be blocked by some sites.
- Affiliate APIs require approval and may not be unlimited.
- Live price/rating accuracy depends on provider quality.
- Uploaded-photo analysis must be positioned as style guidance, not identity verification.
- User privacy policy is required before public launch.

## Recommended MVP Launch Scope

For first launch, keep the product focused:

- `/archive`: archive + forecast mode
- `/stylist`: AI styling + grooming recommendations
- `/price-finder`: search/result links + pasted product URL metadata
- local JSON data first
- no visible experimental dataset pages

This gives a clean consumer product while leaving room for affiliate and B2B revenue expansion.
