import Foundation

/// Conservative warning-sign check on free-text chat messages. It runs in Swift *before* any AI call,
/// so urgent situations never depend on the model noticing them. It is a class-project keyword rule,
/// not validated triage: no match does not mean symptoms are safe.
struct ChatSafetyCheck: Sendable {
    struct Flag: Sendable {
        let level: String        // "emergency" or "urgent"
        let reply: String
        let sourceIds: [String]
    }

    private static let crisis = ["kill myself", "suicide", "suicidal", "end my life", "self harm", "self-harm", "hurt myself"]
    private static let emergency: [(phrases: [String], source: String)] = [
        (["chest pain", "chest tightness", "chest pressure", "pain in my chest", "pain spreading to my arm", "pain in my jaw"], "nhs-chest"),
        (["can't breathe", "cannot breathe", "struggling to breathe", "short of breath", "shortness of breath"], "nhs-chest"),
        (["numb groin", "numbness around my groin", "lost control of my bladder", "lost control of my bowel",
          "bladder control", "bowel control", "both legs are numb", "numbness in both legs", "weakness in both legs"], "nhs-back"),
        (["can't feel", "cannot feel", "lost feeling", "no feeling", "turned blue", "gone blue", "turned grey", "ice cold"], "nhs-sprains"),
        (["bone sticking out", "bone is sticking out", "looks deformed", "out of place", "dislocated", "wrong angle", "bent the wrong way"], "nhs-sprains"),
        (["car crash", "car accident", "hit by a car", "fell from a height", "head injury"], "nhs-back"),
    ]
    private static let urgent: [(phrases: [String], source: String)] = [
        (["can't walk", "cannot walk", "can't put weight", "can't bear weight", "cannot bear weight", "can't move my", "cannot move my"], "nhs-sprains"),
        (["fever", "feverish", "hot and swollen", "red and swollen"], "nhs-knee"),
        (["unbearable", "worst pain", "excruciating", "getting worse fast", "rapidly worse", "sudden severe"], "nhs-back"),
        (["numb", "numbness", "tingling"], "nhs-back"),
    ]

    func check(_ text: String) -> Flag? {
        let lower = text.lowercased().replacingOccurrences(of: "’", with: "'")
        let words = Set(lower.split(whereSeparator: { !($0.isLetter || $0 == "'") }).map(String.init))
        // Single words must match a whole word ("numb" should not match "number"); phrases match anywhere.
        func mentions(_ phrase: String) -> Bool {
            phrase.contains(" ") || phrase.contains("-") ? lower.contains(phrase) : words.contains(phrase)
        }
        if Self.crisis.contains(where: { mentions($0) }) {
            return Flag(level: "emergency",
                        reply: "I'm really sorry you're going through this. Please reach out for support right now: contact your local emergency number, or a crisis line such as 988 (call or text in the US). You don't have to handle this alone, and talking to someone can help.",
                        sourceIds: [])
        }
        let hits = Self.emergency.filter { $0.phrases.contains(where: { mentions($0) }) }
        if !hits.isEmpty {
            return Flag(level: "emergency",
                        reply: "What you describe can be a warning sign that needs help right away. Please contact your local emergency number or go to an emergency department now. Don't wait for this app — I can't assess emergencies.",
                        sourceIds: Array(Set(hits.map { $0.source })).sorted())
        }
        let urgentHits = Self.urgent.filter { $0.phrases.contains(where: { mentions($0) }) }
        if !urgentHits.isEmpty {
            return Flag(level: "urgent",
                        reply: "That could need a professional to take a look soon. Please get urgent medical advice (for example a doctor, urgent care or a nurse line), and if it's severe or getting worse quickly, contact your local emergency number. I can share general information, but I can't assess this for you.",
                        sourceIds: Array(Set(urgentHits.map { $0.source })).sorted())
        }
        return nil
    }
}
