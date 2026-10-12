import Vapor

func configure(_ app: Application) throws {
    app.routes.defaultMaxBodySize = "16kb"
    try app.register(collection: RegionController())
    try app.register(collection: GuidanceController())
    app.get("api", "health") { _ in
        ["status": "ok", "service": "synapp"]
    }
}

