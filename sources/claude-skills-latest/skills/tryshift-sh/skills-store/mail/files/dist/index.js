// src/index.ts
function asAddressList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}
function toBase64Url(input) {
  return Buffer.from(input, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function encodeMimeHeader(value) {
  return /[^\x20-\x7E]/.test(value) ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=` : value;
}
function buildMultipartAlternative(text, html) {
  const boundary = `shift-gmail-${Date.now().toString(36)}`;
  return {
    contentType: `multipart/alternative; boundary="${boundary}"`,
    body: [
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      text,
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      html,
      `--${boundary}--`,
      ""
    ].join("\r\n")
  };
}
function buildRawMessage(input) {
  const to = asAddressList(input.to);
  if (to.length === 0) {
    throw new Error("send requires at least one recipient in `to`.");
  }
  if (!input.subject?.trim()) {
    throw new Error("send requires `subject`.");
  }
  if (!input.text && !input.html) {
    throw new Error("send requires `text` or `html`.");
  }
  const headers = [
    `To: ${to.join(", ")}`,
    `Subject: ${encodeMimeHeader(input.subject)}`,
    "MIME-Version: 1.0"
  ];
  const cc = asAddressList(input.cc);
  const bcc = asAddressList(input.bcc);
  if (cc.length > 0) headers.push(`Cc: ${cc.join(", ")}`);
  if (bcc.length > 0) headers.push(`Bcc: ${bcc.join(", ")}`);
  let body = "";
  if (input.text && input.html) {
    const multipart = buildMultipartAlternative(input.text, input.html);
    headers.push(`Content-Type: ${multipart.contentType}`);
    body = multipart.body;
  } else if (input.html) {
    headers.push("Content-Type: text/html; charset=UTF-8");
    body = input.html;
  } else {
    headers.push("Content-Type: text/plain; charset=UTF-8");
    body = input.text ?? "";
  }
  return toBase64Url(`${headers.join("\r\n")}\r
\r
${body}`);
}
async function invokeSend(input) {
  const gatewayBase = process.env.SHIFT_LOCAL_GATEWAY;
  if (!gatewayBase) {
    throw new Error("SHIFT_LOCAL_GATEWAY is required.");
  }
  const response = await fetch(`${gatewayBase}/skill-router/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      skillProvider: "gmail",
      skill: "mail",
      action: "send",
      input: {
        raw: buildRawMessage(input),
        threadId: input.threadId
      }
    })
  });
  const responseText = await response.text();
  const parsed = responseText ? JSON.parse(responseText) : null;
  if (!response.ok) {
    const errorMessage = parsed?.error ?? parsed?.message ?? `Skill Router returned ${response.status}.`;
    throw new Error(errorMessage);
  }
  if (!parsed?.ok) {
    throw new Error(parsed?.error ?? `Provider returned ${parsed?.status ?? "unknown status"}.`);
  }
  return parsed.data;
}
async function main() {
  const rawPayload = process.argv[2];
  if (!rawPayload) {
    throw new Error("Pass a single JSON payload string as the first argument.");
  }
  const input = JSON.parse(rawPayload);
  const operation = input.operation ?? "send";
  if (operation !== "send") {
    throw new Error(`Unsupported operation: ${operation}`);
  }
  const result = await invokeSend(input);
  process.stdout.write(`${JSON.stringify({ operation, ...result }, null, 2)}
`);
}
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}
`);
  process.exitCode = 1;
});
