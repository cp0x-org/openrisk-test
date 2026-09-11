import type { CoverageStatus, Facet, FeedType, CollectionMeta } from "../paths.ts";

/** What a community feed module must export (default or named `feed`). */
export type FeedModule = {
  /** Must match the filename without `.ts` (e.g. defiscan.ts → "defiscan"). */
  id: string;
  name: string;
  /** Short focus blurb shown in the UI. */
  description: string;
  type: FeedType;
  typeLabel: string;
  url: string;
  methodologyUrl: string;
  /** Default true. Set false to keep the file in-repo but skip collection. */
  enabled?: boolean;
  /** How OpenRisk collected this feed (written by orchestrator into coverage cells). */
  collectionMethod?: CollectionMeta["method"];
  /** Collect assessments. Must NOT write files — return data only. */
  run: () => Promise<FeedRunResult> | FeedRunResult;
};

/** Per-protocol assessment returned by `run()` (no disk writes). */
export type FeedAssessment = {
  status: CoverageStatus;
  label?: string | null;
  verbatim?: string | null;
  asOf?: string | null;
  sourceUrl?: string | null;
  facets?: Facet[];
  raw?: Record<string, unknown>;
};

export type FeedRunResult = {
  /** Map of OpenRisk protocolId → assessment cell */
  protocols: Record<string, FeedAssessment>;
};
