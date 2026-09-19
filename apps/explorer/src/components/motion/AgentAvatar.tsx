import type { IndexDoc } from "@/lib/types";
import {
  isBotLike,
  listingAction,
  STATE_COPY,
  type AgentState,
  type AvatarSize,
  type MotionDialect,
} from "@/lib/motion";
import { BotGlyph } from "./BotGlyph";
import { StatusPulse } from "./StatusPulse";
import { ThinkingMark } from "./ThinkingMark";
import { TypeGlyph } from "./TypeGlyph";

export function AgentAvatar({
  name,
  id,
  state = "idle",
  dialect = "pebble",
  size = "sm",
  action,
  showSnippet,
  className = "",
}: {
  name: string;
  id?: string;
  state?: AgentState;
  dialect?: MotionDialect;
  size?: AvatarSize;
  action?: string;
  showSnippet?: boolean;
  className?: string;
}) {
  const copy = STATE_COPY[dialect][state];
  const snippetOn =
    showSnippet ?? (dialect === "soft" || dialect === "mark");
  const hoverAction = dialect === "pebble" ? (action ?? copy.action) : undefined;
  const active = state === "working" || state === "thinking";
  const showMark =
    dialect === "mark" && (state === "thinking" || state === "working");

  return (
    <span
      className={`cmp-avatar ${className}`}
      data-dialect={dialect}
      data-state={state}
      data-active={active && dialect === "pebble" ? "true" : "false"}
      data-tone={state === "working" ? "violet" : "brass"}
      data-action={hoverAction}
      title={hoverAction}
      role="img"
      aria-label={`${name}, ${copy.verb.toLowerCase()}`}
    >
      <span className="cmp-face">
        {dialect === "pebble" ? (
          <StatusPulse active={active} tone={state === "working" ? "violet" : "brass"} />
        ) : null}
        <BotGlyph name={name} id={id} state={state} dialect={dialect} size={size} />
        {showMark ? (
          <span className="cmp-mark-slot">
            <ThinkingMark size={size === "xl" || size === "lg" ? "md" : "sm"} />
          </span>
        ) : null}
      </span>
      {snippetOn ? (
        <span className="cmp-snippet">{action ?? copy.action}</span>
      ) : null}
    </span>
  );
}

export function ListingFace({
  doc,
  size = "sm",
  dialect = "pebble",
  state = "idle",
}: {
  doc: Pick<IndexDoc, "id" | "name" | "type" | "source">;
  size?: AvatarSize;
  dialect?: MotionDialect;
  state?: AgentState;
}) {
  if (isBotLike(doc.type)) {
    return (
      <AgentAvatar
        name={doc.name}
        id={doc.id}
        size={size}
        dialect={dialect}
        state={state}
        action={listingAction(doc)}
        showSnippet={false}
      />
    );
  }
  return <TypeGlyph type={doc.type} size={size} dialect={dialect} />;
}
