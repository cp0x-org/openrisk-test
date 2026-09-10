import { Link, useParams } from "react-router-dom";
import { cellOf, coveredCount, fmtUsd } from "../lib/data";
import type { Snapshot } from "../lib/types";

type Props = { snapshot: Snapshot };

export const ProtocolPage = ({ snapshot }: Props) => {
  const { id } = useParams();
  const protocol = snapshot.protocols.find((p) => p.id === id);
  const category = snapshot.categories.find((c) => c.id === protocol?.category);

  if (!protocol) {
    return (
      <div className="error">
        Protocol not found. <Link to="/">Back to matrix</Link>
      </div>
    );
  }

  const feedIds = snapshot.feeds.map((f) => f.id);
  const covered = coveredCount(protocol, feedIds);
  const partial = snapshot.feeds.filter((f) => cellOf(protocol, f.id).status === "p").length;
  const full = snapshot.feeds.filter((f) => cellOf(protocol, f.id).status === "c").length;
  const tvl = fmtUsd(protocol.tvlUsd);

  return (
    <div className="view active">
      <div className="detail-head">
        <div>
          <Link className="back" to="/">
            ← BACK TO MATRIX
          </Link>
          <h2>{protocol.name}</h2>
          <div className="fams">
            {protocol.families.map((f) => (
              <span key={f} className="fam-tag">
                {f}
              </span>
            ))}
            {category && (
              <span className="fam-tag" style={{ borderColor: "transparent", color: category.color }}>
                ■ {category.name}
              </span>
            )}
          </div>
        </div>
        <div className="dh-right">
          <div className="dh-stat">
            <div className="v">
              {tvl == null ? "—" : `$${tvl}`}
              <small>{protocol.volumeMetric ? " 24h vol" : " TVL"}</small>
            </div>
            <div className="k">
              {protocol.tvlWithin ? "within Morpho · DefiLlama" : "DefiLlama · live"}
            </div>
          </div>
          <div className="dh-stat">
            <div className="v">
              {covered}
              <small>/{snapshot.feeds.length}</small>
            </div>
            <div className="k">feeds covering</div>
          </div>
          <div className="dh-stat">
            <div className="v">{partial}</div>
            <div className="k">of them partial</div>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="dcol-l">
          <h3 className="sec">Governance</h3>
          {protocol.governance.map((g) => (
            <div key={g.key} className="gov-row">
              <span className="gk">{g.key}</span>
              <span className="gv">
                {g.value}
                <span className={`prov ${g.provenance}`}>
                  {g.provenance === "selfrep" ? "self-reported" : g.provenance}
                </span>
              </span>
            </div>
          ))}

          <h3 className="sec">Audit history</h3>
          <ul className="hist">
            {protocol.audits.length === 0 ? (
              <li className="none-note">None recorded in registry.</li>
            ) : (
              protocol.audits.map((a) => (
                <li key={`${a.year}-${a.summary}`}>
                  <span className="yr">{a.year}</span>
                  <span className="what">{a.summary}</span>
                  <span className={`prov ${a.provenance}`}>
                    {a.provenance === "selfrep" ? "self-reported" : a.provenance}
                  </span>
                </li>
              ))
            )}
          </ul>

          <h3 className="sec">Incident history</h3>
          <ul className="hist">
            {protocol.incidents.length === 0 ? (
              <li className="none-note">
                No major incidents recorded. Absence of incidents ≠ absence of risk.
              </li>
            ) : (
              protocol.incidents.map((i) => (
                <li key={`${i.year}-${i.summary}`}>
                  <span className="yr">{i.year}</span>
                  <span className="what">{i.summary}</span>
                  <span className={`sev ${i.severity}`}>
                    {i.severity === "crit" ? "CRITICAL" : i.severity === "ser" ? "SERIOUS" : "RESOLVED"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="dcol-r">
          <h3 className="sec">
            Feed assessments — verbatim, unweighted ({full} covered · {partial} partial)
          </h3>
          <div className="feedcards">
            {snapshot.feeds.map((f) => {
              const c = cellOf(protocol, f.id);
              const cls = c.status === "c" ? "" : c.status === "p" ? "is-p" : "is-n";
              return (
                <div key={f.id} className={`fcard ${cls}`}>
                  <div className="fh">
                    <b>{f.name}</b>
                    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className={`ft ${f.type}`} style={{ fontSize: 8.5 }}>
                        {f.type.toUpperCase()}
                      </span>
                      {c.status === "c" ? (
                        <span className="badge st-c">COVERED</span>
                      ) : c.status === "p" ? (
                        <span className="badge st-p">PARTIAL</span>
                      ) : (
                        <span className="badge st-n">NOT YET</span>
                      )}
                    </span>
                  </div>
                  <div className="meth">{f.focus}</div>
                  {c.facets && c.facets.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--ink-3)",
                      }}
                    >
                      {c.facets.map((facet) => (
                        <span
                          key={facet.key}
                          style={{
                            border: "1px solid var(--grid)",
                            borderRadius: 4,
                            padding: "2px 6px",
                          }}
                          title={facet.scale ? `${facet.label} · scale ${facet.scale}` : facet.label}
                        >
                          {facet.label}: <b style={{ color: "var(--ink-2)" }}>{facet.value}</b>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="verdict">
                    {c.verbatim
                      ? `“${c.verbatim}”`
                      : "No assessment published for this protocol."}
                  </div>
                  <div className="ff">
                    <span>
                      {c.asOf
                        ? c.asOf === "live"
                          ? "● live data"
                          : `as of ${c.asOf}`
                        : "registry gap"}
                    </span>
                    <a href={c.sourceUrl ?? f.url} target="_blank" rel="noreferrer">
                      source ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
