import { getAllPosts, getBlogIndexMeta } from "../../lib/posts";
import { buildRssFeed, RSS_CONTENT_TYPE } from "../../lib/rss";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hiero.org";

// Built once at build time, like the sitemap: the posts only change on deploy.
export const dynamic = "force-static";

export function GET(): Response {
  const blog = getBlogIndexMeta();
  const xml = buildRssFeed(getAllPosts(), {
    siteUrl: BASE_URL,
    title: blog.title,
    description: blog.subtitle,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": RSS_CONTENT_TYPE,
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
