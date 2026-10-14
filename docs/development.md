# Development

## Frontend

Use Node.js 22.12+ or a newer supported LTS:

```sh
cd frontend
npm ci
npm run dev
```

Open Vite's printed URL. Run `npm run build` for type checking and bundling; `npm run lint` for ESLint. The npm lockfile is included.

The UI requests region topics and sources from the Swift API, with the same bundled library as an offline fallback. Its 3D explorer, theme toggle, topic tabs and local library companion work without the backend. External AI remains disabled; structured screening is not yet exposed in the frontend. See frontend/README.md.

## Backend

Use Swift 6.3+ on Linux or macOS. From the repository root:

```sh
cd backend
swift package resolve
swift test
swift run App serve --hostname 127.0.0.1 --port 8080
```

Windows users should use WSL2 with Swift installed inside Linux. An editor resolving dependencies with a native Windows toolchain does not confirm Vapor build compatibility.

Content loads from `content/` or `../content/` relative to the working directory. Set `CONTENT_DIRECTORY` explicitly if starting elsewhere. The app validates data and references before serving; restart to reload changes.

Copy `backend/.env.example` to `backend/.env` if settings need to change. Vapor loads this file when launched from the backend directory. No AI key is needed or consumed.

After a successful resolve on the target platform, commit `backend/Package.resolved`. Do not commit `.build`, `.env`, caches or symptom data.

## Verify

```sh
# From the repository root; no npm packages required
node scripts/validate-content.mjs

# From backend, with the Swift toolchain installed
swift test
```

The Swift suite exercises routes, searches, reference validation, screening precedence, invalid bodies, CORS, error envelopes and rate limiting. It does not call external services.

Smoke-test a running backend from the repository root:

```sh
curl http://127.0.0.1:8080/api/ready
curl "http://127.0.0.1:8080/api/topics?regionId=right_knee"
curl -H "Content-Type: application/json" --data-binary @docs/guidance-example.json http://127.0.0.1:8080/api/guidance
```

On Windows PowerShell use `curl.exe` to avoid the older PowerShell alias.

## Ownership and next steps

1. UI: connect topic panels and structured screening to the documented API.
2. 3D: connect a licensed model to existing region IDs.
3. API: maintain Swift routes and schema compatibility.
4. Content/AI: review the editorial summaries; select and implement an AI provider later.

External AI is intentionally deferred. Implement `GuidanceProviding` when selected, preserving screening precedence and reliable educational fallback. Confirm user-facing data sharing before transmitting symptoms to any provider.

Production deployment still needs clinical review, HTTPS, operational monitoring and ingress limits appropriate to the audience. There are no accounts or persisted health histories in this MVP.

