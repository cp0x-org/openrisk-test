/**
 * Template for a new risk feed (copy → rename to <id>.ts).
 * Filename MUST equal `feed.id` (example: llamarisk.ts → id: "llamarisk").
 *
 * Rules:
 * - Export `feed` (or default export) matching FeedModule
 * - Implement `run()` that RETURNS data — never write to disk
 * - OpenRisk orchestrator validates + persists + commits
 *
 * Prefix with `_` to keep a file in the folder without collecting it.
 */
import type { FeedModule, FeedRunResult } from "./types.ts";
import { listProtocolIds } from "../paths.ts";

const run = async (): Promise<FeedRunResult> => {
  const protocols: FeedRunResult["protocols"] = {};
  for (const id of listProtocolIds()) {
    protocols[id] = {
      status: "n",
      label: null,
      verbatim: null,
      asOf: null,
      sourceUrl: null,
      facets: [],
      raw: { reason: "template_not_implemented" },
    };
  }
  return { protocols };
};

export const feed: FeedModule = {
  id: "example",
  name: "Example Feed",
  description: "Replace this with your methodology one-liner",
  type: "rating",
  typeLabel: "R",
  url: "https://example.com",
  methodologyUrl: "https://example.com/methodology",
  enabled: false,
  run,
};

export default feed;
