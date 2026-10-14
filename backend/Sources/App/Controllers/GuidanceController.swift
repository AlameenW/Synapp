import Vapor

struct GuidanceController: RouteCollection {
    let service: any GuidanceProviding
    let limiter: RateLimiter

    func boot(routes: any RoutesBuilder) throws {
        let api = routes.grouped("api")
        api.get("screening-questions") { _ in SafetyScreeningService.questions }
        api.grouped(GuidanceRateLimitMiddleware(limiter: limiter)).post("guidance") { request async throws -> GuidanceResponse in
            guard (request.body.data?.readableBytes ?? 0) <= 16 * 1024 else {
                throw APIError(.payloadTooLarge, "body_too_large", "Request body must be at most 16 KiB.")
            }
            guard let mediaType = request.headers.contentType,
                  mediaType.type.lowercased() == "application", mediaType.subType.lowercased() == "json" else {
                throw APIError(.unsupportedMediaType, "json_required", "Send the request as application/json.")
            }
            let input = try request.content.decode(GuidanceInput.self).validated()
            return try await service.guidance(for: input)
        }
    }
}

