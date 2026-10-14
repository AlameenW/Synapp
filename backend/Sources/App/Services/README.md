# Backend services

- ContentLibrary loads and validates immutable educational content.
- BackendConfiguration reads non-secret runtime settings.
- SafetyScreeningService evaluates structured answers conservatively.
- EducationalGuidanceService returns region-based information with explicit limitations.
- RateLimiter bounds anonymous guidance requests in memory.
- GuidanceProviding is the future AI service interface; no provider is connected.

Controllers own HTTP concerns. No service persists symptoms, calls an external provider, or logs request descriptions. Keep these boundaries when extending the backend.

