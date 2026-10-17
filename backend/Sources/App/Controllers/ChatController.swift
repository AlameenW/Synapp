import Vapor

/// POST /api/chat — questions to Tendi, the movement companion.
struct ChatController: RouteCollection {
    let service: CompanionService
    let limiter: RateLimiter

    func boot(routes: any RoutesBuilder) throws {
        let api = routes.grouped("api")
        let limited = api.grouped(GuidanceRateLimitMiddleware(limiter: limiter, reason: "Tendi needs a short break. Try again in a moment."))
        limited.post("chat") { request async throws -> ChatResponse in
            guard (request.body.data?.readableBytes ?? 0) <= 16 * 1024 else {
                throw APIError(.payloadTooLarge, "body_too_large", "Request body must be at most 16 KiB.")
            }
            guard let mediaType = request.headers.contentType,
                  mediaType.type.lowercased() == "application", mediaType.subType.lowercased() == "json" else {
                throw APIError(.unsupportedMediaType, "json_required", "Send the request as application/json.")
            }
            let input = try request.content.decode(ChatInput.self).validated()
            return await service.reply(to: input, client: request.client, logger: request.logger)
        }
    }
}
