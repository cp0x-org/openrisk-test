import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { dateInfo, safeUrl } from "../lib/data";
import { IconClock, IconExternal, IconInfo } from "./Icons";

export const ExternalLink = ({ href, children, className = "text-link" }: { href?: string | null; children: ReactNode; className?: string }) => {
  const url = safeUrl(href);
  return url ? <a className={className} href={url} target="_blank" rel="noreferrer">{children}<IconExternal/></a> : <span className="muted">{children}</span>;
};
export const Info = ({ label, children }: { label: string; children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); ref.current?.querySelector("button")?.focus(); } };
    const reposition = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const popoverHeight = ref.current?.querySelector(".info-popover")?.getBoundingClientRect().height ?? 180;
      const width = Math.min(310, window.innerWidth - 32);
      setPosition({ left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)), top: rect.bottom + popoverHeight + 16 > window.innerHeight ? Math.max(16, rect.top - popoverHeight - 8) : rect.bottom + 8 });
    };
    reposition();
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    window.addEventListener("resize", reposition); window.addEventListener("scroll", reposition, true);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); window.removeEventListener("resize", reposition); window.removeEventListener("scroll", reposition, true); };
  }, [open]);
  return <span className="info" ref={ref} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button className="info-button" type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><IconInfo/></button>
    {open && <span className="info-popover" id={id} role="note" style={position}><strong>{label}</strong>{children}</span>}
  </span>;
};
export const ProtocolAvatar = ({ name, id, large = false }: { name: string; id: string; large?: boolean }) => {
  const color = [...id].reduce((n, char) => n + char.charCodeAt(0), 0) % 5;
  return <span className={`protocol-avatar avatar-${color}${large ? " large" : ""}`} aria-hidden="true">{name.replace(/\s+(Finance|Protocol)$/i, "").split(/\s+/).map((s) => s[0]).join("").slice(0, 2)}</span>;
};
export const SourceMark = ({ id }: { id: string }) => <span className={`source-mark source-${id}`} aria-hidden="true">{id.slice(0, 1).toUpperCase()}</span>;
export const AssessmentDate = ({ value, compact = false }: { value?: string | null; compact?: boolean }) => {
  const date = dateInfo(value);
  return <span className={`assessment-date${date.older ? " older" : ""}`}><IconClock/>{date.label}{!compact && date.older && <span className="date-age">· {date.age}d old</span>}</span>;
};
export const DataAgeHelp = () => <Info label="About assessment dates">Dates belong to the provider’s assessment, not our latest download. Amber means the reported date is over 90 days old; it does not mean the assessment is invalid. Some reviews only change after a protocol update.</Info>;
