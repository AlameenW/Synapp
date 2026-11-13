import Foundation
import Vapor

/// Compares source-backed symptom patterns using explicit observations.
/// Ordering reflects agreement with the library, not disease probability.
struct ExplorationService: Sendable {
    let library: ContentLibrary
    let catalog: ExplorationCatalog

    init(library: ContentLibrary) throws {
        guard let catalog = library.exploration else {
            throw ContentLibrary.ContentError.invalid("Exploration content is missing.")
        }
        self.library = library
        self.catalog = catalog
    }

    func questions(for region: String) throws -> ExplorationQuestions {
        guard BodyRegion.all.contains(where: { $0.id == region }),
              let profile = catalog.profiles.first(where: { $0.area == ExplorationCatalog.area(region) }) else {
            throw APIError(.badRequest, "invalid_region", "Choose a supported body region.")
        }
        return .init(profile: profile, warningSigns: catalog.warnings(for: region))
    }

    func explore(_ input: ExplorationInput) throws -> ExplorationResponse {
        let config = try questions(for: input.regionId)
        func invalid(_ message: String) -> APIError { APIError(.badRequest, "invalid_exploration", message) }
        guard ["none", "selected", "unsure"].contains(input.warningStatus),
              Set(input.warningSigns).count == input.warningSigns.count,
              Set(input.warningSigns).isSubset(of: Set(config.warningSigns.map(\.id))),
              (input.warningStatus == "selected") == !input.warningSigns.isEmpty else {
            throw invalid("Choose warning signs, none of these, or unsure; do not combine them.")
        }
        guard Set(input.answers.keys).isSubset(of: Set(config.profile.questions.map(\.id))) else {
            throw invalid("Some answers do not belong to this questionnaire.")
        }
        for question in config.profile.questions {
            guard let values = input.answers[question.id] else { continue }
            guard !values.isEmpty, values.count <= (question.multiple ? 3 : 1),
                  Set(values).count == values.count,
                  Set(values).isSubset(of: Set(question.options.map(\.id))),
                  !(values.contains("other") && values.count > 1) else {
                throw invalid("Choose valid options for \(question.prompt)")
            }
        }
        let limitations = [
            "These answers cannot establish a diagnosis or rule out a serious cause.",
            "Matches compare your reported features with a limited library; they are not medical probabilities. Overlapping conditions may fit equally well.",
            "Questions and comparisons are editorial drafts awaiting clinical review. Answers are not saved."
        ]
        let warnings = config.warningSigns.filter { input.warningSigns.contains($0.id) }
        if input.warningStatus != "none" {
            let emergency = warnings.contains { $0.level == "emergency" }
            let action = emergency
                ? "Seek emergency medical help now. Contact your local emergency number or emergency department."
                : "Seek urgent medical advice now. If symptoms are severe or you believe this is an emergency, contact your local emergency number."
            return .init(regionId: input.regionId, disposition: emergency ? "emergency" : "urgent",
                         summary: action, nextStep: action,
                         reasons: input.warningStatus == "unsure" ? ["You were unsure about a warning sign; get human advice."] : warnings.map(\.label),
                         matches: [], sourceIds: Array(Set((input.warningStatus == "unsure" ? config.warningSigns : warnings).flatMap(\.sourceIds))).sorted(),
                         answerSummary: [], limitations: limitations)
        }
        let active = config.profile.activeQuestions(answers: input.answers)
        guard Set(input.answers.keys) == Set(active.map(\.id)) else {
            throw invalid("Answer every question on your current path; remove answers from branches that no longer apply.")
        }
        func observation(_ condition: ExplorationCondition) -> String {
            let question = active.first { $0.id == condition.questionId }!
            let labels = question.options.filter { condition.optionIds.contains($0.id) && (input.answers[question.id] ?? []).contains($0.id) }.map(\.label)
            return question.id == "pattern" ? labels.joined(separator: "; ") : question.prompt + " " + labels.joined(separator: "; ")
        }
        let contextIds: Set<String> = ["onset", "duration", "trend", "impact"]
        let candidates: [ExplorationMatch] = config.profile.comparisons.compactMap { comparison in
            guard let topic = library.topics(for: input.regionId).first(where: { $0.id == comparison.topicId }) else { return nil }
            let supporting = comparison.clues.filter { $0.matches(input.answers) }
            // Duration alone must never manufacture a condition match.
            guard supporting.contains(where: { !contextIds.contains($0.questionId) }) else { return nil }
            let differences = comparison.lessTypical.filter { $0.matches(input.answers) }
            let distinctClues = Set(supporting.map(\.questionId)).count
            return .init(topic: topic, matchedAnswers: supporting.map(observation), lessTypicalAnswers: differences.map(observation),
                         fit: distinctClues >= 2 && differences.isEmpty ? "closer" : "possible")
        }
        let matches = candidates.sorted { left, right in
            if left.fit != right.fit { return left.fit == "closer" }
            if left.lessTypicalAnswers.count != right.lessTypicalAnswers.count { return left.lessTypicalAnswers.count < right.lessTypicalAnswers.count }
            if left.matchedAnswers.count != right.matchedAnswers.count { return left.matchedAnswers.count > right.matchedAnswers.count }
            return left.topic.title < right.topic.title
        }
        let summary = matches.isEmpty
            ? "There is not enough specific information to narrow the library to a useful symptom match. You can edit your answers or browse all issues for this area."
            : "These issues share features with your answers. Closer symptom matches have several supporting observations and no reported differences in this comparison. This is not a diagnosis."
        let needsAssessment = ["persistent", "recurring"].contains(input.answers["duration"]!.first!)
            || input.answers["trend"] == ["worsening"]
            || ["daily_tasks", "sleep"].contains(input.answers["impact"]!.first!)
        let nextStep: String
        if ExplorationCatalog.area(input.regionId) == "chest" {
            nextStep = "Get medical advice about unexplained chest pain, even when none of the listed warning signs were selected."
        } else if (input.answers["pattern"] ?? []).contains("focal_shin") {
            nextStep = "Arrange assessment of focused shin pain before resuming painful running or jumping."
        } else if needsAssessment {
            nextStep = "Consider a routine appointment because you reported persistent, recurring, worsening or disruptive symptoms. Use the issue-specific information to prepare; new warning signs need earlier help."
        } else if matches.isEmpty {
            nextStep = "Review your answers or browse all issues for this area. Arrange a routine appointment if symptoms do not improve or worry you; seek earlier help for new warning signs."
        } else {
            nextStep = "Start with the issue-specific care for each match and monitor how your symptoms change. Arrange a routine appointment if they do not improve or concern you; seek earlier help for new warning signs."
        }
        let answerSummary = active.map { question in
            let values = input.answers[question.id]!
            return question.prompt + " " + question.options.filter { values.contains($0.id) }.map(\.label).joined(separator: "; ")
        }
        let sourceTopics = matches.isEmpty ? library.topics(for: input.regionId) : matches.map(\.topic)
        return .init(regionId: input.regionId, disposition: "educational", summary: summary, nextStep: nextStep,
                     reasons: ["No listed warning signs were selected. This does not mean the symptoms are safe."],
                     matches: matches, sourceIds: Array(Set(sourceTopics.flatMap(\.sourceIds))).sorted(),
                     answerSummary: answerSummary, limitations: limitations)
    }
}
