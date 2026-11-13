import Foundation
import Vapor

struct ExplorationOption: Content, Equatable {
    let id: String
    let label: String
}
struct ExplorationCondition: Content, Equatable {
    let questionId: String
    let optionIds: [String]

    func matches(_ answers: [String: [String]]) -> Bool {
        !Set(answers[questionId] ?? []).isDisjoint(with: optionIds)
    }
}
struct ExplorationQuestion: Content, Equatable {
    let id: String
    let prompt: String
    let multiple: Bool
    let options: [ExplorationOption]
    let when: ExplorationCondition?
}
struct ExplorationComparison: Content {
    let topicId: String
    let clues: [ExplorationCondition]
    let lessTypical: [ExplorationCondition]
}
struct ExplorationProfile: Content {
    let area: String
    let questions: [ExplorationQuestion]
    let comparisons: [ExplorationComparison]

    func activeQuestions(answers: [String: [String]]) -> [ExplorationQuestion] {
        var active: [ExplorationQuestion] = []
        for question in questions {
            if let condition = question.when {
                guard active.contains(where: { $0.id == condition.questionId }), condition.matches(answers) else { continue }
            }
            active.append(question)
        }
        return active
    }
}
struct ExplorationWarning: Content {
    let id: String
    let label: String
    let areas: [String]
    let level: String
    let action: String
    let sourceIds: [String]
}
struct ExplorationCatalog: Content {
    let version: Int
    let warningSigns: [ExplorationWarning]
    let profiles: [ExplorationProfile]

    func validated(topics: [Topic], sources: [HealthSource]) throws -> Self {
        let areas = Set(BodyRegion.pairedAreas + BodyRegion.midlineAreas)
        let sourceIds = Set(sources.map(\.id))
        guard version == 2, Set(profiles.map(\.area)) == areas,
              profiles.count == areas.count, !warningSigns.isEmpty,
              Set(warningSigns.map(\.id)).count == warningSigns.count else {
            throw ContentLibrary.ContentError.invalid("Invalid exploration profiles or duplicate warning signs.")
        }
        for warning in warningSigns {
            guard !warning.id.isEmpty, !warning.label.isEmpty, !warning.action.isEmpty,
                  ["urgent", "emergency"].contains(warning.level),
                  !warning.areas.isEmpty, Set(warning.areas).isSubset(of: areas.union(["*"])),
                  !warning.sourceIds.isEmpty, Set(warning.sourceIds).isSubset(of: sourceIds) else {
                throw ContentLibrary.ContentError.invalid("Invalid exploration warning: \(warning.id)")
            }
        }
        for profile in profiles {
            guard Set(["onset", "duration", "pattern", "trend", "impact"]).isSubset(of: Set(profile.questions.map(\.id))),
                  Set(profile.questions.map(\.id)).count == profile.questions.count,
                  profile.questions.first?.id == "pattern", profile.questions.contains(where: { $0.when != nil }),
                  !profile.comparisons.isEmpty, Set(profile.comparisons.map(\.topicId)).count == profile.comparisons.count else {
                throw ContentLibrary.ContentError.invalid("Incomplete exploration questions: \(profile.area)")
            }
            var previous: [String: Set<String>] = [:]
            for question in profile.questions {
                guard !question.prompt.isEmpty, (2...10).contains(question.options.count),
                      Set(question.options.map(\.id)).count == question.options.count,
                      question.options.allSatisfy({ !$0.id.isEmpty && !$0.label.isEmpty }),
                      question.multiple == (question.id == "pattern") else {
                    throw ContentLibrary.ContentError.invalid("Invalid exploration options: \(profile.area)")
                }
                if let condition = question.when {
                    guard let options = previous[condition.questionId], !condition.optionIds.isEmpty,
                          Set(condition.optionIds).isSubset(of: options) else {
                        throw ContentLibrary.ContentError.invalid("Invalid exploration branch: \(question.id)")
                    }
                }
                previous[question.id] = Set(question.options.map(\.id))
            }
            for comparison in profile.comparisons {
                guard let topic = topics.first(where: { $0.id == comparison.topicId }),
                      topic.regionIds.contains(where: { Self.area($0) == profile.area }),
                      !comparison.clues.isEmpty else {
                    throw ContentLibrary.ContentError.invalid("Invalid exploration comparison: \(comparison.topicId)")
                }
                for condition in comparison.clues + comparison.lessTypical {
                    guard let options = previous[condition.questionId], !condition.optionIds.isEmpty,
                          !condition.optionIds.contains("unsure"), !condition.optionIds.contains("other"),
                          Set(condition.optionIds).isSubset(of: options) else {
                        throw ContentLibrary.ContentError.invalid("Invalid comparison clue: \(comparison.topicId)")
                    }
                }
            }
        }
        for topic in topics {
            let topicAreas = Set(topic.regionIds.map(Self.area))
            let options = Set(profiles.filter { topicAreas.contains($0.area) }
                .flatMap { $0.questions.filter { $0.id == "pattern" }.flatMap { $0.options.map(\.id) } })
            guard Set(topic.explorationTags ?? []).isSubset(of: options.subtracting(["other"])) else {
                throw ContentLibrary.ContentError.invalid("Unknown exploration tag: \(topic.id)")
            }
        }
        return self
    }

    static func area(_ region: String) -> String {
        for prefix in ["left_", "right_"] where region.hasPrefix(prefix) { return String(region.dropFirst(prefix.count)) }
        return region
    }
    func warnings(for region: String) -> [ExplorationWarning] {
        warningSigns.filter { $0.areas.contains("*") || $0.areas.contains(Self.area(region)) }
    }
}

struct ExplorationInput: Content {
    let regionId: String
    let warningStatus: String
    let warningSigns: [String]
    let answers: [String: [String]]
}
struct ExplorationMatch: Content {
    let topic: Topic
    let matchedAnswers: [String]
    let lessTypicalAnswers: [String]
    let fit: String
}
struct ExplorationResponse: Content {
    let regionId: String
    let disposition: String
    let summary: String
    let nextStep: String
    let reasons: [String]
    let matches: [ExplorationMatch]
    let sourceIds: [String]
    let answerSummary: [String]
    let limitations: [String]
}
struct ExplorationQuestions: Content {
    let profile: ExplorationProfile
    let warningSigns: [ExplorationWarning]
}
