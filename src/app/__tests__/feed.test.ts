import { afterEach, describe, expect, it, vi } from "vitest";

const postsMock = vi.hoisted(() => ({
  getAllPosts: vi.fn(),
  getBlogIndexMeta: vi.fn(),
}));

vi.mock("../../lib/posts", () => ({
  getAllPosts: postsMock.getAllPosts,
  getBlogIndexMeta: postsMock.getBlogIndexMeta,
}));

describe("/feed.xml", () => {
  afterEach(() => {
    postsMock.getAllPosts.mockReset();
    postsMock.getBlogIndexMeta.mockReset();
    vi.resetModules();
  });

  it("serves RSS with the right content type and cache headers", async () => {
    postsMock.getBlogIndexMeta.mockReturnValue({
      title: "Hiero Blog",
      subtitle: "Stay up to date.",
      listTitle: "Recent Articles",
    });
    postsMock.getAllPosts.mockReturnValue([
      {
        slug: "hello-world",
        title: "Hello World",
        date: "2026-03-20T00:00:00.000Z",
        featuredImage: "/images/hello.png",
        readingMinutes: 1,
        authors: [],
        categories: [],
        tags: [],
      },
    ]);

    const route = await import("../feed.xml/route");
    const response = route.GET();
    const body = await response.text();

    expect(route.dynamic).toBe("force-static");
    expect(response.headers.get("Content-Type")).toBe(
      "application/rss+xml; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    expect(body).toContain("<title>Hiero Blog</title>");
    expect(body).toContain("/blog/hello-world</link>");
  });
});

describe("legacy feed paths", () => {
  it.each([
    ["/index.xml", () => import("../index.xml/route")],
    ["/posts/index.xml", () => import("../posts/index.xml/route")],
  ])("%s redirects permanently to /feed.xml", async (_path, load) => {
    const route = await load();
    const response = route.GET();

    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe("/feed.xml");
  });
});
