import { cellOf } from "../lib/data";
import type { Snapshot } from "../lib/types";

type Props = { snapshot: Snapshot };

export const MethodologyPage = ({ snapshot }: Props) => {
  return (
    <div className="view active">
      <div className="meth-wrap">
        <div
          className="kicker"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.22em",
            color: "var(--accent)",
          }}
        >
          METHODOLOGY
        </div>
        <p className="oracle">
          "A well-designed oracle aggregates many feeds to produce one trusted value — and no
          individual source is treated as self-evident truth. The same principle applies to risk."
        </p>
        <p className="oracle-sub">
          — THE ORACLE ANALOGY, OPENRISK RFP, ETHEREUM FOUNDATION APP RELATIONS
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
              <li>Surfaces governance data from onchain and verifiable sources</li>
              <li>Tracks which feeds have — and have not — assessed a protocol</li>
              <li>Links every assessment to its source, shown verbatim, never restated</li>
              <li>Maintains an open, community-correctable data layer on GitHub</li>
            </ul>
          </div>
        </div>

        <div className="gapnote">
          <b>COVERAGE GAPS AS DATA · </b>A protocol that has not been assessed by any risk feed is
          itself a signal. OpenRisk renders these gaps visible rather than hiding them behind a
          composite number.
        </div>

        <h3 className="sec" style={{ marginTop: 40 }}>
          The feed registry — {snapshot.feeds.length} providers
        </h3>
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
              const n = snapshot.protocols.filter(
                (p) => cellOf(p, f.id).status !== "n",
              ).length;
              return (
                <tr key={f.id}>
                  <td className="rn">{f.name}</td>
                  <td>
                    <span className={`ft ${f.type}`} style={{ fontSize: 9 }}>
                      {f.type === "dash" ? "DASHBOARD" : f.type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: "var(--ink-2)" }}>{f.focus}</td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      color: "var(--ink)",
                    }}
                  >
                    {n}
                    <span style={{ color: "var(--ink-3)" }}>/{snapshot.protocols.length}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3 className="sec" style={{ marginTop: 40 }}>
          Data provenance
        </h3>
        <div className="provlegend">
          <div className="pl">
            <span className="prov onchain">onchain</span> read directly from mainnet state —
            verifiable by anyone via RPC or a verified indexer
          </div>
          <div className="pl">
            <span className="prov verified">verified</span> sourced from a third party with a
            published, checkable methodology
          </div>
          <div className="pl">
            <span className="prov docs">docs</span> from official protocol documentation — vetted by
            a human curator, may lag reality
          </div>
          <div className="pl">
            <span className="prov selfrep">self-reported</span> provided by the protocol team
            directly — displayed, never trusted silently
          </div>
        </div>

        <h3 className="sec" style={{ marginTop: 40 }}>
          How to contribute
        </h3>
        <p style={{ fontSize: 13.5, maxWidth: "64ch" }}>
          All OpenRisk data is open source. Corrections — open a GitHub issue or a direct PR against
          the JSON files in{" "}
          <code style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>
            data/coverage/
          </code>
          . New protocols — PR adding a JSON file to{" "}
          <code style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>
            data/protocols/
          </code>
          . New feeds — PR an entry to{" "}
          <code style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>
            data/feeds.json
          </code>{" "}
          with a public methodology link. Collectors refresh live metrics into{" "}
          <code style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>
            data/live/
          </code>{" "}
          on a schedule; the frontend reads{" "}
          <code style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>
            data/snapshot.json
          </code>
          .
        </p>
      </div>
    </div>
  );
};
