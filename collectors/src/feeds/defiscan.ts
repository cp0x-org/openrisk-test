import { listProtocolIds } from "../paths.ts";
import type { CoverageStatus, Facet } from "../paths.ts";
import type { FeedAssessment, FeedModule, FeedRunResult } from "./types.ts";

/**
 * Community feed module — export `feed` (or default).
 * Must not write files; only return JSON from `run()`.
 */

type ReviewMapping = {
  reviews: Array<{ slug: string; chain: string; role: "primary" | "secondary" }>;
  forcePartial?: boolean;
  partialReason?: string;
  partialIfMissingSecondary?: boolean;
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

const SOURCE = {
  owner: "deficollective",
  repo: "defiscan",
  ref: "main",
  protocolsPath: "src/content/protocols",
  siteBase: "https://www.defiscan.info/protocols",
} as const;

const RISK_DIMS = [
  { key: "chain", label: "Chain" },
  { key: "upgradeability", label: "Upgradeability" },
  { key: "autonomy", label: "Autonomy" },
  { key: "exit_window", label: "Exit Window" },
  { key: "accessibility", label: "Accessibility" },
] as const;

const PROTOCOL_MAP: Record<string, ReviewMapping> = {
  aave: { reviews: [{ slug: "aave", chain: "ethereum", role: "primary" }] },
  spark: { reviews: [{ slug: "spark", chain: "ethereum", role: "primary" }] },
  morpho: { reviews: [{ slug: "morpho", chain: "ethereum", role: "primary" }] },
  compound: {
    reviews: [
      { slug: "compound-v3", chain: "ethereum", role: "primary" },
      { slug: "compound-v2", chain: "ethereum", role: "secondary" },
    ],
  },
  liquity: { reviews: [{ slug: "liquity", chain: "ethereum", role: "primary" }] },
  uniswap: {
    reviews: [
      { slug: "uniswap-v3", chain: "ethereum", role: "primary" },
      { slug: "uniswap-v2", chain: "ethereum", role: "secondary" },
    ],
    forcePartial: true,
    partialReason:
      "DeFiScan covers Uniswap v2/v3; v4 / UniswapX not reviewed as one family entry",
  },
  curve: { reviews: [{ slug: "curve-finance", chain: "ethereum", role: "primary" }] },
  pendle: { reviews: [{ slug: "pendle", chain: "ethereum", role: "primary" }] },
  lido: { reviews: [{ slug: "lido-v2", chain: "ethereum", role: "primary" }] },
};

const RISK_LETTER: Record<string, string> = { L: "Low", M: "Medium", H: "High" };

const extractFrontmatter = (md: string): { fm: string; body: string } => {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { fm: "", body: md };
  return { fm: match[1], body: match[2] };
};

const parseScalar = (fm: string, key: string): string | null => {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, "");
};

