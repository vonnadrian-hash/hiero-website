import { describe, expect, it } from "vitest";
import type { PostMeta } from "../posts";
import {
  absoluteUrl,
  buildRssFeed,
  escapeXml,
  RSS_ITEM_LIMIT,
  toRfc822,
} from "../rss";

function post(overrides: Partial<PostMeta> = {}): PostMeta {
  return {
    slug: "hello-world",
    title: "Hello World",
    date: "2026-03-20T00:00:00.000Z",
    abstract: "A first post.",
    featuredImage: "/images/hello.png",
    readingMinutes: 1,
    authors: [],
    categories: ["Blog"],
    tags: [],
    ...overrides,
  };
}

const channel = {
  siteUrl: "https://example.org",
  title: "Hiero Blog",
  description: "News & announcements",
};

describe("escapeXml", () => {
  it("escapes the reserved characters", () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;",
    );
  });

  it("drops control characters XML does not allow", () => {
    expect(escapeXml("a\u0000b\u001Fc\td")).toBe("abc\td");
  });
});

describe("toRfc822", () => {
  it("formats a valid date", () => {
    expect(toRfc822("2026-03-20T00:00:00.000Z")).toBe(
      "Fri, 20 Mar 2026 00:00:00 GMT",
    );
  });

  it("returns null for invalid, empty, and epoch dates", () => {
    expect(toRfc822("not a date")).toBeNull();
    expect(toRfc822("")).toBeNull();
    expect(toRfc822(new Date(0).toISOString())).toBeNull();
  });
});

describe("absoluteUrl", () => {
  it("joins without doubling slashes", () => {
    expect(absoluteUrl("https://example.org/", "/blog/a")).toBe(
      "https://example.org/blog/a",
    );
    expect(absoluteUrl("https://example.org", "/")).toBe("https://example.org");
  });
});

describe("buildRssFeed", () => {
  it("produces an RSS 2.0 channel with absolute links", () => {
    const xml = buildRssFeed([post()], channel);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<link>https://example.org/blog</link>");
    expect(xml).toContain(
      "<description>News &amp; announcements</description>",
    );
    expect(xml).toContain(
      '<atom:link href="https://example.org/feed.xml" rel="self" type="application/rss+xml" />',
    );
  });

  it("includes title, link, guid, pubDate and description for each post", () => {
    const xml = buildRssFeed([post()], channel);

    expect(xml).toContain("<title>Hello World</title>");
    expect(xml).toContain("<link>https://example.org/blog/hello-world</link>");
    expect(xml).toContain(
      '<guid isPermaLink="true">https://example.org/blog/hello-world</guid>',
    );
    expect(xml).toContain("<pubDate>Fri, 20 Mar 2026 00:00:00 GMT</pubDate>");
    expect(xml).toContain("<description>A first post.</description>");
    expect(xml).toContain("<category>Blog</category>");
  });

  it("escapes post fields", () => {
    const xml = buildRssFeed(
      [post({ title: "SDKs <3 & you", abstract: `"Quoted"` })],
      channel,
    );

    expect(xml).toContain("<title>SDKs &lt;3 &amp; you</title>");
    expect(xml).toContain("<description>&quot;Quoted&quot;</description>");
  });

  it("omits pubDate rather than printing an invalid or 1970 date", () => {
    const xml = buildRssFeed(
      [post({ date: new Date(0).toISOString() })],
      channel,
    );

    expect(xml).not.toContain("<pubDate>");
    expect(xml).not.toContain("Invalid Date");
    expect(xml).not.toContain("1970");
  });

  it("omits description when a post has no abstract", () => {
    const xml = buildRssFeed([post({ abstract: undefined })], channel);
    const item = xml.slice(xml.indexOf("<item>"));

    expect(item).not.toContain("<description>");
  });

  it("keeps only the newest posts, newest first", () => {
    const posts = Array.from({ length: RSS_ITEM_LIMIT + 5 }, (_, i) =>
      post({
        slug: `post-${i}`,
        date: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
      }),
    );
    const xml = buildRssFeed(posts, channel);
    const links = [
      ...xml.matchAll(/<link>[^<]*\/blog\/(post-\d+)<\/link>/g),
    ].map(m => m[1]);

    expect(links).toHaveLength(RSS_ITEM_LIMIT);
    expect(links[0]).toBe(`post-${RSS_ITEM_LIMIT + 4}`);
    expect(links).not.toContain("post-0");
  });

  it("uses the newest post's date as lastBuildDate", () => {
    const xml = buildRssFeed(
      [
        post({ slug: "old", date: "2025-01-01T00:00:00.000Z" }),
        post({ slug: "new", date: "2026-02-02T00:00:00.000Z" }),
      ],
      channel,
    );

    expect(xml).toContain(
      "<lastBuildDate>Mon, 02 Feb 2026 00:00:00 GMT</lastBuildDate>",
    );
  });
});
