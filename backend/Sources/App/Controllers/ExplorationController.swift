import Vapor

struct ExplorationController: RouteCollection {
    let service: ExplorationService
    let limiter: RateLimiter

    func boot(routes: any RoutesBuilder) throws {
        let api = routes.grouped("api")
        api.get("regions", ":id", "exploration") { request throws -> ExplorationQuestions in
            try service.questions(for: request.parameters.get("id") ?? "")
        }
        api.grouped(GuidanceRateLimitMiddleware(limiter: limiter)).post("exploration") { request throws -> ExplorationResponse in
            guard let media = request.headers.contentType, media.type == "application", media.subType == "json" else {
                throw APIError(.unsupportedMediaType, "json_required", "Send the request as application/json.")
            }
            return try service.explore(request.content.decode(ExplorationInput.self))
        }
    }
}
