import Foundation
import Vapor

/// Anything that can turn a system instruction plus a conversation into a reply.
/// The live app uses Gemini; tests use a fake so they never call the network.
protocol TextGenerating: Sendable {
    func generate(system: String, turns: [ChatTurn], client: any Client) async throws -> String
    /// Same, but asks for JSON matching `schema` (structured output) when the generator supports it.
    func generate(system: String, turns: [ChatTurn], schema: GeminiSchema?, client: any Client) async throws -> String
}

extension TextGenerating {
    /// Generators without structured output (such as test fakes) ignore the schema.
    func generate(system: String, turns: [ChatTurn], schema: GeminiSchema?, client: any Client) async throws -> String {
        try await generate(system: system, turns: turns, client: client)
    }
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
    /// When set, Gemini must reply with JSON matching this schema (structured output).
    var responseSchema: GeminiSchema? = nil

    func generate(system: String, turns: [ChatTurn], client: any Client) async throws -> String {
        try await generate(system: system, turns: turns, schema: responseSchema, client: client)
    }

    func generate(system: String, turns: [ChatTurn], schema: GeminiSchema?, client: any Client) async throws -> String {
        do {
            return try await send(system: system, turns: turns, schema: schema, client: client)
        } catch TextGenerationError.badStatus(400) where schema != nil {
            // If this model rejects the JSON schema, still answer as plain text; callers accept both.
            return try await send(system: system, turns: turns, schema: nil, client: client)
        }
    }

    private func send(system: String, turns: [ChatTurn], schema: GeminiSchema?, client: any Client) async throws -> String {
        let uri = URI(string: "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent")
        let headers: HTTPHeaders = ["x-goog-api-key": apiKey, "Content-Type": "application/json"]
        let body = GeminiRequest(
            systemInstruction: .init(role: nil, parts: [.init(text: system)]),
            contents: turns.map { .init(role: $0.role == "assistant" ? "model" : "user", parts: [.init(text: $0.text)]) },
            generationConfig: .init(maxOutputTokens: 1024,
                                    responseMimeType: schema == nil ? nil : "application/json",
                                    responseSchema: schema)
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
    var responseMimeType: String? = nil
    var responseSchema: GeminiSchema? = nil
}

/// The subset of Gemini's response schema format that Tendi uses (objects of strings, booleans and string arrays).
struct GeminiSchema: Content, Sendable {
    var type: String
    var properties: [String: GeminiSchema]? = nil
    var items: GeminiItemSchema? = nil
    var required: [String]? = nil
    var propertyOrdering: [String]? = nil
}

/// The schema for array items: a plain type, or an object of plain-typed fields.
struct GeminiItemSchema: Content, Sendable {
    var type: String
    var properties: [String: GeminiItemSchema]? = nil
    var required: [String]? = nil
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
