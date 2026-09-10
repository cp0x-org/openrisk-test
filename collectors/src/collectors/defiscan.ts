import {
  listProtocolIds,
  readJson,
  writeJson,
  type CoverageCell,
  type CoverageFile,
  type CoverageStatus,
  type Facet,
} from "../paths.ts";

export type DefiscanFeedConfig = {
  feedId: string;
  source: {
    kind: "github";
    owner: string;
    repo: string;
    ref: string;
    protocolsPath: string;
    siteBase: string;
  };
  riskDimensionKeys: Array<{ key: string; label: string }>;
  protocols: Record<
    string,
    {
      reviews: Array<{ slug: string; chain: string; role: "primary" | "secondary" }>;
      forcePartial?: boolean;
      partialReason?: string;
      partialIfMissingSecondary?: boolean;
    }
  >;
};

type ParsedReview = {
  slug: string;
  chain: string;
  role: "primary" | "secondary";
  path: string;
  sourceUrl: string;
  stage: number | null;
  risks: string[];
  reasons: string[];
  publishDate: string | null;
  updateDate: string | null;
  summary: string | null;
  scoreLines: Record<string, string>;
};

const RISK_LETTER: Record<string, string> = {
  L: "Low",
  M: "Medium",
  H: "High",
};

const extractFrontmatter = (md: string): { fm: string; body: string } => {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { fm: "", body: md };
  return { fm: match[1], body: match[2] };
};

const parseScalar = (fm: string, key: string): string | null => {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const m = fm.match(re);
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, "");
};

