import {
  listProtocolIds,
  readJson,
  writeJson,
  type CoverageCell,
  type CoverageFile,
  type CoverageStatus,
} from "../paths.ts";
import type { FeedAssessment, FeedModule, FeedRunResult } from "../feeds/types.ts";

const STATUSES = new Set<CoverageStatus>(["c", "p", "n"]);

export const validateFeedResult = (
  feedId: string,
  result: unknown,
): FeedRunResult | null => {
  if (!result || typeof result !== "object") {
    console.warn(`[feeds] ${feedId}: run() must return an object`);
    return null;
  }
  const protocols = (result as FeedRunResult).protocols;
  if (!protocols || typeof protocols !== "object") {
    console.warn(`[feeds] ${feedId}: result.protocols must be an object`);
    return null;
  }

  const known = new Set(listProtocolIds());
  const cleaned: Record<string, FeedAssessment> = {};

  for (const [protocolId, cell] of Object.entries(protocols)) {
    if (!known.has(protocolId)) {
      console.warn(`[feeds] ${feedId}: unknown protocol "${protocolId}" — drop`);
      continue;
    }
    if (!cell || typeof cell !== "object") {
      console.warn(`[feeds] ${feedId}: ${protocolId} cell invalid — drop`);
      continue;
    }
    if (!STATUSES.has(cell.status)) {
      console.warn(`[feeds] ${feedId}: ${protocolId} status must be c|p|n — drop`);
      continue;
    }
    if ((cell.status === "c" || cell.status === "p") && !cell.verbatim && !cell.label) {
      console.warn(
        `[feeds] ${feedId}: ${protocolId} covered/partial should have label or verbatim`,
      );
    }
    cleaned[protocolId] = {
      status: cell.status,
      label: cell.label ?? null,
      verbatim: cell.verbatim ?? null,
      asOf: cell.asOf ?? null,
      sourceUrl: cell.sourceUrl ?? null,
      facets: Array.isArray(cell.facets) ? cell.facets : [],
      raw: cell.raw && typeof cell.raw === "object" ? cell.raw : undefined,
    };
  }

  for (const id of known) {
    if (!cleaned[id]) {
      cleaned[id] = {
        status: "n",
        label: null,
        verbatim: null,
        asOf: null,
        sourceUrl: null,
        facets: [],
        raw: { reason: "feed_omitted_protocol" },
      };
    }
  }

  return { protocols: cleaned };
};

const mergeCoverage = (
  protocolId: string,
  feedId: string,
  cell: CoverageCell,
): void => {
  const rel = `data/coverage/${protocolId}.json`;
  let file: CoverageFile;
  try {
    file = readJson<CoverageFile>(rel);
  } catch {
    file = { protocolId, updatedAt: cell.collection!.collectedAt, assessments: {} };
  }
  file.assessments[feedId] = cell;
  file.updatedAt = cell.collection!.collectedAt;
  writeJson(rel, file);
};

/** Validate feed output and write open-data files. Feeds must not write themselves. */
export const persistFeedResult = (
  feed: FeedModule,
  result: FeedRunResult,
  collectedAt: string,
): void => {
  const byProtocol: Record<string, CoverageCell> = {};

  for (const [protocolId, assessment] of Object.entries(result.protocols)) {
    const cell: CoverageCell = {
      ...assessment,
      collection: {
        method: feed.collectionMethod ?? "api",
        collectedAt,
        collectorId: feed.id,
      },
    };
    byProtocol[protocolId] = cell;
    mergeCoverage(protocolId, feed.id, cell);
  }

  writeJson(`data/live/feeds/${feed.id}.json`, {
    version: 1,
    feedId: feed.id,
    name: feed.name,
    collectedAt,
    protocols: byProtocol,
  });

  const covered = Object.values(byProtocol).filter((c) => c.status !== "n").length;
  console.log(
    `[feeds] ${feed.id}: persisted ${covered} covered/partial of ${Object.keys(byProtocol).length}`,
  );
};

/** Rebuild data/feeds.json from discovered feed modules (UI registry). */
export const writeFeedsRegistry = (feeds: FeedModule[]): void => {
  writeJson("data/feeds.json", {
    version: 1,
    updatedAt: new Date().toISOString(),
    feeds: feeds.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      typeLabel: f.typeLabel,
      focus: f.description,
      url: f.url,
      methodologyUrl: f.methodologyUrl,
    })),
    note: "Generated from collectors/src/feeds/*.ts during collect. Do not edit by hand.",
  });
};
