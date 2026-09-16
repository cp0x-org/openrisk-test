import { Link } from "react-router-dom";
import type { Snapshot } from "../lib/types";
import { IconArrow, IconChevron } from "../components/Icons";
import { ExternalLink } from "../components/UI";

const questions = [
  ["Does OpenRisk tell me whether a protocol is safe?", "No. OpenRisk brings independent assessments together without producing its own score, recommendation or guarantee. A high rating from one provider does not remove smart-contract, governance, market or other risks."],
  ["Can I compare the numbers across sources?", "Only within the same provider and methodology. A DeFiScan stage, a RiskLayer score and a Philidor vault rating describe different things. They should not be averaged or treated as equivalent."],
  ["What do Available, Partial scope and No data mean?", "Available means an assessment is present in our collection; its scope still matters. Partial scope means the collection covers only part of a protocol’s versions, deployments or vaults. No data means we have no mapped assessment from that source. None of these labels is a safety judgment."],
  ["Why are some assessment dates amber?", "Amber highlights a provider-reported date more than 90 days old. It is a prompt to check for changes, not an expiry date. A recently downloaded assessment can still be old. Missing or placeholder dates are shown as unavailable."],
  ["Is everything Ethereum-specific?", "The protocol universe and TVL view focus on Ethereum. An individual source may assess multiple networks, selected versions or specific vaults. Check the scope and named deployments before applying an assessment to your position."],
  ["What do Philidor’s vault counts mean?", "They count listed Ethereum vaults in mapped families, not protocol-level ratings. The collection includes a limited sample of individual vault ratings, so the examples shown are neither exhaustive nor a recommendation. Open the named vault at the source to investigate."],
  ["Why are governance, audit or incident records empty?", "These supporting records have not yet been collected for every protocol. An empty audit history is not proof of no audits. An empty incident history is not proof of no incidents."],
  ["Is the data live?", "The interface reads a collected snapshot, not a real-time stream. The snapshot date, collection date and provider assessment date describe different events. Each assessment exposes its collection details and original source."],
];

export const MethodologyPage = ({ snapshot }: { snapshot: Snapshot }) => (
  <>
    <section className="page-intro">
      <span className="eyebrow">THE READING GUIDE</span>
      <h1>More context.<br/><span>Better questions.</span></h1>
      <p>OpenRisk is a starting point for research — not a verdict on safety.</p>
    </section>
    <div className="guide-steps">
      <article><span className="step-number">01</span><h2>Find your protocol</h2><p>Search the collection. TVL gives size context; the source count tells you how much information is available.</p><Link to="/" className="text-link">Explore {snapshot.protocols.length} protocols <IconArrow/></Link></article>
      <article><span className="step-number">02</span><h2>Compare the perspectives</h2><p>Read each assessment on its own scale. Check whether it applies to the protocol, a deployment or a specific vault.</p><Link to="/sources" className="text-link">Meet the {snapshot.feeds.length} sources <IconArrow/></Link></article>
      <article><span className="step-number">03</span><h2>Follow the evidence</h2><p>Check dates, open the detailed findings and follow the original source. Missing data is a question to investigate.</p><a href="#faq" className="text-link">Understand the labels <IconArrow/></a></article>
    </div>
    <section className="principles-strip"><div><span className="eyebrow">OUR ROLE</span><h2>Independent views.<br/>No blended safety score.</h2></div><p>We preserve provider labels, make collection gaps visible and link back to the evidence. We do not rank providers, endorse protocols or convert different methodologies into a single rating.</p></section>
    <section id="faq" className="faq-section" tabIndex={-1}><div className="section-heading"><div><h2>A few useful answers</h2><p>The details, when you need them.</p></div></div><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<IconChevron/></summary><p>{answer}</p></details>)}</div></section>
    <section id="contribute" className="contribute-panel" tabIndex={-1}><div><span className="eyebrow">OPEN DATA, SHARED RESPONSIBILITY</span><h2>Help fill the gaps.</h2><p>Report an outdated assessment, suggest a source or contribute a correction with supporting evidence.</p></div><ExternalLink className="button secondary" href="https://github.com/cp0x-org/openrisk-test">Contribute on GitHub</ExternalLink><details className="contribute-details"><summary>For data contributors<IconChevron/></summary><p>Protocol mappings and collected coverage live in <code>data/</code>; collector configuration lives in <code>collectors/config/</code>. The interface reads <code>data/snapshot.json</code>. Include the original source, scope and assessment date with corrections. Manually curated source files should retain the same provenance as API-collected data.</p></details></section>
  </>
);
