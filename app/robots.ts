import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  // Protótipo de proposta: não indexar até a incorporadora aprovar.
  return { rules: { userAgent: "*", disallow: "/" }, sitemap: `${SITE}/sitemap.xml` };
}
