# Synapp Swift API

The backend serves 11 body regions, 12 educational topics and 8 source records. It includes JSON validation, search/pagination, structured screening, an educational guidance service, CORS, bounded in-memory rate limiting and JSON errors. External AI is intentionally disabled.

## Run

Use Swift 6.3 or newer on Linux or macOS with the Vapor dependencies resolved:

```sh
cd backend
swift package resolve
swift test
swift run App serve --hostname 127.0.0.1 --port 8080
```

Windows: use WSL2 with a Linux Swift toolchain. Native Windows dependency downloads do not demonstrate that Vapor will compile on that platform.

From another terminal, request `http://127.0.0.1:8080/api/ready`. Start Vite separately; its existing proxy forwards `/api` here.

Copy `.env.example` to `.env` inside `backend` to override settings. Content is loaded and validated once at startup. Invalid or missing content prevents startup. Restart after editing content.

## Scope

There are no accounts, database writes, symptom history, external network requests, or AI keys. The service does not retain request bodies. The rate limiter keeps only peer IP and counters in memory until the window expires (expired buckets are removed on the next request). Behind a proxy, callers share the proxy's quota; apply per-user/IP limits at a trusted ingress before scaling. No forwarded address is trusted.

The library consists of **editorial drafts**, not clinically reviewed protocols. Screening is a conservative class-project feature, not validated triage. Free text is not interpreted. Do not present the response as a diagnosis, safe-to-exercise decision or personalized treatment.

See [API contract](../docs/api.md), [development](../docs/development.md) and [content notes](../content/README.md).

