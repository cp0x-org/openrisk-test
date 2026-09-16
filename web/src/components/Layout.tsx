import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { dateInfo } from "../lib/data";
import type { Snapshot } from "../lib/types";
import { IconEthereum, IconMark, IconTheme } from "./Icons";
import { ExternalLink } from "./UI";

export const Layout = ({ snapshot }: { snapshot: Snapshot }) => {
  const location = useLocation();
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("openrisk-theme") !== "light"; } catch { return true; } });
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try { localStorage.setItem("openrisk-theme", dark ? "dark" : "light"); } catch { /* Storage may be disabled. */ }
  }, [dark]);
  useEffect(() => {
    let target: HTMLElement | null = null;
    try { target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; } catch { /* Ignore malformed fragments. */ }
    if (target) { target.scrollIntoView({ block: "start" }); target.focus({ preventScroll: true }); }
    else window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="site-header"><div className="site-header-inner">
      <Link to="/" className="brand" aria-label="OpenRisk home"><IconMark/><span>OpenRisk<span className="brand-dot">.</span></span></Link>
      <nav className="primary-nav" aria-label="Main navigation"><NavLink to="/" end>Protocols</NavLink><NavLink to="/sources">Risk sources</NavLink><NavLink to="/methodology">How to read</NavLink></nav>
      <div className="header-tools"><span className="network-label"><IconEthereum/>Ethereum</span><button type="button" className="icon-button" onClick={() => setDark(!dark)} aria-label={`Switch to ${dark ? "light" : "dark"} theme`}><IconTheme dark={dark}/></button></div>
    </div></header>
    <main id="main-content" className="page-container" tabIndex={-1}><Outlet/></main>
    <footer className="site-footer"><div className="footer-main"><Link to="/" className="brand small"><IconMark/><span>OpenRisk.</span></Link><span>Independent perspectives. Open evidence.</span></div><div className="footer-links"><Link to="/methodology">Methodology & FAQ</Link><a href={`${import.meta.env.BASE_URL}data/snapshot.json`} target="_blank" rel="noreferrer">Open data</a><ExternalLink href="https://github.com/cp0x-org/openrisk-test">GitHub</ExternalLink></div><div className="footer-note">Snapshot assembled {dateInfo(snapshot.generatedAt).label}. Individual assessment dates vary.</div></footer>
  </div>;
};
