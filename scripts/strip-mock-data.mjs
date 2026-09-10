/**
 * Strip illustrative mock assessments / curated narratives.
 * Keeps only collector-owned coverage cells and protocol identity fields.
 * Run: node scripts/strip-mock-data.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));
const write = (rel, data) => {
  writeFileSync(join(root, rel), JSON.stringify(data, null, 2) + "\n");
  console.log("wrote", rel);
};

const COLLECTOR_FEEDS = new Set(["defiscan"]);

// 1) feeds registry — only feeds with a collector today
const feedsFile = read("data/feeds.json");
const keptFeeds = feedsFile.feeds.filter((f) => COLLECTOR_FEEDS.has(f.id));
write("data/feeds.json", {
  version: 1,
  updatedAt: new Date().toISOString(),
  feeds: keptFeeds,
  note: "Only feeds with an automated collector. Add entries when a new collector ships.",
});

// 2) coverage — keep only collector-written assessments
const coverageDir = join(root, "data/coverage");
for (const file of readdirSync(coverageDir).filter((f) => f.endsWith(".json"))) {
  const rel = `data/coverage/${file}`;
  const cov = read(rel);
  const next = {};
  for (const [feedId, cell] of Object.entries(cov.assessments || {})) {
    const fromCollector =
      COLLECTOR_FEEDS.has(feedId) &&
      cell?.collection?.collectorId &&
      COLLECTOR_FEEDS.has(cell.collection.collectorId);
    if (fromCollector) next[feedId] = cell;
  }
  write(rel, {
    protocolId: cov.protocolId,
    updatedAt: cov.updatedAt ?? new Date().toISOString(),
    assessments: next,
  });
}

// 3) protocols — drop mock governance / audits / incidents
const protocolsDir = join(root, "data/protocols");
for (const file of readdirSync(protocolsDir).filter((f) => f.endsWith(".json"))) {
  const rel = `data/protocols/${file}`;
  const p = read(rel);
  write(rel, {
    id: p.id,
    name: p.name,
    category: p.category,
    families: p.families ?? [],
    chain: p.chain ?? "ethereum",
    volumeMetric: Boolean(p.volumeMetric),
    tvlWithin: p.tvlWithin ?? null,
    defillamaSlug: p.defillamaSlug ?? null,
    defillamaSlugs: p.defillamaSlugs ?? [],
    defillamaParent: p.defillamaParent ?? null,
    // Curated fields — empty until a collector or verified PR fills them
    governance: [],
    audits: [],
    incidents: [],
  });
}

write("data/meta.json", {
  version: 1,
  project: "openrisk",
  chain: "ethereum",
  license: "AGPL-3.0",
  noCompositeScoring: true,
  mockData: false,
  collectors: ["defillama", "defiscan"],
  protocolCount: readdirSync(protocolsDir).filter((f) => f.endsWith(".json")).length,
  feedCount: keptFeeds.length,
});

console.log("done — run npm run collect to refresh live + snapshot");
