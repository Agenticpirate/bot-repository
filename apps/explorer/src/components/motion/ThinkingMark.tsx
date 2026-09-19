import type { ReactNode } from "react";
import { AVATAR_PX, type AvatarSize } from "@/lib/motion";

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg className="cmp-think-frame" viewBox="0 0 16 16" width="100%" height="100%" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Original Compound asterisk-family frames. Not an Anthropic mark. */
export function ThinkingMark({
  size = "xs",
  label,
  className = "",
}: {
  size?: AvatarSize;
  label?: string;
  className?: string;
}) {
  const px = Math.max(14, Math.round(AVATAR_PX[size] * 0.42));

  return (
    <span
      className={`cmp-think ${className}`}
      style={{ width: px, height: px }}
      role={label ? "status" : undefined}
      aria-live={label ? "polite" : undefined}
      aria-label={label}
    >
      <Frame>
        <path
          d="M8 1.8 9.1 6.9 14.2 8 9.1 9.1 8 14.2 6.9 9.1 1.8 8 6.9 6.9 Z"
          fill="currentColor"
        />
      </Frame>
      <Frame>
        <path
          d="M8 2.1 V13.9 M2.1 8 H13.9 M4.1 4.1 L11.9 11.9 M11.9 4.1 L4.1 11.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
      </Frame>
      <Frame>
        <path
          d="M8 1.7 V14.3 M2.2 8 H13.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
        />
      </Frame>
      <Frame>
        <path
          d="M8 2.2 L9.05 6.4 13.4 6.55 10 9.15 11.15 13.4 8 11.1 4.85 13.4 6 9.15 2.6 6.55 6.95 6.4 Z"
          fill="currentColor"
        />
      </Frame>
      <Frame>
        <path
          d="M8 1.9 L8.7 6.2 12.8 4.4 9.4 8 12.8 11.6 8.7 9.8 8 14.1 7.3 9.8 3.2 11.6 6.6 8 3.2 4.4 7.3 6.2 Z"
          fill="currentColor"
        />
      </Frame>
      <Frame>
        <circle cx="8" cy="8" r="1.15" fill="currentColor" />
        <path
          d="M8 2.4 V5.1 M8 10.9 V13.6 M2.4 8 H5.1 M10.9 8 H13.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </Frame>
    </span>
  );
}

/** Optional working pulse — a 2×3 dot lattice, not a copied braille font. */
export function WorkingPulse({ className = "" }: { className?: string }) {
  return (
    <span className={`cmp-braille ${className}`} aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <span
          key={index}
          className="cmp-braille-dot"
          style={{ animationDelay: `${index * 90}ms` }}
        />
      ))}
    </span>
  );
}
