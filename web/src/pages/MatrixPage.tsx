import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { asOfLabel, cellOf, coveredCount, fmtUsd } from "../lib/data";
import type { CoverageCell, Feed, Protocol, Snapshot } from "../lib/types";

type Props = { snapshot: Snapshot };

type PopState = {
  protocol: Protocol;
  feed: Feed;
  cell: CoverageCell;
  x: number;
  y: number;
} | null;

export const MatrixPage = ({ snapshot }: Props) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [gapsOnly, setGapsOnly] = useState(false);
  const [sortTvl, setSortTvl] = useState(true);
  const [pop, setPop] = useState<PopState>(null);

  const catMap = useMemo(
    () => Object.fromEntries(snapshot.categories.map((c) => [c.id, c])),
    [snapshot.categories],
  );
  const feedIds = useMemo(() => snapshot.feeds.map((f) => f.id), [snapshot.feeds]);
  const maxTvl = Math.max(...snapshot.protocols.map((p) => p.tvlUsd ?? 0), 1);

  const list = useMemo(() => {
    let rows = snapshot.protocols.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat && p.category !== cat) return false;
      if (gapsOnly && coveredCount(p, feedIds) >= 7) return false;
      return true;
    });
    rows = [...rows].sort((a, b) =>
      sortTvl
        ? (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0)
        : coveredCount(b, feedIds) - coveredCount(a, feedIds),
    );
    return rows;
  }, [snapshot.protocols, q, cat, gapsOnly, sortTvl, feedIds]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".pop") && !t.closest(".cc")) setPop(null);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const { kpis } = snapshot;
  const funds = fmtUsd(kpis.fundsAtRiskUsd);

  return (
    <div className="view active">
      <div className="hero">
        <div className="kicker">WHAT EVERY RISK FEED SAYS · SIDE BY SIDE · VERBATIM</div>
        <h1>
          No single feed should be canonical. <em>The aggregation is the value.</em>
        </h1>
        <p className="lede">
          Twenty Ethereum protocols where user capital is directly at risk, held against fourteen
          independent risk feeds. No composite score, no editorial synthesis — coverage, verbatim
          assessments, and <s>gaps shown as data</s>.
        </p>
        <div className="kpis">
          <div className="kpi">
            <div className="v">{kpis.protocolCount}</div>
            <div className="k">protocols</div>
          </div>
          <div className="kpi">
            <div className="v">{kpis.feedCount}</div>
            <div className="k">risk feeds</div>
          </div>
          <div className="kpi">
            <div className="v">{kpis.cellsAssessed}</div>
            <div className="k">cells assessed</div>
          </div>
          <div className="kpi">
            <div className="v">
              {kpis.coveragePct}
              <small>%</small>
            </div>
            <div className="k">matrix coverage</div>
            <div className="bar">
              <i style={{ width: `${kpis.coveragePct}%` }} />
            </div>
          </div>
          <div className="kpi">
            <div className="v">${funds ?? "—"}</div>
            <div className="k">funds at risk tracked</div>
          </div>
        </div>
      </div>

      <div className="controls">
        <input
          type="search"
          placeholder="filter protocols…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span>
          {snapshot.categories.map((c) => (
            <button
              key={c.id}
              className={`chip catchip${cat === c.id ? " on" : ""}`}
              onClick={() => setCat(cat === c.id ? null : c.id)}
            >
              <span className="dot" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </span>
        <div className="right">
          <label className="tog">
            <input
              type="checkbox"
              checked={gapsOnly}
              onChange={(e) => setGapsOnly(e.target.checked)}
            />{" "}
            gaps only
          </label>
          <button className="chip" onClick={() => setSortTvl(!sortTvl)}>
            {sortTvl ? "sort: TVL ↓" : "sort: coverage ↓"}
          </button>
        </div>
      </div>

      <div className="legend">
        <span className="li">
          <span className="cc c" style={{ cursor: "default" }}>
            Stage 1
          </span>{" "}
          covered — verbatim assessment
        </span>
        <span className="li">
          <span className="cc p" style={{ cursor: "default" }}>
            ◐
          </span>{" "}
          partial coverage
        </span>
        <span className="li">
          <span className="cc n" style={{ cursor: "default" }}>
            —
          </span>{" "}
          not yet covered · a signal in itself
        </span>
        <span className="li" style={{ marginLeft: "auto" }}>
          feed types:{" "}
          <span className="ft rating" style={{ fontSize: 9, padding: "2px 5px" }}>
            R
          </span>{" "}
          rating{" "}
          <span className="ft dash" style={{ fontSize: 9, padding: "2px 5px" }}>
            D
          </span>{" "}
          dashboard{" "}
          <span className="ft monitor" style={{ fontSize: 9, padding: "2px 5px" }}>
            M
          </span>{" "}
          monitoring{" "}
          <span className="ft research" style={{ fontSize: 9, padding: "2px 5px" }}>
            Ξ
          </span>{" "}
          research
        </span>
      </div>

      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="protocol-h">
                PROTOCOL <span style={{ opacity: 0.5 }}>· {list.length}/20</span>
              </th>
              <th className="tvl-h">TVL / VOL·24H</th>
              {snapshot.feeds.map((f) => (
                <th key={f.id} className="feedcol">
                  <span className="feedhead" title={f.focus}>
                    <span className={`ft ${f.type}`}>{f.typeLabel}</span>
                    {f.name}
                  </span>
                </th>
              ))}
              <th className="tvl-h" style={{ minWidth: 76 }}>
                COVER
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const category = catMap[p.category];
              const tvlLabel = fmtUsd(p.tvlUsd);
              return (
                <tr
                  key={p.id}
                  className="proto-row"
                  onClick={() => navigate(`/protocol/${p.id}`)}
                >
                  <td className="protocol-c">
                    <div className="nm">
                      <b>{p.name}</b>
                      <span className="fam">{p.families.join(" · ")}</span>
                    </div>
                    <div className="cat">
                      <span className="dot" style={{ background: category?.color }} />
                      {category?.name}
                      {p.tvlWithin ? " · TVL within Morpho" : ""}
                    </div>
                  </td>
                  <td className={`tvl-c${p.volumeMetric ? " voltag" : ""}`}>
                    {tvlLabel == null ? (
                      <>
                        <span style={{ color: "var(--ink-3)" }}>—</span>
                        <span className="u">{p.volumeMetric ? "vol n/a" : ""}</span>
                      </>
                    ) : (
                      <>
                        ${tvlLabel}
                        <span className="u">{p.volumeMetric ? " vol" : ""}</span>
                      </>
                    )}
                    {!p.volumeMetric && p.tvlUsd != null && (
                      <div className="tvlbar">
                        <i
                          style={{
                            width: `${Math.max(2, Math.round((p.tvlUsd / maxTvl) * 100))}%`,
                          }}
                        />
                      </div>
                    )}
                  </td>
                  {snapshot.feeds.map((f) => {
                    const c = cellOf(p, f.id);
                    const lbl =
                      c.status === "c"
                        ? c.label ?? "✓"
                        : c.status === "p"
                          ? c.label && c.label !== "◐"
                            ? c.label
                            : "◐"
                          : "—";
                    return (
                      <td key={f.id} className="cell">
                        <span
                          className={`cc ${c.status}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const r = (e.target as HTMLElement).getBoundingClientRect();
                            setPop({
                              protocol: p,
                              feed: f,
                              cell: c,
                              x: Math.min(window.innerWidth - 350, Math.max(10, r.left - 140)),
                              y: r.bottom + window.scrollY + 10,
                            });
                          }}
                        >
                          {lbl}
                        </span>
                      </td>
                    );
                  })}
                  <td className="tvl-c" style={{ fontSize: 11, color: "var(--ink-2)" }}>
                    {coveredCount(p, feedIds)}
                    <span className="u">/{snapshot.feeds.length}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pop && (
        <div className="pop show" style={{ left: pop.x, top: pop.y }}>
          <div className="ph">
            <b>
              {pop.feed.name} → {pop.protocol.name}
            </b>
            {pop.cell.status === "c" ? (
              <span className="badge st-c">COVERED</span>
            ) : pop.cell.status === "p" ? (
              <span className="badge st-p">PARTIAL</span>
            ) : (
              <span className="badge st-n">NOT YET COVERED</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{pop.feed.focus}</div>
          {pop.cell.verbatim ? (
            <div className="quote">“{pop.cell.verbatim}”</div>
          ) : (
            <div className="quote" style={{ borderLeftColor: "var(--baseline)", color: "var(--ink-3)" }}>
              No assessment published. The gap is shown, not hidden.
            </div>
          )}
          <div className="src">
            <span>{asOfLabel(pop.cell.asOf)}</span>
            <a href={pop.cell.sourceUrl ?? pop.feed.url} target="_blank" rel="noreferrer">
              view at source ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
