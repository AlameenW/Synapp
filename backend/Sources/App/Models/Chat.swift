import Vapor

/// One earlier message in the companion conversation, sent back by the browser for context.
struct ChatTurn: Content, Equatable {
    let role: String   // "user" or "assistant"
    let text: String
}

/// POST /api/chat request: a question to Tendi. regionId is the body part the user has selected, if any;
/// it is only context, so Tendi can still answer about anything.
struct ChatInput: Content {
    var regionId: String? = nil
    let message: String
    var history: [ChatTurn]? = nil

    static let maxMessage = 1000
    static let maxHistory = 8
    static let maxHistoryText = 2000

    func validated() throws -> ChatInput {
        if let regionId, !BodyRegion.all.contains(where: { $0.id == regionId }) {
            throw APIError(.badRequest, "invalid_region", "Choose a supported body region.")
        }
        let message = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (1...Self.maxMessage).contains(message.count) else {
            throw APIError(.badRequest, "invalid_message", "Message must contain 1–\(Self.maxMessage) characters.")
        }
        let history = history ?? []
        guard history.count <= Self.maxHistory else {
            throw APIError(.badRequest, "invalid_history", "Send at most \(Self.maxHistory) earlier messages.")
        }
        for turn in history {
            guard ["user", "assistant"].contains(turn.role), (1...Self.maxHistoryText).contains(turn.text.count) else {
                throw APIError(.badRequest, "invalid_history", "Earlier messages need a user/assistant role and 1–\(Self.maxHistoryText) characters.")
            }
        }
        return ChatInput(regionId: regionId, message: message, history: history)
    }
}

/// POST /api/chat response.
/// mode: "ai" (Gemini wrote it), "library" (saved summary fallback) or "safety" (warning-sign message; no AI call).
struct ChatResponse: Content {
    let mode: String
    let aiEnabled: Bool
    let regionId: String?
    let reply: String
    let sourceIds: [String]
    let notice: String?
}
