import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cellOf, coveredCount, coverageLabel, dateInfo, fmtUsd, guideOf, metricOf } from "../lib/data";
import { readHiddenSources, writeHiddenSources } from "../lib/prefs";
import type { CoverageCell, Feed, Protocol, Snapshot } from "../lib/types";
import { IconArrow, IconBook, IconSearch, IconSort } from "../components/Icons";
import { AssessmentDate, DataAgeHelp, Info, MultiSelect, ProtocolAvatar, SourceMark } from "../components/UI";

type Dir = "asc" | "desc";

const TVL_BANDS: Record<string, { label: string; min: number; max: number }> = {
  "1b": { label: "$1B and above", min: 1e9, max: Infinity },
  "100m": { label: "$100M – $1B", min: 1e8, max: 1e9 },
  "10m": { label: "$10M – $100M", min: 1e7, max: 1e8 },
  "sub10m": { label: "Under $10M", min: 0, max: 1e7 },
};
/** Comparable size for sorting and filtering — volume-metric protocols carry no TVL we can rank. */
const tvlOf = (p: Protocol) => p.volumeMetric ? null : p.ethereumTvlUsd;
const statusRank = (status: CoverageCell["status"]) => status === "c" ? 2 : status === "p" ? 1 : 0;
const defaultDir = (key: string): Dir => key === "name" ? "asc" : "desc";
/** Leading figure of a verdict — the stage in "Stage 2", the score in "4.8 · medium", the count in "93 Ethereum vaults". */
const figureIn = (label?: string | null) => { const match = label?.match(/-?\d+(?:\.\d+)?/); return match ? Number(match[0]) : null; };
/** Ascending order within one source column: no data, then the provider's own scale. Partial scope trails an equal verdict. */
const compareCells = (a: CoverageCell, b: CoverageCell) => {
  if ((a.status === "n") !== (b.status === "n")) return a.status === "n" ? -1 : 1;
  if (a.status === "n") return 0;
  const [figureA, figureB] = [figureIn(a.label), figureIn(b.label)];
  if (figureA != null && figureB != null && figureA !== figureB) return figureA - figureB;
  return (a.label ?? "").localeCompare(b.label ?? "", undefined, { numeric: true }) || statusRank(a.status) - statusRank(b.status);
};

const AssessmentLink = ({ protocol, feed, cell }: { protocol: Protocol; feed: Feed; cell: CoverageCell }) => <Link className={`matrix-assessment${cell.status === "n" ? " no-data" : ""}`} to={`/protocol/${protocol.id}#feed-${feed.id}`} aria-label={`${protocol.name}, ${feed.name}: ${cell.label ?? "no data"}. View assessment.`}>
  <span className="matrix-verdict">{cell.status === "n" ? <><span className="gap-dash">—</span> No data</> : cell.label ?? "View assessment"}{cell.status === "p" && <span className="partial-marker" aria-label="Partial scope">◐</span>}</span>
  {cell.status !== "n" && <AssessmentDate value={cell.asOf} compact/>}
</Link>;

