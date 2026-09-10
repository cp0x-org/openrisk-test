import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cellOf, coveredCount, fmtUsd } from "../lib/data";
import type { Snapshot } from "../lib/types";
import { IconChevron, IconSearch } from "../components/Icons";

type Props = { snapshot: Snapshot };

export const MatrixPage = ({ snapshot }: Props) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [sortTvl, setSortTvl] = useState(true);

  const catMap = useMemo(
    () => Object.fromEntries(snapshot.categories.map((c) => [c.id, c])),
    [snapshot.categories],
  );
  const feedIds = useMemo(() => snapshot.feeds.map((f) => f.id), [snapshot.feeds]);

  const list = useMemo(() => {
    let rows = snapshot.protocols.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat && p.category !== cat) return false;
      return true;
    });
    rows = [...rows].sort((a, b) =>
      sortTvl
        ? (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0)
        : coveredCount(b, feedIds) - coveredCount(a, feedIds),
    );
    return rows;
  }, [snapshot.protocols, q, cat, sortTvl, feedIds]);

  return (
    <>
      <div className="controls">
        <div className="controls__left">
          <div className="search">
            <IconSearch />
            <input
              type="search"
              placeholder="Filter protocols..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={`chip${cat === null ? " on" : ""}`}
            onClick={() => setCat(null)}
          >
            All
          </button>
          {snapshot.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip${cat === c.id ? " on" : ""}`}
              onClick={() => setCat(cat === c.id ? null : c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="controls__right">
          <span className="legend-dot">
            <i className="c" /> Covered
          </span>
          <span className="legend-dot">
            <i className="p" /> Partial
          </span>
          <span className="legend-dot">
            <i className="n" /> Missing
          </span>
          <span className="controls__divider" />
          <button type="button" className="sort-btn" onClick={() => setSortTvl(!sortTvl)}>
            Sort: {sortTvl ? "TVL" : "Coverage"} <IconChevron />
          </button>
        </div>
      </div>

      <main className="main-pad">
        <div className="scroll-x">
          <table className="matrix">
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Category</th>
                <th>TVL</th>
                {snapshot.feeds.map((f) => (
                  <th key={f.id} className="center">
                    {f.name}
                  </th>
                ))}
                <th>Coverage</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const covered = coveredCount(p, feedIds);
                const ratio = snapshot.feeds.length
                  ? covered / snapshot.feeds.length
                  : 0;
                const initials = p.name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <tr key={p.id} onClick={() => navigate(`/protocol/${p.id}`)}>
                    <td>
                      <div className="proto-cell">
                        <div className="proto-avatar">{initials}</div>
                        <div>
                          <div className="proto-name">{p.name}</div>
                          <div className="proto-fams">{p.families.join(" / ")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="cat-cell">{catMap[p.category]?.name ?? p.category}</td>
                    <td className="tvl-cell">
                      {p.tvlUsd == null ? "—" : `$${fmtUsd(p.tvlUsd)}`}
                      {p.volumeMetric ? " · vol" : ""}
                    </td>
                    {snapshot.feeds.map((f) => {
                      const s = cellOf(p, f.id).status;
                      return (
                        <td key={f.id} className="center">
                          <span className={`status-dot ${s}`} title={f.name} />
                        </td>
                      );
                    })}
                    <td>
                      <div className="cover-cell">
                        <span className={`hi${ratio < 0.5 ? " warn" : ""}`}>{covered}</span>
                        <span className="lo">/{snapshot.feeds.length}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
};
