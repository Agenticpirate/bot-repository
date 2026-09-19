"use client";

import { Menu, Star, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useSavedIds } from "@/lib/useSaved";

const LINKS = [
  { href: "/setup", label: "Setup", active: "setup" },
  { href: "/kit", label: "Kit", active: "kit" },
  { href: "/explore", label: "Archive", active: "explore" },
  { href: "/motion", label: "Motion", active: "motion" },
] as const;

export function SiteHeader({
  active,
}: {
  active?: "home" | "setup" | "kit" | "explore" | "item" | "motion";
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState(pathname);
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setOpen(false);
  }
  const panelId = useId();
  const savedIds = useSavedIds();
  const savedCount = savedIds.length;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2.5 rounded-sm">
          <span className="font-display text-[17px] font-semibold tracking-tight text-paper">
            Compound
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-mute sm:inline">
            Memory OS
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              current={active === link.active}
            />
          ))}
          <NavLink
            href="/explore?saved=1"
            label={savedCount ? `Saved (${savedCount})` : "Saved"}
            current={false}
            icon={<Star size={11} strokeWidth={1.75} aria-hidden="true" />}
          />
          {active !== "setup" ? (
            <Link
              href="/setup"
              className="cmp-cta ml-1 rounded-full bg-brass px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-ink hover:bg-brass/90"
            >
              Start setup
            </Link>
          ) : null}
        </nav>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-line md:hidden"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? (
            <X size={18} strokeWidth={1.75} aria-hidden="true" className="text-paper" />
          ) : (
            <Menu size={18} strokeWidth={1.75} aria-hidden="true" className="text-paper" />
          )}
        </button>
      </div>

      {open ? (
        <div
          id={panelId}
          className="border-t border-line bg-panel md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <nav className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active === link.active ? "page" : undefined}
                className={`rounded-xl px-3 py-2.5 text-sm ${
                  active === link.active
                    ? "bg-ink text-paper"
                    : "text-mute hover:bg-ink/60 hover:text-paper"
                }`}
              >
                {link.label === "Kit" ? "Starter pack" : link.label === "Motion" ? "Motion language" : link.label}
              </Link>
            ))}
            <Link
              href="/explore?saved=1"
              className="rounded-xl px-3 py-2.5 text-sm text-mute hover:bg-ink/60 hover:text-paper"
            >
              Saved in this browser{savedCount ? ` (${savedCount})` : ""}
            </Link>
            <Link
              href="/setup"
              className="cmp-cta mt-1 rounded-xl bg-brass px-3 py-2.5 text-center text-sm font-medium text-ink"
            >
              Start setup
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function NavLink({
  href,
  label,
  current,
  icon,
}: {
  href: string;
  label: string;
  current: boolean;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${
        current ? "bg-paper/10 text-paper" : "text-mute hover:text-paper"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
