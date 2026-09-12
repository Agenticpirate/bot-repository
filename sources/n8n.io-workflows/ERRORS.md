# n8n.io-workflows errors

- Search index: 12,325 workflows (`GET /api/templates/search`, 100/page).
- Full JSON: 12,268 saved under `workflows/{id}.json`.
- **57 residual HTTP 404** on `GET /api/templates/workflows/{id}` — IDs appear in search but have no public detail payload (not rate-limited). First 20: 3682, 4834, 4844, 4912, 6023, 6160, 6281, 6315, 6373, 6455, 7370, 7371, 7917, 7942, 7943, 7998, 8157, 8760, 8981, 8979.
