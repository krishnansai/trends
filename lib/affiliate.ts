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

  const url = new URL(productUrl);
  const hostname = url.hostname.toLowerCase();

  if (affiliateTag && (hostname.includes("amazon.") || hostname.includes("amzn."))) {
    url.searchParams.set("tag", affiliateTag);
    return url.toString();
  }

  if (affiliateTag) {
    url.searchParams.set("utm_source", "atelier_signal");
    url.searchParams.set("utm_medium", "affiliate");
    url.searchParams.set("utm_campaign", "price_finder");
  }

  return url.toString();
}
