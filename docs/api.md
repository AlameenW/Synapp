# Synapp API

Base path: `/api`. All responses are JSON. The Vite development proxy forwards this path to `http://127.0.0.1:8080`. Use equivalent same-origin routing in deployment.

## Endpoints

| Method and path | Behavior |
| --- | --- |
| GET /api/health | Process liveness: status and service |
| GET /api/ready | Loaded topic/source counts, content status and AI availability |
| GET /api/regions | Array of 11 selectable regions |
| GET /api/regions/:id | One region; 404 when unknown |
| GET /api/regions/:id/topics | Array of topics for the anatomical region |
| GET /api/topics | Search and pagination |
| GET /api/topics/:id | One topic |
| GET /api/sources | Array of source metadata |
| GET /api/sources/:id | One source |
| GET /api/screening-questions | Question IDs, prompts and applicability |
| POST /api/guidance | Structured screening and region-based educational information; no AI |
| POST /api/chat | Questions to Tendi, the movement companion (Gemini when configured, otherwise the saved library) |

Topic search accepts `q` (up to 100 characters), `regionId`, `limit` (1–100, default 20), and `offset` (0–1000000, default 0). Results are ordered by topic ID. Response: `{items,total,limit,offset}`. Search covers titles, overviews and symptoms. Region topic endpoints keep their original array shape.

A topic includes `id, regionIds, title, overview, symptoms, commonness, generalCare, whenToSeekHelp, sourceIds, contentStatus`. Source URLs are resolved through the source endpoints. All current content is `editorial_draft`; retrieved sources have not been clinically reviewed by the team. There are no prevalence percentages.

## Guidance request

Send `Content-Type: application/json`. See [complete example](guidance-example.json).

| Field | Requirements |
| --- | --- |
| regionId | Required supported ID, such as right_knee |
| description | Required; trimmed length 1–2000 characters |
| activity, onset | Optional strings, each at most 200 characters |
| durationDays | Optional integer, 0–36500 |
| painIntensity | Optional integer, 0–10 |
| screening | Optional object; when supplied, all eight answers are required |

Each screening answer is `yes`, `no` or `unsure`. Fields: `chestPain, seriousAccident, backNeurologicalSymptoms, lossOfSensation, unableToUseLimb, feverWithHotSwollenJoint, deformity, suddenSeverePain`.

Retrieve the question wording from the endpoint; do not shorten it to an ambiguous label. The back-specific question applies to lower-back pain; clients can send `no` when inapplicable. If a positive answer is nevertheless supplied, the backend honors it conservatively.

## Guidance response

The response always says `mode: "educational"` and `aiEnabled: false`. It includes `regionId, summary, disposition, reasons, topics, generalCare, whenToSeekHelp, followUpQuestions, sourceIds, limitations`.

| Disposition | UI behavior |
| --- | --- |
| emergency | Show the help-seeking message prominently; no care suggestions or topic results are returned |
| urgent | Show the urgent assessment message; no care suggestions or topic results are returned |
| needs_more_information | Show screening questions; no care suggestions or topic results are returned |
| not_assessed | Show educational topics and limitations; never display “safe,” “cleared,” or a diagnosis |

Confirmed emergency signs take precedence over uncertainty and other symptoms. Uncertainty about warning signs is routed to human assessment. Intensity of 8–10 triggers urgent guidance even when screening is missing; this is a conservative project rule, not a validated clinical threshold.

**Free-text descriptions, activity and onset are not interpreted.** Duration is validated but does not classify urgency. Topics are selected only by region and are not ranked by likelihood. This endpoint has no external provider calls, chat history or personalized treatment plan. Render all supplied content as text, not HTML.

The screening is incomplete, not clinically validated, and cannot rule out emergencies. Do not delay human care to complete a form. In the UI, display source links and content status alongside information.

## Errors and limits

Errors use `{error:true,code,reason,requestId}`. Responses include `X-Request-ID`, `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store` (except CORS preflight handled directly by Vapor).

- 400: invalid JSON, fields or query parameters.
- 404: unknown resource or route.
- 413: request body exceeds 16 KiB.
- 415: guidance request is not JSON.
- 429: guidance rate limit; read `Retry-After` in seconds.
- 500: sanitized unexpected failure; use requestId for debugging.

Guidance defaults to 20 requests per 60-second fixed window per directly connected peer IP. Invalid guidance requests also consume the quota. Counters are bounded in memory, reset on restart, and are not shared between instances. The server ignores forwarded IP headers. A reverse proxy therefore shares one quota across its clients; enforce user/IP limits at trusted ingress before public deployment.

CORS permits configured exact origins. It is a browser policy, not authentication. The current read-only library and anonymous guidance API are intended for the class MVP.

See [OpenAPI specification](openapi.json) for machine-readable schemas.

## Chat (Tendi)

`POST /api/chat` with `Content-Type: application/json`:

| Field | Requirements |
| --- | --- |
| regionId | Required supported ID |
| message | Required; trimmed length 1–1000 characters |
| history | Optional; at most 8 earlier turns `{role: "user" or "assistant", text}`, each 1–2000 characters |

Response: `{mode, aiEnabled, regionId, reply, sourceIds, notice?}`.

| mode | Meaning |
| --- | --- |
| safety | A warning-sign phrase matched in Swift. The reply tells the user to seek help; **no AI call is made** |
| ai | Gemini wrote the reply, instructed to stay within the curated topics for the region and never diagnose |
| library | AI is not configured or failed; the reply is the saved library summary and `notice` explains why |
| off_topic | The question wasn't about health or the body. Gemini returns a marker and the server substitutes a fixed, polite decline, so off-topic answers never reach the user |

The Gemini key is read from `GEMINI_API_KEY` on the server and never sent to the browser. `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`. `CHAT_REQUESTS_PER_MINUTE` (default 10) limits requests per client IP. Messages are not stored or logged; only the failure kind is logged when Gemini errors. `sourceIds` always come from the content library, never from the model. On Gemini's free tier, Google may use submitted text to improve its products, so the UI tells users their question is sent to Google Gemini.

The warning-sign check is a keyword rule for a class project, not validated triage; no match does not mean symptoms are safe.

