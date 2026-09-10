import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { loadSnapshot } from "./lib/data";
import type { Snapshot } from "./lib/types";
import { Layout } from "./components/Layout";
import { MatrixPage } from "./pages/MatrixPage";
import { ProtocolPage } from "./pages/ProtocolPage";
import { MethodologyPage } from "./pages/MethodologyPage";

export const App = () => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
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
  }, []);

  if (error) return <div className="error">Failed to load data: {error}</div>;
  if (!snapshot) return <div className="loading">Loading open data layer…</div>;

  return (
    <Routes>
      <Route element={<Layout snapshot={snapshot} />}>
        <Route index element={<MatrixPage snapshot={snapshot} />} />
        <Route path="protocol/:id" element={<ProtocolPage snapshot={snapshot} />} />
        <Route path="methodology" element={<MethodologyPage snapshot={snapshot} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
