import Vapor

/// POST /api/search/suggest — the search page's warning-sign check, and Tendi's page suggestions.
/// The warning-sign check runs on every search (no AI, generous limit). Only requests that use Gemini
/// count toward Tendi's per-minute limit.
struct SearchSuggestController: RouteCollection {
    let service: SearchSuggestService
    let checkLimiter: RateLimiter
    let aiLimiter: RateLimiter

    func boot(routes: any RoutesBuilder) throws {
        let api = routes.grouped("api", "search")
        let limited = api.grouped(GuidanceRateLimitMiddleware(limiter: checkLimiter, reason: "Too many searches. Try again in a moment."))
        limited.post("suggest") { request async throws -> SearchSuggestResponse in
            guard (request.body.data?.readableBytes ?? 0) <= 4 * 1024 else {
                throw APIError(.payloadTooLarge, "body_too_large", "Request body must be at most 4 KiB.")
            }
            guard let mediaType = request.headers.contentType,
                  mediaType.type.lowercased() == "application", mediaType.subType.lowercased() == "json" else {
                throw APIError(.unsupportedMediaType, "json_required", "Send the request as application/json.")
            }
            let input = try request.content.decode(SearchSuggestInput.self).validated()
            if let flagged = service.safetyResponse(for: input.query) { return flagged }
            guard input.useAI ?? true else { return SearchSuggestService.noAI }
            guard service.aiEnabled else { return SearchSuggestService.unavailable }
            // Do not trust X-Forwarded-For from arbitrary callers.
            let key = request.remoteAddress?.ipAddress ?? "local"
            if let retryAfter = await aiLimiter.consume(key: key) {
                throw APIError(.tooManyRequests, "rate_limited", "Tendi needs a short break. Try again in a moment.", retryAfter: retryAfter)
            }
            return await service.suggest(for: input.query, client: request.client, logger: request.logger)
        }
    }
}
