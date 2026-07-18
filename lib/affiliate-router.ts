type AffiliateRouteOptions = {
  campaign?: string;
};

function getAmazonAffiliateTag() {
  return (
    process.env.AFFILIATE_AMAZON_TAG ??
    process.env.NEXT_PUBLIC_AFFILIATE_AMAZON_TAG ??
    process.env.AFFILIATE_TAG ??
    process.env.NEXT_PUBLIC_AFFILIATE_TAG ??
    ""
  );
}

function appendUtmTracking(url: URL, campaign = "retail_matrix") {
  if (!url.searchParams.has("utm_source")) {
    url.searchParams.set("utm_source", "personal_stylist_app");
  }

  if (!url.searchParams.has("utm_medium")) {
    url.searchParams.set("utm_medium", "affiliate");
  }

  if (!url.searchParams.has("utm_campaign")) {
    url.searchParams.set("utm_campaign", campaign);
  }
}

function wrapWithRedirect(cleanUrl: string, redirectUrl?: string) {
  if (!redirectUrl) {
    return cleanUrl;
  }

  const wrapper = new URL(redirectUrl);
  const urlParam =
    wrapper.searchParams.has("urllink") || wrapper.hostname.includes("shareasale")
      ? "urllink"
      : "url";

  wrapper.searchParams.set(urlParam, cleanUrl);

  if (!wrapper.searchParams.has("afftrack")) {
    wrapper.searchParams.set("afftrack", "personal_stylist_app");
  }

  return wrapper.toString();
}

export function routeAffiliateLink(productUrl: string, options: AffiliateRouteOptions = {}) {
  const url = new URL(productUrl);
  const hostname = url.hostname.toLowerCase();

  appendUtmTracking(url, options.campaign);

  if (hostname.includes("amazon.") || hostname.includes("amzn.")) {
    const amazonTag = getAmazonAffiliateTag();

    if (amazonTag && !url.searchParams.has("tag")) {
      url.searchParams.set("tag", amazonTag);
    }

    return url.toString();
  }

  if (hostname.includes("asos.")) {
    return wrapWithRedirect(
      url.toString(),
      process.env.AFFILIATE_ASOS_REDIRECT_URL ??
        process.env.NEXT_PUBLIC_AFFILIATE_ASOS_REDIRECT_URL ??
        process.env.SHAREASALE_REDIRECT_URL ??
        process.env.NEXT_PUBLIC_SHAREASALE_REDIRECT_URL
    );
  }

  return url.toString();
}
