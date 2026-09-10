export type Provenance = "onchain" | "verified" | "docs" | "selfrep";
export type CoverageStatus = "c" | "p" | "n";
export type FeedType = "rating" | "dash" | "monitor" | "research";
export type Severity = "ok" | "ser" | "crit";

export type Facet = {
  key: string;
  label: string;
  value: string;
  valueType?: "stage" | "score" | "rating" | "enum" | "text" | "count" | "boolean";
  scale?: string;
};

export type CollectionMeta = {
  method: "api" | "git" | "scrape" | "manual";
  collectedAt: string;
  collectorId: string;
};

export type Feed = {
  id: string;
  name: string;
  type: FeedType;
  typeLabel: string;
  focus: string;
  url: string;
  methodologyUrl: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

/** Universal per-feed assessment — same shape for every provider */
export type CoverageCell = {
  status: CoverageStatus;
  label?: string | null;
  verbatim?: string | null;
  asOf?: string | null;
  sourceUrl?: string | null;
  collection?: CollectionMeta;
  facets?: Facet[];
  raw?: Record<string, unknown>;
};

export type Protocol = {
  id: string;
  name: string;
  category: string;
  families: string[];
  volumeMetric: boolean;
  tvlWithin: string | null;
  tvlUsd: number | null;
  ethereumTvlUsd: number | null;
  volume24hUsd: number | null;
  governance: Array<{ key: string; value: string; provenance: Provenance }>;
  audits: Array<{ year: string; summary: string; provenance: Provenance }>;
  incidents: Array<{ year: string; summary: string; severity: Severity }>;
  coverage: Record<string, CoverageCell>;
};

export type Snapshot = {
  version: number;
  generatedAt: string;
  liveUpdatedAt: string | null;
  categories: Category[];
  feeds: Feed[];
  protocols: Protocol[];
  kpis: {
    protocolCount: number;
    feedCount: number;
    cellsAssessed: number;
    coveragePct: number;
    fundsAtRiskUsd: number;
    coveredCells: number;
    partialCells: number;
  };
};
