import Foundation
import Vapor

/// Anything that can turn a system instruction plus a conversation into a reply.
/// The live app uses Gemini; tests use a fake so they never call the network.
protocol TextGenerating: Sendable {
    func generate(system: String, turns: [ChatTurn], client: any Client) async throws -> String
}

enum TextGenerationError: Error {
    case badStatus(UInt)
    case emptyReply(String?)
    case timedOut
}

/// Calls Google's Gemini API (models.generateContent). The API key stays on the server.
struct GeminiClient: TextGenerating {
    let apiKey: String
    let model: String
    var timeoutSeconds: UInt64 = 20

    func generate(system: String, turns: [ChatTurn], client: any Client) async throws -> String {
        let uri = URI(string: "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent")
        let headers: HTTPHeaders = ["x-goog-api-key": apiKey, "Content-Type": "application/json"]
        let body = GeminiRequest(
            systemInstruction: .init(role: nil, parts: [.init(text: system)]),
            contents: turns.map { .init(role: $0.role == "assistant" ? "model" : "user", parts: [.init(text: $0.text)]) },
            generationConfig: .init(maxOutputTokens: 1024)
        )
        let response = try await Self.withTimeout(seconds: timeoutSeconds) {
            try await client.post(uri, headers: headers) { request in
                try request.content.encode(body, as: .json)
            }
        }
        guard response.status == .ok else { throw TextGenerationError.badStatus(response.status.code) }
        let decoded = try response.content.decode(GeminiResponse.self)
        let candidate = decoded.candidates?.first
        let text = (candidate?.content?.parts ?? [])
            .filter { $0.thought != true }
            .compactMap(\.text)
            .joined()
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { throw TextGenerationError.emptyReply(candidate?.finishReason) }
        return text
    }

    /// Give up if Gemini takes too long, so the user gets the library fallback instead of waiting.
    static func withTimeout<T: Sendable>(seconds: UInt64, _ operation: @escaping @Sendable () async throws -> T) async throws -> T {
        try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask { try await operation() }
            group.addTask {
                try await Task.sleep(nanoseconds: seconds * 1_000_000_000)
                throw TextGenerationError.timedOut
            }
            guard let first = try await group.next() else { throw TextGenerationError.timedOut }
            group.cancelAll()
            return first
        }
    }
}

// MARK: - Gemini REST shapes (only the fields we use)

struct GeminiPart: Content {
    var text: String?
    var thought: Bool? = nil
}

struct GeminiContent: Content {
    var role: String?
    var parts: [GeminiPart]?
}

struct GeminiGenerationConfig: Content {
    let maxOutputTokens: Int
}

struct GeminiRequest: Content {
    let systemInstruction: GeminiContent
    let contents: [GeminiContent]
    let generationConfig: GeminiGenerationConfig
}

struct GeminiCandidate: Content {
    let content: GeminiContent?
    let finishReason: String?
}

struct GeminiResponse: Content {
    let candidates: [GeminiCandidate]?
}
