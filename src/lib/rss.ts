import type { PostMeta } from "./posts";

/** How many of the newest posts the feed carries. */
export const RSS_ITEM_LIMIT = 20;

export const RSS_CONTENT_TYPE = "application/rss+xml; charset=utf-8";

export interface RssChannel {
  /** Absolute site origin with no trailing slash, e.g. `https://hiero.org`. */
  siteUrl: string;
  title: string;
  description: string;
  /** Site path the channel links to. */
  path?: string;
  /** Site path the feed itself is served from. */
  feedPath?: string;
  language?: string;
}

/**
 * Escape the five characters XML reserves, and drop the control characters
 * XML 1.0 does not allow at all, so no title or abstract can break the feed.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * RFC 822 date for `<pubDate>`, or `null` when the post has no usable date.
 *
 * `getAllPosts` turns a missing frontmatter date into the Unix epoch, so the
 * epoch is treated as "no date" rather than published in 1970.
 */
export function toRfc822(date: string): string | null {
  const time = Date.parse(date);
  if (Number.isNaN(time) || time === 0) return null;
  return new Date(time).toUTCString();
}

export function absoluteUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  if (!path || path === "/") return base;
  return `${base}/${path.replace(/^\/+/, "")}`;
}

function renderItem(post: PostMeta, siteUrl: string): string {
  const link = absoluteUrl(siteUrl, `/blog/${post.slug}`);
  const pubDate = toRfc822(post.date);
  const lines = [
    "    <item>",
    `      <title>${escapeXml(post.title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
  ];
  if (pubDate) lines.push(`      <pubDate>${pubDate}</pubDate>`);
  if (post.abstract) {
    lines.push(`      <description>${escapeXml(post.abstract)}</description>`);
  }
  for (const category of post.categories) {
    lines.push(`      <category>${escapeXml(category)}</category>`);
  }
  lines.push("    </item>");
  return lines.join("\n");
}

/**
 * Build an RSS 2.0 document from posts. Posts are re-sorted newest first and
 * capped at `limit`, so the result does not depend on the caller's order.
 */
export function buildRssFeed(
  posts: PostMeta[],
  channel: RssChannel,
  limit: number = RSS_ITEM_LIMIT,
): string {
  const items = [...posts]
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))
    .slice(0, Math.max(0, limit));

  const channelLink = absoluteUrl(channel.siteUrl, channel.path ?? "/blog");
  const feedLink = absoluteUrl(
    channel.siteUrl,
    channel.feedPath ?? "/feed.xml",
  );
  const newest = items.map(post => toRfc822(post.date)).find(Boolean);

  const head = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(channelLink)}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    `    <language>${escapeXml(channel.language ?? "en")}</language>`,
    `    <atom:link href="${escapeXml(feedLink)}" rel="self" type="application/rss+xml" />`,
  ];
  if (newest) head.push(`    <lastBuildDate>${newest}</lastBuildDate>`);

  return [
    ...head,
    ...items.map(post => renderItem(post, channel.siteUrl)),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
