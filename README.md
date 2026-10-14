# Synapp

**Explore where it hurts. Understand possible causes. Find an informed next step.**

Synapp is a proposed class project for lifters, athletes, and people with active lifestyles. It combines an interactive 3D body explorer with clear educational information about pain and injuries, plus AI feedback tailored to what a user describes.

The defining feature is a polished visual experience: an inviting body model, expressive colors, smooth transitions, and useful information that is easy to explore.

> Status: interactive frontend and MVP backend implemented. The frontend includes a procedural 3D figure, light/dark themes, educational panels and a library companion. Swift compilation and runtime tests still need verification on a supported toolchain. Clinical review and external AI integration remain outstanding. Synapp is a working name.

Confirmed constraints: a four-person team, a React + TypeScript frontend, and a Swift backend. UI library choices below are recommendations pending team selection.

## Product concept

Users select the part of their body that hurts, describe their symptoms and recent activity, and explore relevant information. Each topic explains possible contributing factors, associated symptoms, whether it is commonly discussed in the relevant activity, general self-care information, and when professional assessment may be needed. Claims about frequency must have sources; the app should not invent prevalence statistics.

Position Synapp as an **educational pain and injury guide**, not an automated diagnostic tool. A selected body part and a symptom description cannot establish a diagnosis. The interface and AI responses should communicate that limitation alongside the information, rather than relying only on a footer disclaimer.

Suggested product copy:

> Synapp provides educational information, not a medical diagnosis or a replacement for professional care. AI responses can be incomplete or incorrect.

## Main user journey

1. **Explore:** Open the body explorer and rotate between front and back views.
2. **Select:** Click or tap a body region, or select it from an accessible text list. Specify left or right where relevant, using the person's anatomical side.
3. **Describe:** Answer a short form about activity, onset, duration, pain intensity, and what makes symptoms better or worse.
4. **Learn:** View source-backed topic cards with possible explanations, associated symptoms, general care information, and guidance on seeking help.
5. **Personalize:** Request an AI explanation based on the selected region, answers, and curated content. Ask follow-up questions within that context.

The educational library should remain usable when AI is unavailable.

## First version: a focused MVP

| Feature | Initial scope |
| --- | --- |
| Interactive body | One stylized model with shoulder, elbow, wrist, lower back, knee, and ankle regions; left/right selection where applicable |
| Navigation | Rotate, zoom within limits, reset view, and front/back controls |
| Selection feedback | Hover label, visible selected region, and a synchronized information panel |
| Topic library | Two or three curated topics per region, with references and content review dates |
| Symptom form | A short structured questionnaire with optional free text |
| AI feedback | One contextual explanation with a small number of follow-up messages |
| Accessibility | Keyboard-operable region list, visible focus, readable contrast, and reduced-motion support |
| Responsive layout | Desktop explorer and mobile stacked layout with a collapsible details panel |
| Failure states | Model loading/error states, text-based fallback, and useful AI timeout/error messages |

Defer accounts, saved health histories, wearable integrations, photo analysis, detailed muscle layers, and personalized rehabilitation programs until the core experience works well.

## Visual direction

The current frontend uses a bright wellness palette with lavender, lime and coral accents, plus a persistent dark-mode option. The interactive figure is a project-owned, stylized Three.js model, not clinical anatomical imagery.

| Role | Starting color | Use |
| --- | --- | --- |
| Background | Cloud `#F7F8FA` | Main page |
| Surface | White `#FFFFFF` | Cards and panels |
| Primary accent | Violet `#7853E8` | Selection and primary actions |
| Secondary accent | Lime `#D9F69B` | Supporting highlights |
| Main text | Ink `#24243E` | Headings and body copy |
| Attention | Soft coral `#FFEDE4` | Help-seeking guidance |

These are starting tokens, not verified accessible color combinations. Check contrast for each actual text/background pairing.

### Layout sketch

```text
+-------------------------------------------------------------------+
| Synapp                                  Explore  About  Sources   |
+-------------------------------------------------------------------+
| Where does it hurt?                 | Selected region: Right knee  |
| Select an area to get started.      |                              |
|                                    | [Overview] [Symptoms] [Care] |
|          INTERACTIVE BODY          |                              |
|       soft lighting + highlight    | Source-backed topic cards    |
|                                    |                              |
| [Front] [Back] [Reset]              | [Describe how it feels]      |
| [Choose a region from a list]      | [Ask for AI feedback]        |
+-------------------------------------------------------------------+
| Educational guidance and limitations                              |
+-------------------------------------------------------------------+
```

On mobile, place the model above the details panel and keep the region selector easy to reach. Avoid requiring precision taps on small anatomical features.

