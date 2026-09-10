import { cellOf } from "../lib/data";
import type { Snapshot } from "../lib/types";
import { SubNav } from "../components/Layout";

type Props = { snapshot: Snapshot };

export const MethodologyPage = ({ snapshot }: Props) => (
  <>
    <SubNav />
    <div className="meth">
      <div className="kicker">METHODOLOGY</div>
      <p className="oracle">
        "A well-designed oracle aggregates many feeds to produce one trusted value — and no
        individual source is treated as self-evident truth. The same principle applies to risk."
      </p>
      <p className="oracle-sub">
        — THE ORACLE ANALOGY · OPENRISK · ETHEREUM FOUNDATION APP RELATIONS RFP
      </p>

      <div className="dodont">
        <div className="dpanel not">
          <h4>WHAT OPENRISK DOES NOT DO</h4>
          <ul>
            <li>Assign its own risk scores or composite assessments</li>
            <li>Weigh feeds against each other or rank providers</li>
            <li>Tell you whether a protocol is safe or unsafe</li>
            <li>Endorse any protocol or feed listed</li>
          </ul>
        </div>
        <div className="dpanel does">
          <h4>WHAT OPENRISK DOES</h4>
          <ul>
            <li>Aggregates risk feed coverage for DeFi protocols in one place</li>
            <li>Shows live TVL from DefiLlama via open collectors</li>
            <li>Tracks which feeds have — and have not — assessed a protocol</li>
            <li>Links every assessment to its source, shown verbatim</li>
            <li>Keeps the data layer community-correctable on GitHub</li>
          </ul>
        </div>
      </div>

      <div className="aside-label" style={{ marginTop: 40 }}>
        Active feed registry
      </div>
      <table className="reg">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Type</th>
            <th>Focus</th>
            <th style={{ textAlign: "right" }}>Coverage</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.feeds.map((f) => {
            const n = snapshot.protocols.filter((p) => cellOf(p, f.id).status !== "n").length;
            return (
              <tr key={f.id}>
                <td className="rn">{f.name}</td>
                <td>
                  <span className="badge type">{f.type}</span>
                </td>
                <td>{f.focus}</td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    color: "#fff",
                  }}
                >
                  {n}
                  <span style={{ color: "#4b5563" }}>/{snapshot.protocols.length}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="aside-label" style={{ marginTop: 40 }}>
        How to contribute
      </div>
      <p style={{ fontSize: 14, maxWidth: "64ch", color: "#9ca3af", lineHeight: 1.6 }}>
        Corrections and new mappings land as pull requests against{" "}
        <code style={{ fontFamily: "var(--mono)", color: "var(--accent-green)" }}>data/</code> and{" "}
        <code style={{ fontFamily: "var(--mono)", color: "var(--accent-green)" }}>
          collectors/config/
        </code>
        . Collectors refresh live metrics on a schedule; the UI reads{" "}
        <code style={{ fontFamily: "var(--mono)", color: "var(--accent-green)" }}>
          data/snapshot.json
        </code>
        .
      </p>
    </div>
  </>
);
