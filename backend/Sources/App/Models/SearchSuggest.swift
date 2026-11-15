import Vapor

/// POST /api/search/suggest request: what the user typed in the body search box.
struct SearchSuggestInput: Content {
    let query: String
    /// false: only run the warning-sign check (no Gemini call). The page does this while its own search has results.
    var useAI: Bool? = nil

    static let maxQuery = 120

    func validated() throws -> SearchSuggestInput {
        let query = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (2...Self.maxQuery).contains(query.count) else {
            throw APIError(.badRequest, "invalid_query", "Search text must contain 2–\(Self.maxQuery) characters.")
        }
        return SearchSuggestInput(query: query, useAI: useAI)
    }
}

/// One library topic Tendi suggests. `area` is the library body area ("hand", "knee").
struct SearchSuggestion: Content {
    let topicId: String
    let title: String
    let area: String
    let reason: String
}

/// mode: "ai" (Gemini picked the topics), "safety" (warning-sign words; `message` says where to get help and no AI
/// call is made), "off_topic" (not about the body), "none" (useAI was false and no warning sign matched)
/// or "unavailable" (AI is off or failed; the page shows its own empty state).
struct SearchSuggestResponse: Content {
    let mode: String
    let suggestions: [SearchSuggestion]
    let message: String?
    let sourceIds: [String]
    /// For "safety": "emergency" or "urgent".
    var level: String? = nil
}