const parseStringArray = (fm: string, key: string): string[] => {
  const m = fm.match(new RegExp(`${key}:\\s*(\\[[\\s\\S]*?\\])`, "m"));
  if (!m) return [];
  try {
    const normalized = m[1].replace(/'/g, '"');
    const parsed = JSON.parse(normalized) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [...m[1].matchAll(/"([^"]+)"|'([^']+)'/g)].map((x) => x[1] || x[2]);
  }
};

const extractSummary = (body: string): string | null => {
  const m = body.match(/#\s*Summary\s*\r?\n+([\s\S]*?)(?=\r?\n#\s|\r?\n##\s|$)/i);
  if (!m) return null;
  const text = m[1]
    .replace(/>\s*/g, "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
};

const extractScoreLines = (body: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/>\s*([A-Za-z ]+?)\s+score:\s*([A-Za-z]+)/g)) {
    const label = m[1].trim().toLowerCase().replace(/\s+/g, "_");
    out[label] = m[2].trim();
  }
  return out;
};

const parseReviewMarkdown = (
  md: string,
  meta: { slug: string; chain: string; role: "primary" | "secondary"; path: string; sourceUrl: string },
): ParsedReview => {
  const { fm, body } = extractFrontmatter(md);
  const stageRaw = parseScalar(fm, "stage");
  const stage = stageRaw != null && stageRaw !== "" ? Number(stageRaw) : null;
  let updateDate = parseScalar(fm, "update_date");
  if (updateDate === "1970-01-01") updateDate = null;
  const publishDate = parseScalar(fm, "publish_date");

  return {
    ...meta,
    stage: Number.isFinite(stage) ? stage : null,
    risks: parseStringArray(fm, "risks"),
    reasons: parseStringArray(fm, "reasons"),
    publishDate,
    updateDate,
    summary: extractSummary(body),
    scoreLines: extractScoreLines(body),
  };
};

const buildVerbatim = (review: ParsedReview, dims: DefiscanFeedConfig["riskDimensionKeys"]): string => {
  const stagePart =
    review.stage == null ? "Stage not stated" : `Stage ${review.stage}`;
  const riskPart = dims
    .map((d, i) => {
      const letter = review.risks[i];
      const word = review.scoreLines[d.key] ?? (letter ? RISK_LETTER[letter] : null);
      const shown = word ?? letter ?? "—";
      return `${d.label} ${shown}`;
    })
    .join("; ");

  if (review.summary) {
    return `${stagePart}. ${review.summary}`;
  }
  return `${stagePart} — ${riskPart}.`;
};

const buildFacets = (
  review: ParsedReview,
  dims: DefiscanFeedConfig["riskDimensionKeys"],
  extras: Facet[] = [],
): Facet[] => {
  const facets: Facet[] = [];
  if (review.stage != null) {
    facets.push({
      key: "stage",
      label: "Decentralization stage",
      value: String(review.stage),
      valueType: "stage",
      scale: "0-2",
    });
  }
  dims.forEach((d, i) => {
    const letter = review.risks[i];
    if (!letter) return;
    facets.push({
      key: d.key,
      label: d.label,
      value: letter,
      valueType: "enum",
      scale: "L|M|H",
    });
  });
  return [...facets, ...extras];
};

const toAssessment = (
  cfg: DefiscanFeedConfig,
  mapping: DefiscanFeedConfig["protocols"][string] | undefined,
  reviews: ParsedReview[],
  collectedAt: string,
): CoverageCell => {
  if (reviews.length === 0) {
    return {
      status: "n",
      label: null,
      verbatim: null,
      asOf: null,
      sourceUrl: null,
      collection: {
        method: "git",
        collectedAt,
        collectorId: cfg.feedId,
      },
      facets: [],
      raw: { reason: "no_defiscan_review_mapped_or_found" },
    };
  }

  const primary =
    reviews.find((r) => r.role === "primary") ?? reviews[0];
  const expected = mapping?.reviews.length ?? reviews.length;
  const missingSecondary =
    (mapping?.reviews.filter((r) => r.role === "secondary").length ?? 0) >
    reviews.filter((r) => r.role === "secondary").length;

  let status: CoverageStatus = "c";
  const partialNotes: string[] = [];
  if (mapping?.forcePartial) {
    status = "p";
    if (mapping.partialReason) partialNotes.push(mapping.partialReason);
  }
  if (mapping?.partialIfMissingSecondary && missingSecondary) {
    status = "p";
    partialNotes.push("Secondary DeFiScan review missing");
  }
  if (reviews.length < expected && expected > 1) {
    status = "p";
    partialNotes.push(`Found ${reviews.length}/${expected} mapped reviews`);
  }

  const asOf = primary.updateDate ?? primary.publishDate;
  const label = primary.stage == null ? "reviewed" : `Stage ${primary.stage}`;
  let verbatim = buildVerbatim(primary, cfg.riskDimensionKeys);
  if (partialNotes.length) {
    verbatim = `${verbatim} [Partial: ${partialNotes.join("; ")}]`;
  }

  const extras: Facet[] = [];
  if (reviews.length > 1) {
    extras.push({
      key: "review_count",
      label: "Reviews matched",
      value: String(reviews.length),
      valueType: "count",
    });
  }

  return {
    status,
    label,
    verbatim,
    asOf,
    sourceUrl: primary.sourceUrl,
    collection: {
      method: "git",
      collectedAt,
      collectorId: cfg.feedId,
    },
    facets: buildFacets(primary, cfg.riskDimensionKeys, extras),
    raw: {
      reviews: reviews.map((r) => ({
        slug: r.slug,
        chain: r.chain,
        role: r.role,
        stage: r.stage,
        risks: r.risks,
        reasons: r.reasons,
        publishDate: r.publishDate,
        updateDate: r.updateDate,
        path: r.path,
        sourceUrl: r.sourceUrl,
        scoreLines: r.scoreLines,
      })),
    },
  };
};

const githubRawUrl = (
  cfg: DefiscanFeedConfig["source"],
  relPath: string,
): string =>
  `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.ref}/${relPath}`;

const fetchText = async (url: string): Promise<string | null> => {
  const res = await fetch(url, {
    headers: { "User-Agent": "openrisk-defiscan-collector" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
};

const mergeFeedAssessment = (
  protocolId: string,
  feedId: string,
  cell: CoverageCell,
): void => {
  const rel = `data/coverage/${protocolId}.json`;
  let file: CoverageFile;
  try {
    file = readJson<CoverageFile>(rel);
  } catch {
    file = { protocolId, updatedAt: cell.collection?.collectedAt ?? new Date().toISOString(), assessments: {} };
  }
  file.assessments[feedId] = cell;
  file.updatedAt = cell.collection?.collectedAt ?? new Date().toISOString();
  writeJson(rel, file);
};

export const collectDefiscan = async (): Promise<void> => {
  const cfg = readJson<DefiscanFeedConfig>("collectors/config/feeds/defiscan.json");
  const collectedAt = new Date().toISOString();
  const byProtocol: Record<string, CoverageCell> = {};
  const rawBundle: Record<string, unknown> = {};

  console.log(`[defiscan] source ${cfg.source.owner}/${cfg.source.repo}@${cfg.source.ref}`);

  for (const protocolId of listProtocolIds()) {
    const mapping = cfg.protocols[protocolId];
    const parsed: ParsedReview[] = [];

    if (mapping) {
      for (const review of mapping.reviews) {
        const path = `${cfg.source.protocolsPath}/${review.slug}/${review.chain}.md`;
        const url = githubRawUrl(cfg.source, path);
        const md = await fetchText(url);
        if (!md) {
          console.warn(`[defiscan] ${protocolId}: missing ${path}`);
          continue;
        }
        const sourceUrl = `${cfg.source.siteBase}/${review.slug}/${review.chain}`;
        parsed.push(
          parseReviewMarkdown(md, {
            slug: review.slug,
            chain: review.chain,
            role: review.role,
            path,
            sourceUrl,
          }),
        );
        console.log(
          `[defiscan] ${protocolId}: ${review.slug}/${review.chain} → stage ${parsed.at(-1)?.stage}`,
        );
      }
    } else {
      console.log(`[defiscan] ${protocolId}: no mapping → gap`);
    }

    const cell = toAssessment(cfg, mapping, parsed, collectedAt);
    byProtocol[protocolId] = cell;
    rawBundle[protocolId] = cell.raw;
    mergeFeedAssessment(protocolId, cfg.feedId, cell);
  }

  writeJson("data/live/feeds/defiscan.json", {
    version: 1,
    feedId: cfg.feedId,
    collectedAt,
    source: cfg.source,
    protocols: byProtocol,
  });

  const covered = Object.values(byProtocol).filter((c) => c.status !== "n").length;
  console.log(`[defiscan] wrote data/live/feeds/defiscan.json (${covered} covered/partial)`);
};
