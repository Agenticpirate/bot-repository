import type { CSSProperties } from "react";
import { identityFrom, type Accessory, type EyeShape } from "@/lib/avatar";
import { AVATAR_PX, type AgentState, type AvatarSize, type MotionDialect } from "@/lib/motion";

function eyeRx(shape: EyeShape): number {
  if (shape === "wide") return 3.55;
  if (shape === "oval") return 2.65;
  return 3.05;
}

function eyeRy(shape: EyeShape): number {
  if (shape === "wide") return 2.55;
  if (shape === "oval") return 3.55;
  return 3.05;
}

function AccessoryMark({ kind, accent }: { kind: Accessory; accent: string }) {
  switch (kind) {
    case "sprout":
      return (
        <g className="acc" stroke={accent} fill="none" strokeWidth="1.2" strokeLinecap="round">
          <path d="M16 5.2 C16 3.2 17.6 2.2 18.8 2.6 C17.4 3.6 16.6 4.6 16 5.4" />
          <path d="M16 5.2 C16 3.4 14.2 2.4 13 2.8 C14.4 3.8 15.4 4.7 16 5.4" />
        </g>
      );
    case "antenna":
      return (
        <g className="acc" stroke={accent} fill={accent} strokeWidth="1.15" strokeLinecap="round">
          <path d="M16 5.6 V2.4" fill="none" />
          <circle cx="16" cy="2.1" r="1.05" stroke="none" />
        </g>
      );
    case "crescent":
      return (
        <path
          className="acc"
          d="M20.8 6.2 A3.1 3.1 0 1 1 16.6 4.4 A2.35 2.35 0 1 0 20.8 6.2 Z"
          fill={accent}
          stroke="none"
        />
      );
    case "spark":
      return (
        <path
          className="acc"
          d="M24.2 8.2 L25.1 10.4 L27.4 11.2 L25.1 12 L24.2 14.2 L23.3 12 L21 11.2 L23.3 10.4 Z"
          fill={accent}
          stroke="none"
        />
      );
    case "ring":
      return (
        <circle
          className="acc"
          cx="22.6"
          cy="7.2"
          r="2.05"
          fill="none"
          stroke={accent}
          strokeWidth="1.2"
        />
      );
    case "bar":
      return (
        <path
          className="acc"
          d="M12.2 5.1 H19.8"
          fill="none"
          stroke={accent}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
      );
    case "notch":
      return (
        <path
          className="acc"
          d="M26.6 13.4 C28.2 14.6 28.4 17.2 26.8 18.8"
          fill="none"
          stroke={accent}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      );
    case "dots":
      return (
        <g className="acc" fill={accent} stroke="none">
          <circle cx="12.2" cy="5.4" r="0.95" />
          <circle cx="19.8" cy="5.4" r="0.95" />
        </g>
      );
  }
}

export function BotGlyph({
  name,
  id,
  state = "idle",
  dialect = "pebble",
  size = "sm",
  className = "",
}: {
  name: string;
  id?: string;
  state?: AgentState;
  dialect?: MotionDialect;
  size?: AvatarSize;
  className?: string;
}) {
  const identity = identityFrom(name, id);
  const px = AVATAR_PX[size];
  const rx = eyeRx(identity.eye);
  const ry = eyeRy(identity.eye);
  const fill = dialect === "outline" ? "transparent" : identity.tone;

  return (
    <svg
      className={`cmp-glyph ${className}`}
      width={px}
      height={px}
      viewBox="0 0 32 32"
      data-state={state}
      data-dialect={dialect}
      data-eye={identity.eye}
      style={{ "--pebble": identity.tone, "--pebble-accent": identity.accent } as CSSProperties}
      aria-hidden="true"
    >
      <g className="cmp-body">
        <path
          className="pebble-fill"
          d="M15.4 4.1 C21.8 3.4 27.7 8.6 28 15.3 C28.2 21.8 23.6 27.6 16.3 28.3 C9.1 28.9 4.1 23.8 4.3 16.3 C4.5 9.4 9.1 4.8 15.4 4.1 Z"
          fill={fill}
        />
        <ellipse
          className="pebble-shine"
          cx="12.2"
          cy="11.2"
          rx="6.2"
          ry="3.4"
          fill="rgba(238,232,220,0.09)"
        />
        <AccessoryMark kind={identity.accessory} accent={identity.accent} />
        <g className="face-live">
          <g className="cmp-eyes">
            <ellipse className="eye-white" cx="12.1" cy="15.2" rx={rx} ry={ry} fill="#eee8dc" />
            <ellipse className="eye-white" cx="19.9" cy="15.2" rx={rx} ry={ry} fill="#eee8dc" />
          </g>
          <g className="cmp-pupils">
            <circle className="pupil" cx="12.45" cy="15.55" r="1.28" fill="#090b10" />
            <circle className="pupil" cx="20.25" cy="15.55" r="1.28" fill="#090b10" />
          </g>
        </g>
        <g className="face-blocked">
          <ellipse className="eye-white" cx="12.1" cy="15.2" rx={rx} ry={ry * 0.55} fill="#eee8dc" />
          <ellipse className="eye-white" cx="19.9" cy="15.2" rx={rx} ry={ry * 0.55} fill="#eee8dc" />
          <path
            className="blocked-dash"
            d="M10.6 15.2 H13.6 M18.4 15.2 H21.4"
            stroke="#090b10"
            strokeWidth="1.15"
            strokeLinecap="round"
            fill="none"
          />
        </g>
        <g className="face-done">
          <path
            className="mouth-done"
            d="M10.4 14.6 C11.4 16.6 13.1 17.2 14.2 16.2"
            fill="none"
            stroke="#eee8dc"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <path
            className="mouth-done"
            d="M17.8 16.2 C18.9 17.2 20.6 16.6 21.6 14.6"
            fill="none"
            stroke="#eee8dc"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
