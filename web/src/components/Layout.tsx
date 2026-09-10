import { NavLink, Outlet } from "react-router-dom";
import type { Snapshot } from "../lib/types";

type Props = { snapshot: Snapshot };

export const Layout = ({ snapshot }: Props) => {
  const live = snapshot.liveUpdatedAt
    ? new Date(snapshot.liveUpdatedAt).toISOString().slice(0, 10)
    : "pending first collect";

  return (
    <>
      <div className="ribbon">
        OPEN DATA · AGPL-3.0 · Ethereum mainnet · TVL — DefiLlama · DeFiScan via collectors ·{" "}
        <b>no composite score · no mock assessments</b>
      </div>

      <header className="top">
        <div className="brand">
          <div className="word">
            <span className="o">OPEN</span>RISK
          </div>
          <div className="sub">NEUTRAL DEFI RISK INTELLIGENCE</div>
        </div>
        <nav className="tabs">
          <NavLink to="/" end>
            MATRIX
          </NavLink>
          <NavLink to="/methodology">METHODOLOGY</NavLink>
        </nav>
        <div className="meta">
          <span className="lic">AGPL-3.0 · open data layer</span>
          <span>v0.1 · ethereum mainnet only</span>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer>
        <div className="fl">
          <span>OPENRISK · public good · community-correctable data on GitHub</span>
          <span>AGPL-3.0</span>
        </div>
        <div className="fl">
          <span>TVL: DefiLlama · {live}</span>
          <span>snapshot {new Date(snapshot.generatedAt).toISOString().slice(0, 10)}</span>
        </div>
      </footer>
    </>
  );
};
