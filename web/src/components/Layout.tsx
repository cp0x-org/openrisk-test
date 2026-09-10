import { Link, NavLink, Outlet } from "react-router-dom";
import { fmtUsd } from "../lib/data";
import type { Snapshot } from "../lib/types";
import { IconArrowLeft, IconShield } from "./Icons";

type Props = { snapshot: Snapshot };

export const Layout = ({ snapshot }: Props) => {
  const live = snapshot.liveUpdatedAt
    ? new Date(snapshot.liveUpdatedAt).toISOString().slice(0, 10)
    : "pending";
  const tvl = fmtUsd(snapshot.kpis.fundsAtRiskUsd);

  return (
    <div className="app-shell">
      <div className="status-bar">
        <div className="status-bar__left">
          <span>Open Data • AGPL-3.0</span>
          <span>Ethereum Mainnet</span>
          <span>Source: DefiLlama · {live}</span>
        </div>
        <div className="status-bar__right">
          <span className="status-bar__warn">No composite score</span>
          <span>Assessments shown verbatim</span>
        </div>
      </div>

      <header className="page-header">
        <div>
          <div className="page-header__brand">
            <div className="page-header__mark">
              <IconShield />
            </div>
            <h1 className="page-header__title">
              OPENRISK <span>/ MATRIX</span>
            </h1>
          </div>
          <p className="page-header__lede">
            Neutral DeFi risk intelligence. Aggregating independent assessments to highlight
            coverage gaps and protocol health across Ethereum.
          </p>
        </div>
        <div className="page-header__stats">
          <div>
            <div className="k">Total Protocols</div>
            <div className="v">{snapshot.kpis.protocolCount}</div>
          </div>
          <div>
            <div className="k">TVL Tracked</div>
            <div className="v">${tvl ?? "—"}</div>
          </div>
        </div>
      </header>

      <Outlet />

      <footer className="page-footer">
        <div className="page-footer__links">
          <NavLink to="/methodology">METHODOLOGY</NavLink>
          <a href={`${import.meta.env.BASE_URL}data/snapshot.json`} target="_blank" rel="noreferrer">
            API ACCESS
          </a>
          <a href="https://github.com/cp0x-org/openrisk-test" target="_blank" rel="noreferrer">
            GITHUB
          </a>
        </div>
        <div>© {new Date().getFullYear()} OPENRISK · public data layer</div>
      </footer>
    </div>
  );
};

export const SubNav = () => (
  <nav className="subnav">
    <Link to="/" className="back-link">
      <IconArrowLeft />
      Back to Matrix
    </Link>
    <Link to="/methodology" className="back-link">
      Methodology
    </Link>
  </nav>
);
