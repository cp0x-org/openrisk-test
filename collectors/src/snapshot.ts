import {
  dataDir,
  listProtocolIds,
  readJson,
  writeJson,
  type CoverageFile,
  type Feed,
  type Protocol,
} from "./paths.ts";
import { join } from "node:path";
import { readFileSync } from "node:fs";

type Category = { id: string; name: string; color: string };

type LiveTvl = {
  updatedAt: string | null;
  protocols: Record<
    string,
    {
      tvlUsd: number | null;
      ethereumTvlUsd: number | null;
      volume24hUsd: number | null;
      tvlWithin: string | null;
    }
  >;
};

export const buildSnapshot = (): void => {
  const feedsFile = readJson<{ feeds: Feed[] }>("data/feeds.json");
  const categoriesFile = readJson<{ categories: Category[] }>("data/categories.json");
  const live = readJson<LiveTvl>("data/live/tvl.json");
  const meta = readJson<Record<string, unknown>>("data/meta.json");

  const protocols = listProtocolIds().map((id) => {
    const p = readJson<Protocol>(`data/protocols/${id}.json`);
    const coverage = readJson<CoverageFile>(`data/coverage/${id}.json`);
    const liveRow = live.protocols[id] ?? {
      tvlUsd: null,
      ethereumTvlUsd: null,
      volume24hUsd: null,
      tvlWithin: p.tvlWithin,
    };

    return {
      ...p,
      tvlUsd: liveRow.tvlUsd,
      ethereumTvlUsd: liveRow.ethereumTvlUsd,
      volume24hUsd: liveRow.volume24hUsd,
      coverage: coverage.assessments,
      coverageUpdatedAt: coverage.updatedAt,
    };
  });

  const feedCount = feedsFile.feeds.length;
  let full = 0;
  let partial = 0;
  for (const p of protocols) {
    for (const f of feedsFile.feeds) {
      const s = p.coverage[f.id]?.status ?? "n";
      if (s === "c") full += 1;
      else if (s === "p") partial += 1;
    }
  }
  const cells = protocols.length * feedCount;
  const coveragePct = cells === 0 ? 0 : Math.round(((full + partial) / cells) * 100);
  const fundsAtRisk = protocols.reduce((sum, p) => {
    if (p.volumeMetric || p.tvlWithin) return sum;
    return sum + (p.tvlUsd ?? 0);
  }, 0);

  const snapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    liveUpdatedAt: live.updatedAt,
    meta,
    categories: categoriesFile.categories,
    feeds: feedsFile.feeds,
    protocols,
    kpis: {
      protocolCount: protocols.length,
      feedCount,
      cellsAssessed: cells,
      coveragePct,
      fundsAtRiskUsd: fundsAtRisk,
      coveredCells: full,
      partialCells: partial,
    },
  };

  writeJson("data/snapshot.json", snapshot);

  // Keep a tiny checksum for CI visibility
  const bytes = readFileSync(join(dataDir, "snapshot.json")).byteLength;
  console.log(`[snapshot] wrote data/snapshot.json (${bytes} bytes, ${protocols.length} protocols)`);
};
