# API contract — scaffold

Development frontend requests use relative `/api` URLs. Vite proxies them to `http://127.0.0.1:8080`. For deployment, serve the frontend and proxy `/api` under the same origin.

| Route | Current behavior |
| --- | --- |
| GET /api/health | 200: {"status":"ok","service":"synapp"} |
| GET /api/regions | 200: array of {id,name,side}; 11 selectable regions |
| GET /api/regions/:id/topics | 200: empty array for a supported region; 404 otherwise |
| GET /api/topics/:id | 404 until reviewed content is implemented |
| POST /api/guidance | Validates input, then returns 503 because AI is not configured |

Guidance request: `{"regionId":"right_knee","description":"User-entered description"}`.
Description must contain 1–2000 characters after rejecting whitespace-only input.
Invalid fields return 400; malformed or unsupported request bodies use Vapor's decoding errors.
Vapor errors use `{"error":true,"reason":"..."}`.

Topic shape: `{id,regionIds,title,overview,sourceIds}`. Expand in Swift and TypeScript together when content is implemented.

The frontend includes an explicitly labeled local preview of region selection so UI work can continue without Swift. It does not simulate AI or medical guidance.

