import Foundation
import Vapor

struct ContentLibrary: Sendable {
    let topics: [Topic]
    let sources: [HealthSource]

    init(directory: URL) throws {
        func read<T: Decodable>(_ name: String, as type: T.Type) throws -> T {
            let url = directory.appendingPathComponent(name)
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            guard let size = attributes[.size] as? NSNumber, size.intValue <= 2_000_000 else {
                throw ContentError.invalid("Content file is too large: \(name)")
            }
            return try JSONDecoder().decode(type, from: Data(contentsOf: url))
        }
        try self.init(topics: read("topics.json", as: [Topic].self),
                      sources: read("sources.json", as: [HealthSource].self))
    }

    init(topics: [Topic], sources: [HealthSource]) throws {
        let regionIds = Set(BodyRegion.all.map(\.id))
        let sourceIds = Set(sources.map(\.id))
        let screeningSources: Set<String> = ["nhs-chest", "nhs-back", "nhs-sprains", "nhs-knee"]
        guard !topics.isEmpty, !sources.isEmpty,
              Set(topics.map(\.id)).count == topics.count,
              sourceIds.count == sources.count, screeningSources.isSubset(of: sourceIds) else {
            throw ContentError.invalid("Content must be nonempty with unique IDs.")
        }
        let validID: (String) -> Bool = {
            !$0.isEmpty && $0.count <= 80 && $0.range(of: "^[a-z0-9_-]+$", options: .regularExpression) != nil
        }
        for source in sources {
            guard validID(source.id), !source.title.isEmpty, !source.publisher.isEmpty,
                  let url = URLComponents(string: source.url), url.scheme == "https",
                  url.host != nil, url.user == nil, url.password == nil,
                  source.accessedOn.range(of: "^\\d{4}-\\d{2}-\\d{2}$", options: .regularExpression) != nil else {
                throw ContentError.invalid("Invalid source: \(source.id)")
            }
        }
        for topic in topics {
            guard validID(topic.id), !topic.title.isEmpty, !topic.overview.isEmpty,
                  !topic.regionIds.isEmpty, Set(topic.regionIds).isSubset(of: regionIds),
                  !topic.sourceIds.isEmpty, Set(topic.sourceIds).isSubset(of: sourceIds),
                  !topic.symptoms.isEmpty, !topic.whenToSeekHelp.isEmpty,
                  ["editorial_draft", "clinically_reviewed"].contains(topic.contentStatus) else {
                throw ContentError.invalid("Invalid topic or dangling reference: \(topic.id)")
            }
        }
        guard regionIds.isSubset(of: Set(topics.flatMap(\.regionIds))) else {
            throw ContentError.invalid("Every supported region needs educational content.")
        }
        self.topics = topics.sorted { $0.id < $1.id }
        self.sources = sources.sorted { $0.id < $1.id }
    }

    func topics(for regionId: String) -> [Topic] {
        topics.filter { $0.regionIds.contains(regionId) }
    }

    enum ContentError: Error { case invalid(String) }
}

