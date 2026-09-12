import http from "node:http";
import { readMetrics, appendSnapshot } from "./lib/store.js";
import { parseWebhook } from "./lib/parse.js";
import { renderChart } from "./vendor/tiny-chart.min.js";

const PORT = process.env.PORT || 8787;

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/webhook") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const snapshot = parseWebhook(body);
    if (!snapshot) {
      res.writeHead(400).end("bad payload");
      return;
    }
    await appendSnapshot(snapshot);
    res.writeHead(204).end();
    return;
  }

  if (req.method === "GET" && req.url === "/") {
    const metrics = await readMetrics();
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><meta charset="utf-8"><title>pulseboard</title>
<h1>pulseboard</h1>
${renderChart(metrics.map((m) => m.mrr))}
<pre>${JSON.stringify(metrics.slice(-7), null, 2)}</pre>`);
    return;
  }

  res.writeHead(404).end();
});

server.listen(PORT, () => {
  console.log(`pulseboard on :${PORT}`);
});