Use short fades and panel transitions, a gentle camera movement when selecting a region, and subtle hover highlights. Stop idle rotation when the user interacts. Respect reduced-motion preferences and avoid decorative animation that interferes with reading or selection.

## Recommended technology stack

The **backend must be written in Swift**. A React browser frontend can communicate with it over HTTP; all application API logic and AI-provider requests live in Swift.

| Layer | Recommendation | Why it fits |
| --- | --- | --- |
| Frontend | React + TypeScript + [Vite](https://vite.dev/guide/) | A focused browser application with a separate Swift API |
| Styling | [Tailwind CSS](https://tailwindcss.com/docs/installation/using-vite) | Consistent spacing, colors, and responsive layouts |
| UI components | [shadcn/ui](https://ui.shadcn.com/docs) | Customizable component source for cards, tabs, dialogs, and form controls |
| UI animation | [Motion for React](https://motion.dev/docs/react) | Panel transitions, hover feedback, and enter/exit animations |
| 3D rendering | [React Three Fiber](https://r3f.docs.pmnd.rs/) | React-based rendering for Three.js scenes |
| 3D helpers | [Drei](https://drei.docs.pmnd.rs/) | Helpers for model loading, controls, and scene composition |
| Backend | Swift + [Vapor](https://docs.vapor.codes/) | Swift HTTP server and API framework |
| Initial content | Version-controlled JSON served by Vapor | Simple, reviewable content without an early database dependency |
| AI | Provider selected later; called by the Swift server | Keeps credentials private and centralizes validation and response handling |

**Recommended UI combination:** Tailwind + shadcn/ui + Motion for the interface, with React Three Fiber + Drei for the body explorer. These tools serve different roles and can be used together. Start with this set instead of combining multiple overlapping component libraries.

### UI foundation to build on

Choose the component foundation when scaffolding the frontend so screens share consistent controls from the start.

| Option | Best fit for Synapp | Tradeoff |
| --- | --- | --- |
| [shadcn/ui](https://ui.shadcn.com/docs) — recommended | A distinctive visual identity with editable component source | The team owns styling decisions and maintenance of copied components |
| [HeroUI](https://heroui.com/) — alternative | A React component library with polished defaults, typed APIs, and accessible behavior built on React Aria | Adopt its component conventions and customize its theme to fit the product |

Prefer shadcn/ui if the team wants substantial control over the final appearance. Prefer HeroUI if ready-made styling is the higher priority. Choose one as the main component foundation.

Build shared buttons, cards, tabs, form fields, and the mobile details panel first. Define color, typography, spacing, radius, and shadow tokens centrally. Use Motion for coordinated transitions and keep the 3D scene in its own component. The visual quality will come from this consistent design and the body interaction as much as from the library itself.

Use stable, compatible package releases and commit dependency lockfiles when implementation begins. Confirm the team's Swift/Vapor development environment early, particularly for Windows users; consider a Linux development environment if needed.

## How the 3D interaction should work

1. Obtain a lightweight GLB/glTF human model with a license that permits the intended use and redistribution. Record attribution requirements.
2. Map selectable regions to stable IDs such as `left_shoulder` or `right_knee`.
3. Use separately named meshes or invisible hit areas attached to the model. A visually attractive model does not automatically include selectable anatomical regions.
4. On selection, highlight the region and update the same application state used by the text selector and information panel.
5. Restrict camera movement enough to keep navigation comfortable. Load the model lazily and limit rendering cost on mobile devices.
6. Provide a text selector if the model fails or WebGL is unavailable.

The first technical milestone should prove that one region can be selected and mapped to the right information. Expand the model only after this works. The model represents approximate body locations, not a diagnostic anatomical examination.

## Proposed architecture

```text
React browser application
  |  HTTPS / JSON
  v
Swift + Vapor API
  |-- Curated region and topic content
  |-- Input validation and request limits
  |-- Guidance rules and response validation
  `-- AI provider client --> External AI API
```

The browser never receives the AI API key. Vapor retrieves relevant curated topics, constructs the AI request, validates the result, and returns a predictable response shape. No separate JavaScript backend is required.

### Proposed API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/regions` | List supported body regions and model mappings |
| `GET /api/regions/:id/topics` | Fetch educational topics and references |
| `GET /api/topics/:id` | Fetch an individual topic |
| `POST /api/guidance` | Submit region, symptom answers, and optional follow-up context |
| `GET /api/health` | Confirm that the Swift service is running |

Suggested guidance response fields: `summary`, `possibleExplanations`, `generalCare`, `whenToSeekHelp`, `limitations`, and `sourceIds`. Return source IDs from the approved content library; do not trust model-generated URLs. Avoid numerical diagnostic confidence scores.

Suggested content entities:

- **BodyRegion:** ID, display name, anatomical side, mesh or hit-area mapping.
- **Topic:** ID, regions, overview, associated symptoms, activity context, general care, help-seeking guidance, references, review date.
- **GuidanceInput:** Region, activity, onset, duration, intensity, symptom description, and limited conversation context.
- **Source:** ID, title, publisher, URL, and review metadata.

### Repository layout

```text
Synapp/
  frontend/                 # React, TypeScript, UI, and 3D scene
  backend/
    Package.swift           # Swift package definition
    Sources/App/
      Controllers/
      Models/
      Services/
    Tests/
  content/                  # Curated topics and source metadata
  assets/                   # Model assets and license information
  docs/                     # Designs, API contract, and project notes
  README.md
```

The directories above are present. Frontend features live under `frontend/src/features/`; shared components, API helpers, types, and styles have separate folders. See [development setup](docs/development.md) for run commands and [the API contract](docs/api.md) for current endpoint behavior.

The frontend offers clickable 3D regions, a keyboard-accessible selector, overview/symptom/care tabs, source links, and a library companion. Topic panels request the Swift API through Vite and fall back to the same bundled editorial content when it is unavailable. The companion uses local library summaries; AI is explicitly disabled pending provider selection. The backend's structured screening/guidance endpoint remains available for a future symptom form. See [frontend notes](frontend/README.md) and [backend setup](backend/README.md).

## AI behavior and content quality

AI should make curated information easier to understand and relate it to the user's reported activity. It should acknowledge uncertainty, ask useful follow-up questions when information is missing, and avoid declaring that a user has a particular injury.

- Ground explanations in a small, reviewed content library. Use reputable clinical or public-health sources and keep references visible.
- Define and review urgent-symptom handling before implementing care suggestions. Check those rules in Swift before requesting AI feedback; do not depend solely on a model to identify urgent situations.
- Do not present the absence of an alert as proof that symptoms are safe.
- Keep personalized prescriptions, medication dosing, return-to-play clearance, and guaranteed recovery timelines outside the MVP.
- Validate AI output and use a clear fallback when it is missing, unsupported, or malformed.
- Explain what symptom information will be sent to the AI provider before submission. Do not store symptom descriptions or conversation text by default, including in application logs.
- Keep secrets in server environment variables and impose request limits to control misuse and API costs.

The clinical content and guidance rules still need appropriate review; this README does not establish medical protocols.

## Implementation milestones

1. **Prove the core:** Confirm the Swift API runs, load a licensed model, and connect one selectable region to a topic card.
2. **Build the visual experience:** Establish design tokens, responsive panels, all six regions, and accessible text navigation.
3. **Add educational content:** Populate reviewed topics, references, and the symptom questionnaire.
4. **Integrate AI through Swift:** Add grounded requests, response validation, request limits, and failure handling.
5. **Polish and demonstrate:** Tune animation and loading performance, verify keyboard/mobile behavior, and rehearse the complete user journey.

### Suggested ownership for four teammates

| Teammate | Primary responsibility | First deliverable |
| --- | --- | --- |
| 1 | UI foundation and responsive screens | Shared theme, page shell, and topic panel |
| 2 | 3D model and interaction | One selectable region synchronized with the text selector |
| 3 | Swift/Vapor backend | Region/topic endpoints and agreed request/response models |
| 4 | AI integration in Swift and content workflow | Curated content schema and a guidance service with a mock response |

Agree on region IDs and the API contract together before splitting implementation. Integrate one complete region-to-guidance flow early. Each teammate owns checks for their area; content review, accessibility, and the final demo are shared responsibilities. Teammates 3 and 4 should coordinate ownership of backend files.

### MVP acceptance criteria

- Selecting any supported region displays the matching content and correct anatomical side.
- The same flow works through the text selector without using the 3D canvas.
- Topic cards show references; AI responses distinguish possible explanations from diagnoses.
- The Swift backend owns every application API route and AI-provider call.
- Model and AI failures leave a usable educational experience.
- Demo checks cover a normal request, incomplete input, urgent-rule handling, malformed AI output, and an API timeout.
- The interface remains readable on mobile and usable with reduced motion.

## Decisions to confirm with the team

- What is the deadline and grading rubric?
- Does the course require a database or specific Swift framework?
- Should the visual style lean toward dark sports technology or a brighter wellness aesthetic?
- Is there a budget for a licensed 3D model and AI API usage?
- Who will curate and review the educational content?

Until those details are confirmed, the proposed baseline is a browser-based class demo with six regions, no accounts, a dark teal visual direction, and a Swift/Vapor backend.
