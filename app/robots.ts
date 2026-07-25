import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {rules:{userAgent:"*",allow:["/","/pricing","/affiliate","/terms","/privacy"],disallow:["/account","/dashboard","/hands","/improvements","/good-hands","/play","/play-results","/upload","/login"]},sitemap:"https://poker-theta.vercel.app/sitemap.xml"};
}
