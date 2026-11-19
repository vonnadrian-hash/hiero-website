export const FEED_PATH = "/feed.xml";

/**
 * Permanent redirect to the canonical feed. The Location is a site path, which
 * HTTP allows, so the redirect works on previews as well as on hiero.org.
 */
export function GET(): Response {
  return new Response(null, {
    status: 308,
    headers: { Location: FEED_PATH },
  });
}
