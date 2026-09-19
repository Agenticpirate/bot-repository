"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({
  text,
  getText,
  label = "Copy",
  copiedLabel = "Copied",
  tone = "primary",
  className = "",
}: {
  text?: string;
  getText?: () => string;
  label?: string;
  copiedLabel?: string;
  tone?: "primary" | "ghost";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(getText ? getText() : (text ?? ""));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`cmp-cta inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-medium ${
        tone === "ghost"
          ? "border border-line text-paper hover:border-brass/40"
          : "bg-brass text-ink hover:bg-brass/90"
      } ${className}`}
    >
      {copied ? (
        <Check size={12} strokeWidth={2} aria-hidden="true" />
      ) : (
        <Copy size={12} strokeWidth={1.75} aria-hidden="true" />
      )}
      {copied ? copiedLabel : label}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
