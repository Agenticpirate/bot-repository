export function StatusPulse({
  active = false,
  tone = "violet",
}: {
  active?: boolean;
  tone?: "violet" | "brass";
}) {
  if (!active) return null;
  return <span className="cmp-pulse-ring" data-tone={tone} aria-hidden="true" />;
}
