import Link from "next/link";

const LINKS = [
  { href: "/setup", label: "Setup" },
  { href: "/kit", label: "Starter pack" },
  { href: "/explore", label: "Archive" },
] as const;

export function SiteHeader({ active }: { active?: "home" | "setup" | "kit" | "explore" }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2.5">
          <span className="font-display text-[17px] font-semibold tracking-tight text-paper">
            Compound
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-mute sm:inline">
            Memory OS
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((link) => {
            const isActive =
              (link.href === "/setup" && active === "setup") ||
              (link.href === "/kit" && active === "kit") ||
              (link.href === "/explore" && active === "explore");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${
                  isActive ? "bg-paper/10 text-paper" : "text-mute hover:text-paper"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/setup"
            className="ml-1 rounded-full bg-brass px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-ink hover:bg-brass/90"
          >
            Start setup
          </Link>
        </nav>
      </div>
    </header>
  );
}
