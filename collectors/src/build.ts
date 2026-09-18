/**
 * Offline rebuild: regenerate the feed registry from collectors/src/feeds/*.ts
 * and reassemble data/snapshot.json. No network calls — safe to run in the
 * Pages build after collected data has been restored from the artifact/release.
 */
import { discoverFeeds } from "./runtime/discoverFeeds.ts";
import { writeFeedsRegistry } from "./runtime/persistFeed.ts";
import { buildSnapshot } from "./snapshot.ts";

const main = async () => {
  writeFeedsRegistry(await discoverFeeds());
  buildSnapshot();
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
