import Vapor

func configure(_ app: Application, configuration supplied: BackendConfiguration? = nil) throws {
    let configuration = try supplied ?? BackendConfiguration.environment(workingDirectory: app.directory.workingDirectory)
    let library = try ContentLibrary(directory: configuration.contentDirectory)
    let limiter = RateLimiter(limit: configuration.guidanceLimit, windowSeconds: configuration.rateWindowSeconds)
    // Replace default error middleware so raw errors and request queries are not logged.
    app.middleware = .init()
    app.middleware.use(CORSMiddleware(configuration: .init(
        allowedOrigin: .any(configuration.allowedOrigins), allowedMethods: [.GET, .POST, .OPTIONS],
        allowedHeaders: [.contentType, .accept], exposedHeaders: [.init("X-Request-ID"), .init("Retry-After")]
    )))
    app.middleware.use(APIMiddleware())
    app.routes.defaultMaxBodySize = "16kb"
    try app.register(collection: RegionController(library: library))
    try app.register(collection: GuidanceController(service: EducationalGuidanceService(library: library), limiter: limiter))
    app.get("api", "health") { _ in
        ["status": "ok", "service": "synapp"]
    }
    app.get("api", "ready") { _ in
        Readiness(status: "ready", topicCount: library.topics.count, sourceCount: library.sources.count,
                  aiEnabled: false, contentStatus: "editorial_draft")
    }
}

private struct Readiness: Content {
    let status: String
    let topicCount: Int
    let sourceCount: Int
    let aiEnabled: Bool
    let contentStatus: String
}

