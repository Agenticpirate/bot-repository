"use client";

import { useState } from "react";
import { CopyButton } from "./CopyButton";

export type KitFile = {
  file: string;
  title: string;
  text: string;
};

export function KitFiles({ files }: { files: KitFile[] }) {
  return (
    <div className="mt-8 flex flex-col gap-8">
      <nav
        aria-label="Starter files"
        className="rounded-2xl border border-line bg-panel/70 p-4"
      >
        <p className="font-mono text-[10px] uppercase tracking-wider text-mute">
          Jump to a file
        </p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {files.map((item, index) => (
            <li key={item.file}>
              <a
                href={`#${item.file.replace(/\.md$/, "")}`}
                className="flex items-baseline gap-2 text-sm text-paper hover:text-brass"
              >
                <span className="font-mono text-[11px] text-brass">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {item.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {files.map((item) => (
        <KitFileCard key={item.file} item={item} />
      ))}
    </div>
  );
}

function KitFileCard({ item }: { item: KitFile }) {
  const [open, setOpen] = useState(false);
  const lines = item.text.split("\n");
  const preview = lines.slice(0, 16).join("\n");
  const collapsed = !open && lines.length > 16;
  const anchor = item.file.replace(/\.md$/, "");

  return (
    <section id={anchor} className="scroll-mt-20">
      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-display text-xl text-paper">{item.title}</h2>
            <p className="font-mono text-[10px] text-mute">{item.file}</p>
          </div>
          <div className="flex items-center gap-2">
            {lines.length > 16 ? (
              <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-mute hover:text-paper"
                aria-expanded={open}
              >
                {open ? "Collapse" : "Expand"}
              </button>
            ) : null}
            <CopyButton text={item.text} label="Copy file" />
          </div>
        </div>
        <pre className="overflow-auto whitespace-pre-wrap p-4 font-mono text-[12px] leading-relaxed text-paper/90">
          {collapsed ? `${preview}\n…` : item.text}
        </pre>
      </div>
    </section>
  );
}
