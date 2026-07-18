import { routeAffiliateLink } from "@/lib/affiliate-router";

export function generateAffiliateLink(searchQuery: string) {
  const baseUrl = process.env.NEXT_PUBLIC_AFFILIATE_SEARCH_URL ?? "https://www.amazon.in/s";
  const affiliateTag = process.env.NEXT_PUBLIC_AFFILIATE_TAG;
  const url = new URL(baseUrl);

  if (!url.searchParams.has("k")) {
    url.searchParams.set("k", searchQuery);
  }

  if (affiliateTag && !url.searchParams.has("tag")) {
    url.searchParams.set("tag", affiliateTag);
  }

  return url.toString();
}

export function generateAffiliateDeepLink(productUrl: string) {
  const wrapperUrl =
    process.env.AFFILIATE_DEEP_LINK_URL ?? process.env.NEXT_PUBLIC_AFFILIATE_DEEP_LINK_URL;
  const affiliateTag = process.env.AFFILIATE_TAG ?? process.env.NEXT_PUBLIC_AFFILIATE_TAG;

  if (wrapperUrl) {
    const url = new URL(wrapperUrl);
    url.searchParams.set("url", productUrl);

    if (affiliateTag && !url.searchParams.has("tag")) {
      url.searchParams.set("tag", affiliateTag);
    }

    return url.toString();
  }

  return routeAffiliateLink(productUrl, { campaign: "price_finder" });
}
