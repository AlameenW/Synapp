# Development

## Frontend

Install Node.js 22.12+ (or a newer supported LTS), then from the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open the URL Vite prints. Run `npm run build` for TypeScript checking and a production bundle, and `npm run lint` for ESLint.

The npm lockfile is included; use `npm ci` for reproducible installs. The frontend has been run locally by the team. Production build/lint and Swift compilation still need verification in an environment with the required toolchain and filesystem access.

The frontend has Tailwind, shadcn configuration, and a feature-based folder structure. Add shared components from inside `frontend` using `npx shadcn@latest add button card tabs`. Review generated changes before committing.

## Swift API

Use a current Swift 6 toolchain compatible with the resolved Vapor release on macOS or Linux. Windows teammates can use WSL2 with Swift installed inside Linux.

```sh
cd backend
swift package resolve
swift run App serve --hostname 127.0.0.1 --port 8080
```

In another terminal, run `swift test` from `backend`. Commit the generated `Package.resolved` after the team verifies dependency resolution. It is not fabricated in the scaffold.

The browser connects through Vite's /api proxy. Production hosting must supply equivalent routing; `vite preview` is not a production server.

## Team ownership

1. UI: shared components, theme, responsive screens.
2. 3D: body-explorer feature and licensed model assets.
3. API: Swift routes, models, content loading.
4. AI/content: Swift services, source review, guidance validation.

Agree on API shape changes together. Keep AI keys on the server. Commit lockfiles and use small reviewable changes. The first integration target is one selected region loading real reviewed content through Swift.

