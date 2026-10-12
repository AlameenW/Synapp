import Vapor

struct GuidanceInput: Content {
    let regionId: String
    let description: String
}

struct GuidanceController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        routes.post("api", "guidance") { request -> HTTPStatus in
            let input = try request.content.decode(GuidanceInput.self)
            guard BodyRegion.all.contains(where: { $0.id == input.regionId }),
                  !input.description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  input.description.count <= 2000 else {
                throw Abort(.badRequest, reason: "Provide a supported region and a description of 1–2000 characters.")
            }
            throw Abort(.serviceUnavailable, reason: "Personalized guidance is not enabled in this scaffold.")
        }
    }
}

