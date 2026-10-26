import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Embeds belong on companies' own sites; labels and admin are tools, not content.
    rules: { userAgent: "*", allow: "/", disallow: ["/*/embed/", "/*/labels/", "/admin"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
