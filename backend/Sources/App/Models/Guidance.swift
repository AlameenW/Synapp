import Vapor

enum ScreeningAnswer: String, Content { case yes, no, unsure }

struct SafetyScreening: Content {
    let chestPain: ScreeningAnswer
    let seriousAccident: ScreeningAnswer
    let backNeurologicalSymptoms: ScreeningAnswer
    let lossOfSensation: ScreeningAnswer
    let unableToUseLimb: ScreeningAnswer
    let feverWithHotSwollenJoint: ScreeningAnswer
    let deformity: ScreeningAnswer
    let suddenSeverePain: ScreeningAnswer
}

struct GuidanceInput: Content {
    let regionId: String
    let description: String
    var activity: String? = nil
    var onset: String? = nil
    var durationDays: Int? = nil
    var painIntensity: Int? = nil
    var screening: SafetyScreening? = nil

    func validated() throws -> GuidanceInput {
        guard BodyRegion.all.contains(where: { $0.id == regionId }) else {
            throw APIError(.badRequest, "invalid_region", "Choose a supported body region.")
        }
        let description = description.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (1...2000).contains(description.count) else {
            throw APIError(.badRequest, "invalid_description", "Description must contain 1–2000 characters.")
        }
        for value in [activity, onset].compactMap({ $0 }) {
            guard value.count <= 200 else {
                throw APIError(.badRequest, "invalid_context", "Activity and onset must each be at most 200 characters.")
            }
        }
        if let durationDays, !(0...36500).contains(durationDays) {
            throw APIError(.badRequest, "invalid_duration", "Duration must be between 0 and 36500 days.")
        }
        if let painIntensity, !(0...10).contains(painIntensity) {
            throw APIError(.badRequest, "invalid_intensity", "Pain intensity must be between 0 and 10.")
        }
        return GuidanceInput(regionId: regionId, description: description,
            activity: activity?.trimmingCharacters(in: .whitespacesAndNewlines),
            onset: onset?.trimmingCharacters(in: .whitespacesAndNewlines),
            durationDays: durationDays, painIntensity: painIntensity, screening: screening)
    }
}

struct ScreeningQuestion: Content {
    let id: String
    let prompt: String
    let appliesTo: String
}

struct GuidanceResponse: Content {
    let mode: String
    let aiEnabled: Bool
    let regionId: String
    let summary: String
    let disposition: String
    let reasons: [String]
    let topics: [Topic]
    let generalCare: [String]
    let whenToSeekHelp: [String]
    let followUpQuestions: [String]
    let sourceIds: [String]
    let limitations: [String]
}

