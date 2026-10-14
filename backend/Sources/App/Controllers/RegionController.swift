import Vapor

struct RegionController: RouteCollection {
    let library: ContentLibrary

    func boot(routes: any RoutesBuilder) throws {
        let api = routes.grouped("api")
        api.get("regions") { _ in BodyRegion.all }
        api.get("regions", ":id") { request -> BodyRegion in
            guard let region = BodyRegion.all.first(where: { $0.id == request.parameters.get("id") }) else {
                throw APIError(.notFound, "region_not_found", "Unknown body region.")
            }
            return region
        }
        api.get("regions", ":id", "topics") { request -> [Topic] in
            guard let id = request.parameters.get("id"), BodyRegion.all.contains(where: { $0.id == id }) else {
                throw APIError(.notFound, "region_not_found", "Unknown body region.")
            }
            return library.topics(for: id)
        }
        api.get("topics", ":id") { request -> Topic in
            guard let topic = library.topics.first(where: { $0.id == request.parameters.get("id") }) else {
                throw APIError(.notFound, "topic_not_found", "Unknown topic.")
            }
            return topic
        }
        api.get("topics") { request -> TopicPage in
            let query = try request.query.decode(TopicQuery.self)
            let limit = query.limit ?? 20
            let offset = query.offset ?? 0
            guard (1...100).contains(limit), (0...1_000_000).contains(offset), (query.q?.count ?? 0) <= 100 else {
                throw APIError(.badRequest, "invalid_query", "Use limit 1–100, offset 0–1000000, and a search of at most 100 characters.")
            }
            if let regionId = query.regionId, !BodyRegion.all.contains(where: { $0.id == regionId }) {
                throw APIError(.badRequest, "invalid_region", "Choose a supported body region.")
            }
            let search = (query.q ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            let topics = library.topics.filter { topic in
                (query.regionId == nil || topic.regionIds.contains(query.regionId!)) &&
                (search.isEmpty || ([topic.title, topic.overview] + topic.symptoms).joined(separator: " ").lowercased().contains(search))
            }
            return TopicPage(items: Array(topics.dropFirst(offset).prefix(limit)), total: topics.count, limit: limit, offset: offset)
        }
        api.get("sources") { _ in library.sources }
        api.get("sources", ":id") { request -> HealthSource in
            guard let source = library.sources.first(where: { $0.id == request.parameters.get("id") }) else {
                throw APIError(.notFound, "source_not_found", "Unknown source.")
            }
            return source
        }
    }
}

private struct TopicQuery: Content {
    let q: String?
    let regionId: String?
    let limit: Int?
    let offset: Int?
}

