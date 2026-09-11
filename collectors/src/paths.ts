import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(here, "../..");
export const dataDir = join(repoRoot, "data");

export const readJson = <T>(relPath: string): T => {
  const full = join(repoRoot, relPath);
  return JSON.parse(readFileSync(full, "utf8")) as T;
};

export const writeJson = (relPath: string, data: unknown): void => {
  const full = join(repoRoot, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(data, null, 2) + "\n", "utf8");
};

export const listProtocolIds = (): string[] =>
  readdirSync(join(dataDir, "protocols"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();

export type Provenance = "onchain" | "verified" | "docs" | "selfrep";
export type CoverageStatus = "c" | "p" | "n";
export type FeedType = "rating" | "dash" | "monitor" | "research";

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

export type Protocol = {
  id: string;
  name: string;
  category: string;
  families: string[];
  defillamaSlug: string | null;
  defillamaSlugs?: string[];
  defillamaParent?: string | null;
  volumeMetric: boolean;
  tvlWithin: string | null;
  chain: string;
  governance: Array<{ key: string; value: string; provenance: Provenance }>;
  audits: Array<{ year: string; summary: string; provenance: Provenance }>;
  incidents: Array<{ year: string; summary: string; severity: "ok" | "ser" | "crit" }>;
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

export type CoverageFile = {
  protocolId: string;
  updatedAt: string;
  assessments: Record<string, CoverageCell>;
};

export type CollectorsConfig = {
  defillama: {
    enabled: boolean;
    baseUrl: string;
    preferEthereumTvl: boolean;
    description?: string;
  };
  snapshot: {
    enabled: boolean;
    description?: string;
  };
};
