import Foundation
import Vapor

struct BackendConfiguration: Sendable {
    var contentDirectory: URL
    var allowedOrigins: [String] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    var guidanceLimit = 20
    var rateWindowSeconds = 60

    static func environment(workingDirectory: String) throws -> BackendConfiguration {
        let base = URL(fileURLWithPath: workingDirectory, isDirectory: true)
        let directory: URL
        if let path = Environment.get("CONTENT_DIRECTORY") {
            directory = URL(fileURLWithPath: path, relativeTo: base).standardizedFileURL
        } else {
            let candidates = [base.appendingPathComponent("content"),
                              base.appendingPathComponent("../content").standardizedFileURL]
            guard let found = candidates.first(where: {
                FileManager.default.fileExists(atPath: $0.appendingPathComponent("topics.json").path)
            }) else { throw ConfigurationError.invalid("Set CONTENT_DIRECTORY to the content folder.") }
            directory = found
        }
        var configuration = BackendConfiguration(contentDirectory: directory)
        if let origins = Environment.get("ALLOWED_ORIGINS") {
            configuration.allowedOrigins = origins.split(separator: ",").map {
                $0.trimmingCharacters(in: .whitespaces)
            }
            for origin in configuration.allowedOrigins {
                guard let url = URLComponents(string: origin),
                      ["http", "https"].contains(url.scheme ?? ""), url.host != nil,
                      url.user == nil, url.password == nil, url.query == nil,
                      url.fragment == nil, url.path.isEmpty else {
                    throw ConfigurationError.invalid("ALLOWED_ORIGINS must contain exact HTTP(S) origins without paths.")
                }
            }
        }
        if let limit = Environment.get("GUIDANCE_REQUESTS_PER_MINUTE") {
            guard let value = Int(limit), (1...1000).contains(value) else {
                throw ConfigurationError.invalid("GUIDANCE_REQUESTS_PER_MINUTE must be 1–1000.")
            }
            configuration.guidanceLimit = value
        }
        return configuration
    }

    enum ConfigurationError: Error { case invalid(String) }
}

