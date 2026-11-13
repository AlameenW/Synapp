# Synapp Swift API

The backend serves 37 body regions, 51 educational topics and 38 source records. It includes JSON validation, search/pagination, structured screening, an educational guidance service, CORS, bounded in-memory rate limiting and JSON errors. Tendi uses Google Gemini when configured, with a source-linked library fallback. The guided exploration feature uses Swift rules and does not call AI.

Verified on 2026-11-03 with Swift 6.4.1 in Linux (WSL): all 36 backend tests pass, including topic coverage for every selectable region, companion-library summaries, guided question validation, warning overrides and related-reading matches.

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

There are no accounts, database writes or stored symptom histories. Tendi can call Gemini if an API key is configured; the questionnaire does not send answers to an AI provider. The service does not retain request bodies. The rate limiter keeps only peer IP and counters in memory until the window expires (expired buckets are removed on the next request). Behind a proxy, callers share the proxy's quota; apply per-user/IP limits at a trusted ingress before scaling. No forwarded address is trusted.

The library consists of **editorial drafts**, not clinically reviewed protocols. Screening is a conservative class-project feature, not validated triage. Free text is not interpreted. Do not present the response as a diagnosis, safe-to-exercise decision or personalized treatment.

See [API contract](../docs/api.md), [development](../docs/development.md) and [content notes](../content/README.md).

