import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { loadSnapshot } from "./lib/data";
import type { Snapshot } from "./lib/types";
import { Layout } from "./components/Layout";
import { MatrixPage } from "./pages/MatrixPage";
import { ProtocolPage } from "./pages/ProtocolPage";
import { MethodologyPage } from "./pages/MethodologyPage";
import { SourcesPage } from "./pages/SourcesPage";
import { IconMark } from "./components/Icons";

export const App = () => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const protocol = snapshot?.protocols.find((p) => location.pathname === `/protocol/${p.id}`);
    const page = protocol ? `${protocol.name} risk assessments` : location.pathname === "/sources" ? "Risk sources" : location.pathname === "/methodology" ? "How to read risk" : "Independent DeFi risk assessments";
    document.title = `${page} · OpenRisk`;
  }, [location.pathname, snapshot]);

  useEffect(() => {
    let alive = true;
    setError(null);
    loadSnapshot()
      .then((data) => {
        if (alive) setSnapshot(data);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (error) return <main className="app-state"><IconMark/><h1>We couldn’t load the assessments.</h1><p>Please try again. No ratings are shown until the data is available.</p><button className="button primary" onClick={() => setAttempt((value) => value + 1)}>Try again</button><details><summary>Technical details</summary><p>{error}</p></details></main>;
  if (!snapshot) return <main className="app-state" role="status"><IconMark/><h1>Bringing the evidence together.</h1><p>Loading the latest collected snapshot…</p><div className="loading-track"/></main>;

  return (
    <Routes>
      <Route element={<Layout snapshot={snapshot} />}>
        <Route index element={<MatrixPage snapshot={snapshot} />} />
        <Route path="protocol/:id" element={<ProtocolPage snapshot={snapshot} />} />
        <Route path="methodology" element={<MethodologyPage snapshot={snapshot} />} />
        <Route path="sources" element={<SourcesPage snapshot={snapshot} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
