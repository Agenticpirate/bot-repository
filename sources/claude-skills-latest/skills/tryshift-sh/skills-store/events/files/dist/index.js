// src/index.ts
async function invokeAgenda(input) {
  const gatewayBase = process.env.SHIFT_LOCAL_GATEWAY;
  if (!gatewayBase) {
    throw new Error("SHIFT_LOCAL_GATEWAY is required.");
  }
  const response = await fetch(`${gatewayBase}/skill-router/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      skillProvider: "google-calendar",
      skill: "events",
      action: "agenda",
      input
    })
  });
  const responseText = await response.text();
  const parsed = responseText ? JSON.parse(responseText) : null;
  if (!response.ok) {
    const errorMessage = parsed?.error ?? parsed?.message ?? `Skill Router returned ${response.status}.`;
    throw new Error(errorMessage);
  }
  return parsed;
}
function formatEventTime(event) {
  const start = event.start?.dateTime ?? event.start?.date ?? "unknown start";
  const end = event.end?.dateTime ?? event.end?.date ?? "unknown end";
  return `${start} - ${end}`;
}
function buildSummary(items) {
  if (items.length === 0) return "No calendar events found in the requested window.";
  return items.map((event, index) => `${index + 1}. ${event.summary ?? "Untitled"} (${formatEventTime(event)})`).join("\n");
}
async function main() {
  const rawPayload = process.argv[2];
  if (!rawPayload) {
    throw new Error("Pass a single JSON payload string as the first argument.");
  }
  const input = JSON.parse(rawPayload);
  const agenda = await invokeAgenda(input);
  const summary = buildSummary(agenda.items ?? []);
  const output = {
    count: agenda.count ?? agenda.items?.length ?? 0,
    summary,
    items: agenda.items ?? [],
    nextPageToken: agenda.nextPageToken ?? null
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}
`);
}
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}
`);
  process.exitCode = 1;
});
