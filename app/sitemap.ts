import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base="https://poker-theta.vercel.app";
  return ["/","/pricing","/affiliate","/terms","/privacy","/legal"].map((path,index)=>({
    url:`${base}${path}`,lastModified:new Date(),changeFrequency:index===0?"weekly":"monthly",priority:index===0?1:.5,
  }));
}
