import { Link } from "react-router-dom";
import { cellOf, guideOf } from "../lib/data";
import type { Snapshot } from "../lib/types";
import { IconArrow, IconChevron } from "../components/Icons";
import { ExternalLink, SourceMark } from "../components/UI";

export const SourcesPage = ({ snapshot }: { snapshot: Snapshot }) => (
  <>
    <section className="page-intro"><span className="eyebrow">THE SOURCE DIRECTORY</span><h1>Different lenses.<br/><span>A wider view of risk.</span></h1><p>Understand who is behind each assessment, what they measure and where their coverage stops.</p></section>
    <div className="directory-grid">{snapshot.feeds.map((feed) => {
      const guide = guideOf(feed);
      const count = snapshot.protocols.filter((p) => cellOf(p, feed.id).status !== "n").length;
      return <article className="directory-card" key={feed.id} id={`source-${feed.id}`} tabIndex={-1}>
        <div className="directory-heading"><SourceMark id={feed.id}/><span className="outline-badge">{feed.typeLabel}</span></div>
        <h2>{feed.name}</h2><span className="source-topic">{guide.topic}</span><p>{guide.question}</p>
        <dl className="directory-meta"><div><dt>Assessment scope</dt><dd>{guide.scope}</dd></div><div><dt>Collected coverage</dt><dd>{count} of {snapshot.protocols.length} protocols</dd></div></dl>
        <details className="directory-details"><summary>How to interpret this source<IconChevron/></summary><p>{guide.note}</p><p className="small muted">Coverage includes partial assessments. It describes our collection, not the provider’s entire catalogue.</p><ExternalLink href={feed.methodologyUrl}>Read the methodology</ExternalLink></details>
        <div className="directory-actions"><Link className="text-link" to={`/?source=${encodeURIComponent(feed.id)}`}>Explore coverage <IconArrow/></Link><ExternalLink href={feed.url}>Website</ExternalLink></div>
      </article>;
    })}</div>
    <section className="reading-strip"><div><h2>Independent does not mean interchangeable.</h2><p>The same protocol can receive different assessments because sources ask different questions. We show those differences, without averaging them away.</p></div><Link to="/methodology" className="button secondary">Reading guide <IconArrow/></Link></section>
    <div className="page-end-note"><span>Have a source we should include?</span><Link to="/methodology#contribute" className="text-link">Suggest a source <IconArrow/></Link></div>
  </>
);
