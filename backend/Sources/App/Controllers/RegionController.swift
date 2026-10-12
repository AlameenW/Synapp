import Vapor

struct RegionController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let api = routes.grouped("api")
        api.get("regions") { _ in BodyRegion.all }
        api.get("regions", ":id", "topics") { request -> [Topic] in
            guard BodyRegion.all.contains(where: { $0.id == request.parameters.get("id") }) else {
                throw Abort(.notFound, reason: "Unknown body region.")
            }
            // Intentionally empty until reviewed educational content is available.
            return []
        }
        api.get("topics", ":id") { _ -> Topic in
            throw Abort(.notFound, reason: "No reviewed topics have been published.")
        }
    }
}

