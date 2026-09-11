import { readJson, type CollectorsConfig } from "./paths.ts";
import { collectDefillama } from "./metrics/defillama.ts";
import { discoverFeeds } from "./runtime/discoverFeeds.ts";
import {
  persistFeedResult,
  validateFeedResult,
  writeFeedsRegistry,
} from "./runtime/persistFeed.ts";
import { buildSnapshot } from "./snapshot.ts";

const main = async () => {
  const config = readJson<CollectorsConfig>("collectors/config/collectors.json");

  console.log("[openrisk] collect starting (3 stages)");

  // ── Stage 1: DefiLlama metrics ────────────────────────────────────────────
  if (config.defillama.enabled) {
    console.log("[openrisk] stage 1/3 — defillama");
    await collectDefillama();
  } else {
    console.log("[openrisk] stage 1/3 — defillama skipped");
  }

  // ── Stage 2: discover feeds/*.ts → validate → run → persist ─────────────
  console.log("[openrisk] stage 2/3 — feeds (discover)");
  const feeds = await discoverFeeds();
  writeFeedsRegistry(feeds);

  const collectedAt = new Date().toISOString();
  for (const feed of feeds) {
    console.log(`[openrisk] running feed ${feed.id}`);
    let raw: unknown;
    try {
      raw = await feed.run();
    } catch (err) {
      console.error(`[feeds] ${feed.id}: run() threw — skip`, err);
      continue;
    }
    const result = validateFeedResult(feed.id, raw);
    if (!result) continue;
    persistFeedResult(feed, result, collectedAt);
  }

  // ── Stage 3: snapshot ─────────────────────────────────────────────────────
  if (config.snapshot.enabled) {
    console.log("[openrisk] stage 3/3 — snapshot");
    buildSnapshot();
  } else {
    console.log("[openrisk] stage 3/3 — snapshot skipped");
  }

  console.log("[openrisk] collect finished");
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
