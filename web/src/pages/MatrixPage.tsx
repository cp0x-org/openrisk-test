import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cellOf, coveredCount, coverageLabel, dateInfo, fmtUsd, guideOf, metricOf } from "../lib/data";
import type { CoverageCell, Feed, Protocol, Snapshot } from "../lib/types";
import { IconArrow, IconBook, IconSearch } from "../components/Icons";
import { AssessmentDate, DataAgeHelp, Info, ProtocolAvatar, SourceMark } from "../components/UI";

const AssessmentLink = ({ protocol, feed, cell }: { protocol: Protocol; feed: Feed; cell: CoverageCell }) => <Link className={`matrix-assessment${cell.status === "n" ? " no-data" : ""}`} to={`/protocol/${protocol.id}#feed-${feed.id}`} aria-label={`${protocol.name}, ${feed.name}: ${cell.label ?? "no data"}. View assessment.`}>
  <span className="matrix-verdict">{cell.status === "n" ? <><span className="gap-dash">—</span> No data</> : cell.label ?? "View assessment"}{cell.status === "p" && <span className="partial-marker" aria-label="Partial scope">◐</span>}</span>
  {cell.status !== "n" && <AssessmentDate value={cell.asOf} compact/>}
</Link>;

export const MatrixPage = ({ snapshot }: { snapshot: Snapshot }) => {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const cat = params.get("category") ?? "";
  const sort = params.get("sort") ?? "tvl";
  const availability = params.get("coverage") ?? "";
  const source = params.get("source") ?? "";
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: true }); };
  const feedIds = snapshot.feeds.map((f) => f.id);
  const visibleFeeds = snapshot.feeds.filter((f) => !source || f.id === source);
  const filtered = useMemo(() => snapshot.protocols.filter((p) => {
    if (q.trim() && !`${p.name} ${p.families.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    if (cat && p.category !== cat) return false;
    if (source && cellOf(p, source).status === "n") return false;
    const count = coveredCount(p, snapshot.feeds.map((f) => f.id));
    return availability === "available" ? count > 0 : availability === "missing" ? count === 0 : true;
  }).sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "coverage") return coveredCount(b, snapshot.feeds.map((f) => f.id)) - coveredCount(a, snapshot.feeds.map((f) => f.id)) || a.name.localeCompare(b.name);
    return (b.volumeMetric ? -1 : b.ethereumTvlUsd ?? -1) - (a.volumeMetric ? -1 : a.ethereumTvlUsd ?? -1) || a.name.localeCompare(b.name);
  }), [snapshot, q, cat, sort, availability, source]);
  const active = q || cat || availability || source;
  const totalCovered = snapshot.protocols.filter((p) => coveredCount(p, feedIds) > 0).length;
  const categoryName = (id: string) => snapshot.categories.find((c) => c.id === id)?.name ?? id;
  return <>
    <section className="home-hero">
      <div className="hero-copy"><div className="eyebrow"><span className="tiny-square"/> OPEN DEFI RISK INTELLIGENCE</div><h1>Understand the risk.<br/><span>Start with the evidence.</span></h1><p>Independent DeFi assessments, side by side.<br className="desktop-break"/> See what each source says — and what’s still unknown.</p><Link className="text-link" to="/methodology"><IconBook/> A quick guide to reading risk <IconArrow/></Link></div>
      <div className="hero-summary"><div className="hero-summary-top"><span className="eyebrow">THE CURRENT PICTURE</span><span className="outline-badge">Ethereum</span></div><div className="hero-numbers"><div><strong>{snapshot.protocols.length}</strong><span>protocols tracked</span></div><div><strong>{snapshot.feeds.length}</strong><span>independent sources</span></div></div><div className="hero-summary-bottom"><span><strong>{totalCovered} of {snapshot.protocols.length}</strong> have an assessment</span><Info label="What coverage tells you">This counts protocols with at least one collected assessment, including partial coverage. More sources mean more information, not a safer protocol.</Info></div></div>
    </section>
    <section className="protocol-explorer" aria-labelledby="explorer-title">
      <div className="section-heading"><div><h2 id="explorer-title">Explore protocols <span className="count-badge">{snapshot.protocols.length}</span></h2><p>Choose a protocol or open an assessment to look closer.</p></div><span className="section-aside">Each source uses its own scale<Info label="Comparing independent assessments">Stages, scores and vault counts are different measures. Read them within each source’s methodology. OpenRisk does not combine them into a safety score.</Info></span></div>
      <div className="explorer-panel">
        <div className="explorer-toolbar"><label className="search-field"><IconSearch/><span className="sr-only">Search protocols</span><input type="search" placeholder="Search protocols…" value={q} onChange={(e) => update("q", e.target.value)}/><span className="search-hint">{snapshot.protocols.length}</span></label><div className="toolbar-selects"><label><span className="sr-only">Filter by risk source</span><select value={source} onChange={(e) => update("source", e.target.value)}><option value="">All risk sources</option>{snapshot.feeds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label><span className="sr-only">Filter by assessment availability</span><select value={availability} onChange={(e) => update("coverage", e.target.value)}><option value="">All coverage</option><option value="available">Has assessments</option><option value="missing">No assessments</option></select></label><label><span className="sr-only">Sort protocols</span><select value={sort} onChange={(e) => update("sort", e.target.value)}><option value="tvl">Ethereum TVL ↓</option><option value="coverage">Source coverage ↓</option><option value="name">Name A–Z</option></select></label></div></div>
        <div className="category-bar" role="group" aria-label="Protocol categories"><button className={!cat ? "selected" : ""} aria-pressed={!cat} onClick={() => update("category", "")}>All protocols</button>{snapshot.categories.map((c) => <button key={c.id} className={cat === c.id ? "selected" : ""} aria-pressed={cat === c.id} onClick={() => update("category", c.id)}>{c.name}</button>)}</div>
        {filtered.length > 0 ? <>
          <div className="matrix-scroll" role="region" aria-label="Protocol assessment comparison" tabIndex={0}><table className="risk-matrix"><caption className="sr-only">Independent assessments for {filtered.length} protocols. Values use each provider’s own scale. Amber dates are over 90 days old.</caption><thead><tr><th scope="col">Protocol</th><th scope="col" className="metric-column">Ethereum TVL</th>{visibleFeeds.map((f) => <th scope="col" key={f.id}><Link to={`/sources#source-${f.id}`} className="matrix-source"><SourceMark id={f.id}/><span>{guideOf(f).shortName}<small>{guideOf(f).topic}</small></span></Link></th>)}<th scope="col" className="coverage-column">Sources</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>{filtered.map((p) => {
            const metric = metricOf(p);
            return <tr key={p.id}><th scope="row"><Link className="protocol-cell" to={`/protocol/${p.id}`}><ProtocolAvatar id={p.id} name={p.name}/><span><strong>{p.name}</strong><small>{categoryName(p.category)}</small></span></Link></th><td className="metric-column"><strong className="metric-value">{p.tvlWithin ? "Within Morpho" : metric.value == null ? "—" : `$${fmtUsd(metric.value)}`}</strong><span className="cell-secondary">{p.volumeMetric ? "24h volume" : p.tvlWithin ? "Included in parent" : p.families.join(" · ")}</span></td>{visibleFeeds.map((f) => <td key={f.id}><AssessmentLink protocol={p} feed={f} cell={cellOf(p, f.id)}/></td>)}<td className="coverage-column"><span className="source-count">{coveredCount(p, feedIds)}<span> / {feedIds.length}</span></span></td><td className="row-action"><Link to={`/protocol/${p.id}`} aria-label={`View ${p.name} details`}><IconArrow/></Link></td></tr>;
          })}</tbody></table></div>
          <div className="mobile-protocol-list">{filtered.map((p) => <article className="mobile-protocol" key={p.id}><div className="mobile-protocol-heading"><Link to={`/protocol/${p.id}`} className="protocol-cell"><ProtocolAvatar name={p.name} id={p.id}/><span><strong>{p.name}</strong><small>{categoryName(p.category)}</small></span></Link><Link className="icon-button" to={`/protocol/${p.id}`} aria-label={`View ${p.name} details`}><IconArrow/></Link></div><div className="mobile-metric"><span>{metricOf(p).label}</span><strong>{p.tvlWithin ? "Within Morpho" : metricOf(p).value == null ? "—" : `$${fmtUsd(metricOf(p).value)}`}</strong></div><div className="mobile-assessments">{visibleFeeds.map((f) => <div key={f.id}><span>{guideOf(f).shortName}</span><AssessmentLink protocol={p} feed={f} cell={cellOf(p, f.id)}/></div>)}</div></article>)}</div>
        </> : <div className="empty-state"><IconSearch/><h3>No matching protocols</h3><p>Try another name, category or source.</p><button className="button primary" onClick={() => setParams({})}>Clear filters</button></div>}
        <div className="table-footer"><span aria-live="polite">{filtered.length} of {snapshot.protocols.length} protocols{active && <button className="text-button" onClick={() => setParams({})}>Clear filters</button>}</span><span className="table-legend"><span>◐ {coverageLabel("p")}</span><span>— No collected data</span><DataAgeHelp/></span></div>
      </div>
      <div className="below-table"><span>TVL snapshot: {dateInfo(snapshot.liveUpdatedAt).label} · DefiLlama<Info label="About the size metric">TVL uses the Ethereum value in our dataset. For volume-based protocols, available 24h volume is labelled separately and is not used in the TVL sort. Neither measure is a safety rating.</Info></span><Link to="/sources" className="text-link">Meet the risk sources <IconArrow/></Link></div>
    </section>
    <section className="reading-strip"><div className="reading-strip-icon"><IconBook/></div><div><h2>A clearer view, without a single score.</h2><p>Different sources see different risks. Check the assessment, its scope and its date before drawing a conclusion.</p></div><Link to="/methodology" className="button secondary">How to read OpenRisk <IconArrow/></Link></section>
  </>;
};