const parseStringArray = (fm: string, key: string): string[] => {
  const m = fm.match(new RegExp(`${key}:\\s*(\\[[\\s\\S]*?\\])`, "m"));
  if (!m) return [];
  try {
    const parsed = JSON.parse(m[1].replace(/'/g, '"')) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [...m[1].matchAll(/"([^"]+)"|'([^']+)'/g)].map((x) => x[1] || x[2]);
  }
};

const extractSummary = (body: string): string | null => {
  const m = body.match(/#\s*Summary\s*\r?\n+([\s\S]*?)(?=\r?\n#\s|\r?\n##\s|$)/i);
  if (!m) return null;
  return (
    m[1]
      .replace(/>\s*/g, "")
      .replace(/\r?\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || null
  );
};

const extractScoreLines = (body: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/>\s*([A-Za-z ]+?)\s+score:\s*([A-Za-z]+)/g)) {
    out[m[1].trim().toLowerCase().replace(/\s+/g, "_")] = m[2].trim();
  }
  return out;
};

const parseReviewMarkdown = (
  md: string,
  meta: {
    slug: string;
    chain: string;
    role: "primary" | "secondary";
    path: string;
    sourceUrl: string;
  },
): ParsedReview => {
  const { fm, body } = extractFrontmatter(md);
  const stageRaw = parseScalar(fm, "stage");
  const stage = stageRaw != null && stageRaw !== "" ? Number(stageRaw) : null;
  let updateDate = parseScalar(fm, "update_date");
  if (updateDate === "1970-01-01") updateDate = null;

  return {
    ...meta,
    stage: Number.isFinite(stage) ? stage : null,
    risks: parseStringArray(fm, "risks"),
    reasons: parseStringArray(fm, "reasons"),
    publishDate: parseScalar(fm, "publish_date"),
    updateDate,
    summary: extractSummary(body),
    scoreLines: extractScoreLines(body),
  };
};

const buildVerbatim = (review: ParsedReview): string => {
  const stagePart = review.stage == null ? "Stage not stated" : `Stage ${review.stage}`;
  if (review.summary) return `${stagePart}. ${review.summary}`;
  const riskPart = RISK_DIMS.map((d, i) => {
    const letter = review.risks[i];
    const word = review.scoreLines[d.key] ?? (letter ? RISK_LETTER[letter] : null);
    return `${d.label} ${word ?? letter ?? "—"}`;
  }).join("; ");
  return `${stagePart} — ${riskPart}.`;
};

const buildFacets = (review: ParsedReview, extras: Facet[] = []): Facet[] => {
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
  RISK_DIMS.forEach((d, i) => {
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
  mapping: ReviewMapping | undefined,
  reviews: ParsedReview[],
): FeedAssessment => {
  if (reviews.length === 0) {
    return {
      status: "n",
      label: null,
      verbatim: null,
      asOf: null,
      sourceUrl: null,
      facets: [],
      raw: { reason: "no_defiscan_review_mapped_or_found" },
    };
  }

  const primary = reviews.find((r) => r.role === "primary") ?? reviews[0];
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

  let verbatim = buildVerbatim(primary);
  if (partialNotes.length) verbatim = `${verbatim} [Partial: ${partialNotes.join("; ")}]`;

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
    label: primary.stage == null ? "reviewed" : `Stage ${primary.stage}`,
    verbatim,
    asOf: primary.updateDate ?? primary.publishDate,
    sourceUrl: primary.sourceUrl,
    facets: buildFacets(primary, extras),
    raw: {
      reviews: reviews.map((r) => ({
        slug: r.slug,
        chain: r.chain,
        role: r.role,
        stage: r.stage,
        risks: r.risks,
        path: r.path,
        sourceUrl: r.sourceUrl,
      })),
    },
  };
};

const fetchText = async (url: string): Promise<string | null> => {
  const res = await fetch(url, {
    headers: { "User-Agent": "openrisk-defiscan-collector" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
};

const run = async (): Promise<FeedRunResult> => {
  const protocols: Record<string, FeedAssessment> = {};

  console.log(
    `[defiscan] source ${SOURCE.owner}/${SOURCE.repo}@${SOURCE.ref}`,
  );

  for (const protocolId of listProtocolIds()) {
    const mapping = PROTOCOL_MAP[protocolId];
    const parsed: ParsedReview[] = [];

    if (mapping) {
      for (const review of mapping.reviews) {
        const path = `${SOURCE.protocolsPath}/${review.slug}/${review.chain}.md`;
        const url = `https://raw.githubusercontent.com/${SOURCE.owner}/${SOURCE.repo}/${SOURCE.ref}/${path}`;
        const md = await fetchText(url);
        if (!md) {
          console.warn(`[defiscan] ${protocolId}: missing ${path}`);
          continue;
        }
        parsed.push(
          parseReviewMarkdown(md, {
            slug: review.slug,
            chain: review.chain,
            role: review.role,
            path,
            sourceUrl: `${SOURCE.siteBase}/${review.slug}/${review.chain}`,
          }),
        );
        console.log(
          `[defiscan] ${protocolId}: ${review.slug}/${review.chain} → stage ${parsed.at(-1)?.stage}`,
        );
      }
    } else {
      console.log(`[defiscan] ${protocolId}: no mapping → gap`);
    }

    protocols[protocolId] = toAssessment(mapping, parsed);
  }

  return { protocols };
};

export const feed: FeedModule = {
  id: "defiscan",
  name: "DeFiScan",
  description:
    "Decentralization maturity framework: who controls keys, upgrades, and admin powers",
  type: "rating",
  typeLabel: "R",
  url: "https://www.defiscan.info",
  methodologyUrl: "https://deficollective.org/blog/introducing-defiscan/",
  enabled: true,
  collectionMethod: "git",
  run,
};

export default feed;
