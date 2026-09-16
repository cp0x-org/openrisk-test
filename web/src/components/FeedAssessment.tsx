import { coverageLabel, dateInfo, findingsOf, guideOf, reviewsOf, vaultsOf } from "../lib/data";
import type { CoverageCell, Feed } from "../lib/types";
import { IconChevron } from "./Icons";
import { AssessmentDate, DataAgeHelp, ExternalLink, Info, SourceMark } from "./UI";

export const FeedAssessment = ({ feed, cell }: { feed: Feed; cell: CoverageCell }) => {
  const guide = guideOf(feed);
  const vaults = vaultsOf(cell);
  const reviews = reviewsOf(cell);
  const findings = findingsOf(cell);
  const available = cell.status !== "n";
  const dimensions = cell.facets?.filter((f) => !["stage", "overall_score", "risk_level", "assessment_unit"].includes(f.key)) ?? [];
  return <article className={`assessment-card${available ? "" : " is-missing"}`} id={`feed-${feed.id}`} tabIndex={-1}>
    <div className="assessment-card-top"><div className="source-identity"><SourceMark id={feed.id}/><div><h3>{feed.name}</h3><span className="small muted">{guide.topic}</span></div></div><span className={`coverage-badge status-${cell.status}`}>{coverageLabel(cell.status)}</span></div>
    {available ? <>
      <div className="assessment-readout"><span className="eyebrow">{guide.question}</span><div className="native-verdict">{cell.label ?? "Assessment available"}</div><div className="scope-line">{guide.scope}<Info label={`Understanding ${feed.name}`}>{guide.note}</Info></div></div>
      {vaults.length > 0 ? <div className="vault-preview"><span className="small muted">Examples from this collection</span>{vaults.slice(0, 2).map((v, i) => <div className="vault-preview-row" key={`${v.name}-${i}`}><span>{v.name}</span><strong>{v.tier ?? "Unrated"}<span className="mono">{v.score ?? "—"}</span></strong></div>)}</div> : dimensions.length > 0 ? <dl className="dimension-preview">{dimensions.slice(0, 3).map((facet) => <div key={facet.key}><dt>{facet.label}</dt><dd>{facet.value}{facet.valueType === "score" && facet.scale && <span className="muted small"> / {facet.scale.split("-").at(-1)}</span>}</dd></div>)}</dl> : <p className="small muted">Open the assessment for the provider’s published findings.</p>}
      <details className="assessment-details"><summary>Explore assessment<IconChevron/></summary><div className="assessment-expanded">
        {cell.status === "p" && <p className="inline-note">This source covers only part of the protocol’s versions, markets or vaults.</p>}
        {reviews.length > 0 && <div><h4>Reviewed deployments</h4><ul className="source-list">{reviews.map((r, i) => <li key={`${r.slug}-${i}`}><ExternalLink href={r.url}>{r.slug} · {r.chain ?? "network not specified"}</ExternalLink></li>)}</ul></div>}
        {vaults.length > 0 && <div><h4>Collected vault ratings <span className="muted">({vaults.length})</span></h4><p className="small muted">A sample of individual vaults. Each rating applies only to its named vault.</p><div className="vault-list">{vaults.map((v, i) => <div className="vault-item" key={`${v.name}-${i}`}><div><ExternalLink href={v.url}>{v.name}</ExternalLink><span className="small muted">{v.version ?? "Version unspecified"} · {dateInfo(v.date).label}</span></div><span className="vault-rating">{v.tier ?? "Unrated"}<strong className="mono">{v.score ?? "—"}</strong></span></div>)}</div></div>}
        {dimensions.length > 0 && <div><h4>Provider’s dimensions</h4><dl className="all-dimensions">{dimensions.map((facet) => <div key={facet.key}><dt>{facet.label}{facet.scale && <span className="small muted">Scale: {facet.scale}</span>}</dt><dd>{facet.value}</dd></div>)}</dl></div>}
        {findings.length > 0 && <div><h4>Provider-reported findings</h4><p className="small muted">Reported by {feed.name}; these may span multiple networks.</p><div className="findings">{findings.map((f, i) => <details key={`${f.title}-${i}`}><summary>{f.severity && <span className="finding-severity">{f.severity}</span>}<span>{f.title}</span><IconChevron/></summary><p>{f.description ?? "See the original assessment for details."}</p></details>)}</div></div>}
        {cell.verbatim && <details className="original-text"><summary>Original collected text<IconChevron/></summary><blockquote>{cell.verbatim}</blockquote></details>}
        <details className="original-text"><summary>Source & collection details<IconChevron/></summary><dl className="all-dimensions provenance-details"><div><dt>Assessment date</dt><dd>{dateInfo(cell.asOf).label}</dd></div><div><dt>Collected by OpenRisk</dt><dd>{dateInfo(cell.collection?.collectedAt).label}</dd></div><div><dt>Collection method</dt><dd>{cell.collection?.method ?? "Not specified"}</dd></div></dl><p className="small muted">Collection confirms when data was retrieved, not when the assessment was revalidated.</p><ExternalLink href={feed.methodologyUrl}>Provider methodology</ExternalLink></details>
      </div></details>
      <div className="assessment-card-footer"><span className="date-with-help"><AssessmentDate value={cell.asOf}/><DataAgeHelp/></span><ExternalLink href={cell.sourceUrl ?? feed.url}>{cell.sourceUrl ? "View source" : "Provider website"}</ExternalLink></div>
    </> : <div className="missing-content"><h4>No assessment in our data</h4><p>This is a coverage gap, not a judgment about the protocol’s safety.</p><details className="original-text"><summary>About this gap<IconChevron/></summary><p>{typeof cell.raw?.note === "string" ? cell.raw.note : "The current collection has no assessment for this protocol and source. The provider may have additional coverage that has not been mapped here."}</p></details><ExternalLink href={feed.url}>Check provider</ExternalLink></div>}
  </article>;
};