export const MatrixPage = ({ snapshot }: { snapshot: Snapshot }) => {
  const [params, setParams] = useSearchParams();
  const [hidden, setHidden] = useState<string[]>(readHiddenSources);
  const q = params.get("q") ?? "";
  const cat = params.get("category") ?? "";
  const tvl = params.get("tvl") ?? "";
  const availability = params.get("coverage") ?? "";
  const pinned = params.get("source") ?? "";
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: true }); };

  const feedIds = useMemo(() => snapshot.feeds.map((f) => f.id), [snapshot]);
  // A ?source= deep link pins one column for the visit; otherwise the stored selection applies.
  const selectedIds = useMemo(() => feedIds.includes(pinned) ? [pinned] : feedIds.filter((id) => !hidden.includes(id)), [feedIds, hidden, pinned]);
  const visibleFeeds = snapshot.feeds.filter((f) => selectedIds.includes(f.id));
  const selectSources = (ids: string[]) => {
    const next = feedIds.filter((id) => !ids.includes(id));
    setHidden(next);
    writeHiddenSources(next);
    if (pinned) update("source", "");
  };

  const requested = params.get("sort") ?? "tvl";
  const sort = requested.startsWith("feed:") && !selectedIds.includes(requested.slice(5)) ? "tvl" : requested;
  const dir: Dir = params.get("dir") === "asc" ? "asc" : params.get("dir") === "desc" ? "desc" : defaultDir(sort);
  const setSort = (key: string, nextDir: Dir) => { const next = new URLSearchParams(params); next.set("sort", key); if (nextDir === defaultDir(key)) next.delete("dir"); else next.set("dir", nextDir); setParams(next, { replace: true }); };
  const rankOf = (p: Protocol, key: string): number | null => key === "tvl" ? tvlOf(p) : key === "coverage" ? coveredCount(p, selectedIds) : null;

  const filtered = useMemo(() => {
    const band = TVL_BANDS[tvl];
    return snapshot.protocols.filter((p) => {
      if (q.trim() && !`${p.name} ${p.families.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
      if (cat && p.category !== cat) return false;
      if (band) { const size = tvlOf(p); if (size == null || size < band.min || size >= band.max) return false; }
      // Coverage counts only the sources currently selected: an unselected source cannot leave a gap.
      if (availability && selectedIds.length) { const covered = coveredCount(p, selectedIds); if (availability === "full" ? covered < selectedIds.length : covered === selectedIds.length) return false; }
      return true;
    }).sort((a, b) => {
      if (sort.startsWith("feed:")) { const id = sort.slice(5); return (dir === "desc" ? -1 : 1) * compareCells(cellOf(a, id), cellOf(b, id)) || a.name.localeCompare(b.name); }
      if (sort === "name") return dir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      const [rankA, rankB] = [rankOf(a, sort), rankOf(b, sort)];
      if (rankA == null || rankB == null) return rankA == null && rankB == null ? a.name.localeCompare(b.name) : rankA == null ? 1 : -1;
      return (dir === "desc" ? rankB - rankA : rankA - rankB) || a.name.localeCompare(b.name);
    });
  }, [snapshot, q, cat, tvl, availability, sort, dir, selectedIds]);

  const active = q || cat || tvl || availability || pinned;
  const totalCovered = snapshot.protocols.filter((p) => coveredCount(p, feedIds) > 0).length;
  const categoryName = (id: string) => snapshot.categories.find((c) => c.id === id)?.name ?? id;
  const columns = [
    { key: "name", label: "Protocol", desc: "Z–A", asc: "A–Z" },
    { key: "tvl", label: "Ethereum TVL", desc: "high to low", asc: "low to high" },
    ...visibleFeeds.map((f) => ({ key: `feed:${f.id}`, label: guideOf(f).shortName, desc: "highest first", asc: "no data first" })),
    { key: "coverage", label: "Sources", desc: "most first", asc: "fewest first" },
  ];
  const sortable = (key: string, content: ReactNode, className?: string, buttonClass = "") => <th key={key} scope="col" className={className} aria-sort={sort === key ? (dir === "asc" ? "ascending" : "descending") : "none"}>
    <button type="button" className={`th-sort${buttonClass && ` ${buttonClass}`}${sort === key ? " sorted" : ""}`} onClick={() => setSort(key, sort === key ? (dir === "desc" ? "asc" : "desc") : defaultDir(key))}>{content}<IconSort dir={sort === key ? dir : null}/></button>
  </th>;
  return <>
    <section className="home-hero">
      <div className="hero-copy"><div className="eyebrow"><span className="tiny-square"/> OPEN DEFI RISK INTELLIGENCE</div><h1>Understand the risk.<br/><span>Start with the evidence.</span></h1><p>Independent DeFi assessments, side by side.<br className="desktop-break"/> See what each source says — and what’s still unknown.</p><Link className="text-link" to="/methodology"><IconBook/> A quick guide to reading risk <IconArrow/></Link></div>
      <div className="hero-summary"><div className="hero-summary-top"><span className="eyebrow">THE CURRENT PICTURE</span><span className="outline-badge">Ethereum</span></div><div className="hero-numbers"><div><strong>{snapshot.protocols.length}</strong><span>protocols tracked</span></div><div><strong>{snapshot.feeds.length}</strong><span>independent sources</span></div></div><div className="hero-summary-bottom"><span><strong>{totalCovered} of {snapshot.protocols.length}</strong> have an assessment</span><Info label="What coverage tells you">This counts protocols with at least one collected assessment, including partial coverage. More sources mean more information, not a safer protocol.</Info></div></div>
    </section>
    <section className="protocol-explorer" aria-labelledby="explorer-title">
      <div className="section-heading"><div><h2 id="explorer-title">Explore protocols <span className="count-badge">{snapshot.protocols.length}</span></h2><p>Choose a protocol or open an assessment to look closer.</p></div><span className="section-aside">Each source uses its own scale<Info label="Comparing independent assessments">Stages, scores and vault counts are different measures. Read them within each source’s methodology. OpenRisk does not combine them into a safety score.</Info></span></div>
      <div className="explorer-panel">
        <div className="explorer-toolbar">
          <label className="search-field"><IconSearch/><span className="sr-only">Search protocols</span><input type="search" placeholder="Search protocols…" value={q} onChange={(e) => update("q", e.target.value)}/><span className="search-hint">{snapshot.protocols.length}</span></label>
          <div className="toolbar-selects">
            <MultiSelect label="Risk sources" selected={selectedIds} onChange={selectSources} summary={(ids, options) => ids.length === options.length ? "All risk sources" : ids.length === 0 ? "No risk sources" : options.filter((o) => ids.includes(o.id)).map((o) => o.label).join(", ")} options={snapshot.feeds.map((f) => ({ id: f.id, label: guideOf(f).shortName, hint: guideOf(f).topic, mark: <SourceMark id={f.id}/>, href: `/sources#source-${f.id}` }))}/>
            <label><span className="sr-only">Filter by Ethereum TVL</span><select value={tvl} onChange={(e) => update("tvl", e.target.value)}><option value="">Any TVL</option>{Object.entries(TVL_BANDS).map(([id, band]) => <option key={id} value={id}>{band.label}</option>)}</select></label>
            <label><span className="sr-only">Filter by source coverage</span><select value={availability} disabled={selectedIds.length === 0} onChange={(e) => update("coverage", e.target.value)}><option value="">Any coverage</option><option value="full">All sources covered</option><option value="partial">Some sources missing</option></select></label>
            <label className="sort-select"><span className="sr-only">Sort protocols</span><select value={`${sort}|${dir}`} onChange={(e) => { const [key, value] = e.target.value.split("|"); setSort(key, value as Dir); }}>{columns.flatMap((c) => [<option key={`${c.key}|desc`} value={`${c.key}|desc`}>{c.label}: {c.desc}</option>, <option key={`${c.key}|asc`} value={`${c.key}|asc`}>{c.label}: {c.asc}</option>])}</select></label>
          </div>
        </div>
        <div className="category-bar" role="group" aria-label="Protocol categories"><button className={!cat ? "selected" : ""} aria-pressed={!cat} onClick={() => update("category", "")}>All protocols</button>{snapshot.categories.map((c) => <button key={c.id} className={cat === c.id ? "selected" : ""} aria-pressed={cat === c.id} onClick={() => update("category", c.id)}>{c.name}</button>)}</div>
        {filtered.length > 0 ? <>
          <div className="matrix-scroll" role="region" aria-label="Protocol assessment comparison" tabIndex={0}><table className="risk-matrix"><caption className="sr-only">Independent assessments for {filtered.length} protocols. Values use each provider’s own scale. Column headers sort the table. Amber dates are over 90 days old.</caption><thead><tr>
            {sortable("name", "Protocol")}
            {sortable("tvl", "Ethereum TVL", "metric-column")}
            {visibleFeeds.map((f) => sortable(`feed:${f.id}`, <><SourceMark id={f.id}/><span>{guideOf(f).shortName}<small>{guideOf(f).topic}</small></span></>, undefined, "source-head"))}
            {sortable("coverage", "Sources", "coverage-column")}
            <th scope="col"><span className="sr-only">Details</span></th>
          </tr></thead><tbody>{filtered.map((p) => {
            const metric = metricOf(p);
            return <tr key={p.id}><th scope="row"><Link className="protocol-cell" to={`/protocol/${p.id}`}><ProtocolAvatar id={p.id} name={p.name}/><span><strong>{p.name}</strong><small>{categoryName(p.category)}</small></span></Link></th><td className="metric-column"><strong className="metric-value">{p.tvlWithin ? "Within Morpho" : metric.value == null ? "—" : `$${fmtUsd(metric.value)}`}</strong><span className="cell-secondary">{p.volumeMetric ? "24h volume" : p.tvlWithin ? "Included in parent" : p.families.join(" · ")}</span></td>{visibleFeeds.map((f) => <td key={f.id}><AssessmentLink protocol={p} feed={f} cell={cellOf(p, f.id)}/></td>)}<td className="coverage-column">{selectedIds.length > 0 ? <span className="source-count">{coveredCount(p, selectedIds)}<span> / {selectedIds.length}</span></span> : <span className="muted">—</span>}</td><td className="row-action"><Link to={`/protocol/${p.id}`} aria-label={`View ${p.name} details`}><IconArrow/></Link></td></tr>;
          })}</tbody></table></div>
          <div className="mobile-protocol-list">{filtered.map((p) => <article className="mobile-protocol" key={p.id}><div className="mobile-protocol-heading"><Link to={`/protocol/${p.id}`} className="protocol-cell"><ProtocolAvatar name={p.name} id={p.id}/><span><strong>{p.name}</strong><small>{categoryName(p.category)}</small></span></Link><Link className="icon-button" to={`/protocol/${p.id}`} aria-label={`View ${p.name} details`}><IconArrow/></Link></div><div className="mobile-metric"><span>{metricOf(p).label}</span><strong>{p.tvlWithin ? "Within Morpho" : metricOf(p).value == null ? "—" : `$${fmtUsd(metricOf(p).value)}`}</strong></div><div className="mobile-assessments">{visibleFeeds.map((f) => <div key={f.id}><span>{guideOf(f).shortName}</span><AssessmentLink protocol={p} feed={f} cell={cellOf(p, f.id)}/></div>)}</div></article>)}</div>
        </> : <div className="empty-state"><IconSearch/><h3>No matching protocols</h3><p>Try another name, category, size or coverage.</p><button className="button primary" onClick={() => setParams({})}>Clear filters</button></div>}
        <div className="table-footer"><span aria-live="polite">{filtered.length} of {snapshot.protocols.length} protocols{active && <button className="text-button" onClick={() => setParams({})}>Clear filters</button>}</span><span className="table-legend"><span>◐ {coverageLabel("p")}</span><span>— No collected data</span><DataAgeHelp/></span></div>
      </div>
      <div className="below-table"><span>TVL snapshot: {dateInfo(snapshot.liveUpdatedAt).label} · DefiLlama<Info label="About the size metric">TVL uses the Ethereum value in our dataset. For volume-based protocols, available 24h volume is labelled separately and is not used in the TVL sort or filter. Neither measure is a safety rating.</Info></span><Link to="/sources" className="text-link">Meet the risk sources <IconArrow/></Link></div>
    </section>
    <section className="reading-strip"><div className="reading-strip-icon"><IconBook/></div><div><h2>A clearer view, without a single score.</h2><p>Different sources see different risks. Check the assessment, its scope and its date before drawing a conclusion.</p></div><Link to="/methodology" className="button secondary">How to read OpenRisk <IconArrow/></Link></section>
  </>;
};
