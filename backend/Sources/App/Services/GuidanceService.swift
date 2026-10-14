import Foundation

// Future AI implementations can conform here. No external provider is connected.
protocol GuidanceProviding: Sendable {
    func guidance(for input: GuidanceInput) async throws -> GuidanceResponse
}

struct EducationalGuidanceService: GuidanceProviding {
    let library: ContentLibrary
    let screening = SafetyScreeningService()

    func guidance(for input: GuidanceInput) async throws -> GuidanceResponse {
        let input = try input.validated()
        let result = screening.evaluate(input)
        let region = BodyRegion.all.first { $0.id == input.regionId }!
        let limitations = [
            "AI personalization is disabled. Free-text symptoms, activity and onset are not medically interpreted.",
            "Educational information is not a diagnosis, treatment plan or clearance to exercise.",
            "The screening rules are incomplete and not clinically validated; no alert does not mean symptoms are safe.",
            "Library summaries are source-backed editorial drafts awaiting clinical review."
        ]
        if result.disposition == "emergency" || result.disposition == "urgent" {
            let action = result.disposition == "emergency"
                ? "Seek emergency medical help now. Contact your local emergency number or emergency department."
                : "Seek urgent medical advice now. If symptoms are severe or you believe this is an emergency, contact your local emergency number."
            return .init(mode: "educational", aiEnabled: false, regionId: input.regionId,
                         summary: action, disposition: result.disposition, reasons: result.reasons,
                         topics: [], generalCare: [], whenToSeekHelp: [action], followUpQuestions: [],
                         sourceIds: result.sourceIds, limitations: limitations)
        }
        if result.disposition == "needs_more_information" {
            return .init(mode: "educational", aiEnabled: false, regionId: input.regionId,
                         summary: "Answer the safety questions before requesting educational next steps.",
                         disposition: result.disposition, reasons: result.reasons,
                         topics: [], generalCare: [],
                         whenToSeekHelp: ["Do not wait for this app if you think you need urgent or emergency care."],
                         followUpQuestions: Self.questions(for: input.regionId).map(\.prompt),
                         sourceIds: [], limitations: limitations)
        }
        let topics = library.topics(for: input.regionId)
        // Preserve editorial order while removing duplicates.
        func unique(_ items: [String]) -> [String] {
            var seen = Set<String>()
            return items.filter { seen.insert($0).inserted }
        }
        return .init(mode: "educational", aiEnabled: false, regionId: input.regionId,
                     summary: "Explore general information about \(region.name.lowercased()). Topics are selected only by body region, not ranked diagnoses.",
                     disposition: result.disposition, reasons: result.reasons, topics: topics,
                     generalCare: unique(topics.flatMap(\.generalCare)),
                     whenToSeekHelp: unique(topics.flatMap(\.whenToSeekHelp)),
                     followUpQuestions: ["What movements make it worse?", "Is it improving, worsening or recurring?"],
                     sourceIds: unique(topics.flatMap(\.sourceIds)), limitations: limitations)
    }

    static func questions(for regionId: String) -> [ScreeningQuestion] {
        SafetyScreeningService.questions.filter { $0.appliesTo == "all" || $0.appliesTo == regionId }
    }
}

