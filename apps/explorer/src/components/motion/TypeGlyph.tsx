import { createElement } from "react";
import { AVATAR_PX, type AvatarSize, type MotionDialect } from "@/lib/motion";
import { typeIcon } from "@/components/icons";

export function TypeGlyph({
  type,
  size = "sm",
  dialect = "pebble",
  className = "",
}: {
  type: string;
  size?: AvatarSize;
  dialect?: MotionDialect;
  className?: string;
}) {
  const px = AVATAR_PX[size];
  const iconPx = Math.max(12, Math.round(px * 0.46));

  return (
    <span
      className={`type-glyph ${className}`}
      data-dialect={dialect}
      data-type={type}
      style={{ width: px, height: px }}
      title={type}
      aria-hidden="true"
    >
      {createElement(typeIcon(type), {
        size: iconPx,
        strokeWidth: dialect === "outline" ? 1.5 : 1.75,
      })}
    </span>
  );
}
