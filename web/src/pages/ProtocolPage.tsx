import { Link, useParams } from "react-router-dom";
import { asOfLabel, cellOf, coveredCount, fmtUsd } from "../lib/data";
import type { Snapshot } from "../lib/types";
import { SubNav } from "../components/Layout";

type Props = { snapshot: Snapshot };

export const ProtocolPage = ({ snapshot }: Props) => {
  const { id } = useParams();
  const protocol = snapshot.protocols.find((p) => p.id === id);
  const category = snapshot.categories.find((c) => c.id === protocol?.category);

  if (!protocol) {
    return (
      <>
        <SubNav />
        <div className="error">
          Protocol not found. <Link to="/">Back to matrix</Link>
        </div>
      </>
    );
  }

  const feedIds = snapshot.feeds.map((f) => f.id);
  const covered = coveredCount(protocol, feedIds);
  const partial = snapshot.feeds.filter((f) => cellOf(protocol, f.id).status === "p").length;
  const shown = snapshot.feeds.filter((f) => cellOf(protocol, f.id).status !== "n").length;
  const tvl = fmtUsd(protocol.tvlUsd);
  const initials = protocol.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <SubNav />
      <div className="detail-layout">
        <aside className="detail-aside">
          <div className="aside-label">Governance</div>
          {protocol.governance.length === 0 ? (
            <p className="empty-note">No governance records in the open data layer yet.</p>
          ) : (
            protocol.governance.map((g) => (
              <div key={g.key} className="sidebar-item">
                <div className="k">{g.key}</div>
                <p className="v">
                  {g.value}
                  <span className={`prov-tag ${g.provenance}`}>
                    {g.provenance === "selfrep" ? "self-reported" : g.provenance}
                  </span>
                </p>
              </div>
            ))
          )}

          <div className="aside-label" style={{ marginTop: 32 }}>
            Audit History
          </div>
          {protocol.audits.length === 0 ? (
            <p className="empty-note">None recorded yet.</p>
          ) : (
            protocol.audits.map((a) => (
              <div key={`${a.year}-${a.summary}`} className="hist-row">
                <span className="yr">{a.year}</span>
                <span className="what">{a.summary}</span>
                <span className={`prov-tag ${a.provenance}`}>
                  {a.provenance === "selfrep" ? "self-reported" : a.provenance}
                </span>
              </div>
            ))
          )}

          <div className="aside-label" style={{ marginTop: 32 }}>
            Incident History
          </div>
          {protocol.incidents.length === 0 ? (
            <p className="empty-note">No major incidents recorded.</p>
          ) : (
            protocol.incidents.map((i) => (
              <div key={`${i.year}-${i.summary}`} className="hist-row">
                <span className="yr">{i.year}</span>
                <span className="what">{i.summary}</span>
                <span className="prov-tag">
                  {i.severity === "crit" ? "CRITICAL" : i.severity === "ser" ? "SERIOUS" : "RESOLVED"}
                </span>
              </div>
            ))
          )}
        </aside>

        <section className="detail-main">
          <div className="detail-identity">
            <div className="detail-identity__left">
              <div className="detail-avatar">{initials}</div>
              <div>
                <h2>{protocol.name}</h2>
                <div className="detail-tags">
                  {protocol.families.map((f) => (
                    <span key={f} className="tag">
                      {f}
                    </span>
                  ))}
                  {category && <span className="tag cat">▪ {category.name}</span>}
                </div>
              </div>
            </div>
            <div className="detail-stats">
              <div>
                <div className="k">Protocol TVL</div>
                <div className="v">{tvl == null ? "—" : `$${tvl}`}</div>
                <div className="sub">
                  {protocol.tvlWithin ? "Within Morpho · DefiLlama" : "DefiLlama · Live"}
                </div>
              </div>
              <div>
                <div className="k">Feeds Covering</div>
                <div className="v">
                  {covered}
                  <small>/{snapshot.feeds.length}</small>
                </div>
                <div className={`sub${partial ? " warn" : ""}`}>
                  {partial ? `${partial} Partial` : "No partial cells"}
                </div>
              </div>
            </div>
          </div>

          <div className="section-head">
            <span>Feed Assessments — Verbatim, Unweighted</span>
            <span>
              Showing {shown} covered/partial · {snapshot.feeds.length - shown} missing
            </span>
          </div>

          <div className="feed-grid">
            {snapshot.feeds.map((f) => {
              const c = cellOf(protocol, f.id);
              const cls = c.status === "c" ? "" : c.status === "p" ? "is-p" : "is-n";
              return (
                <div key={f.id} className={`feed-card ${cls}`}>
                  <div className="feed-card__top">
                    <h3>{f.name}</h3>
                    <div className="feed-card__badges">
                      <span className="badge type">{f.type}</span>
                      <span className={`badge ${c.status}`}>
                        {c.status === "c" ? "Covered" : c.status === "p" ? "Partial" : "Missing"}
                      </span>
                    </div>
                  </div>
                  <p className="feed-card__focus">{f.focus}</p>
                  {c.facets && c.facets.length > 0 && (
                    <div className="feed-card__facets">
                      {c.facets.map((facet) => (
                        <span key={facet.key} className="tag">
                          {facet.key === "stage" ? `Stage ${facet.value}` : `${facet.label}: ${facet.value}`}
                        </span>
                      ))}
                    </div>
                  )}
                  <blockquote className="feed-card__quote">
                    {c.verbatim
                      ? `“${c.verbatim}”`
                      : "No assessment published for this protocol."}
                  </blockquote>
                  <div className="feed-card__foot">
                    <span>{asOfLabel(c.asOf)}</span>
                    <a href={c.sourceUrl ?? f.url} target="_blank" rel="noreferrer">
                      source ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
};
