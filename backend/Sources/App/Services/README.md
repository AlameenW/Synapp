# Backend services

- ContentLibrary loads and validates immutable educational content.
- BackendConfiguration reads runtime settings, including the optional GEMINI_API_KEY (server-side only).
- SafetyScreeningService evaluates structured answers conservatively.
- EducationalGuidanceService returns region-based information with explicit limitations.
- RateLimiter bounds anonymous guidance requests in memory.
- GuidanceProviding is the structured-guidance interface (still library-only).
- CompanionService powers Tendi (`POST /api/chat`): ChatSafetyCheck first, then GeminiClient grounded in the region's topics, then the library fallback.
- GeminiClient is the only code that calls an external provider. TextGenerating lets tests use a fake.

Controllers own HTTP concerns. No service persists symptoms or logs request descriptions or chat messages. Only GeminiClient calls an external provider, and only when GEMINI_API_KEY is set. Keep these boundaries when extending the backend.

