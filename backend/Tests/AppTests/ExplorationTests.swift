import Foundation
import XCTVapor
@testable import App

final class ExplorationTests: XCTestCase, @unchecked Sendable {
    private var directory: URL {
        URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("content")
    }
    private func service() throws -> ExplorationService { try .init(library: ContentLibrary(directory: directory)) }
    private func answers(_ config: ExplorationQuestions, pattern: [String] = ["other"], overrides: [String: [String]] = [:]) -> [String: [String]] {
        var choices: [String: [String]] = ["pattern": pattern]
        let defaults = ["onset": "no_clear_event", "duration": "days", "trend": "improving", "impact": "manageable"]
        for question in config.profile.questions where question.id != "pattern" {
            guard config.profile.activeQuestions(answers: choices).contains(where: { $0.id == question.id }) else { continue }
            choices[question.id] = overrides[question.id] ?? [defaults[question.id] ?? "unsure"]
        }
        return choices
    }

    func testEveryRegionHasQuestionsAndUncertainPatternsDoNotInventMatches() throws {
        let service = try service()
        for region in BodyRegion.all {
            let config = try service.questions(for: region.id)
            XCTAssertGreaterThan(config.profile.questions.count, 5)
            XCTAssertEqual(config.profile.activeQuestions(answers: ["pattern": ["other"]]).count, 5)
            XCTAssertFalse(config.warningSigns.isEmpty)
            let result = try service.explore(.init(regionId: region.id, warningStatus: "none", warningSigns: [], answers: answers(config)))
            XCTAssertEqual(result.disposition, "educational")
            XCTAssertTrue(result.matches.isEmpty, region.id)
            XCTAssertFalse(result.sourceIds.isEmpty)
            XCTAssertTrue(result.reasons.joined().contains("does not mean"))
            XCTAssertFalse(result.limitations.isEmpty)
            XCTAssertFalse(result.nextStep.contains("immediately"))
        }
    }

    func testDifferentKneePatternsSuggestDifferentReadingWithReasons() throws {
        let service = try service(), config = try service.questions(for: "right_knee")
        let front = try service.explore(.init(regionId: "right_knee", warningStatus: "none", warningSigns: [], answers: answers(config, pattern: ["front_knee_load"])))
        XCTAssertEqual(front.matches.map { $0.topic.id }, ["patellofemoral-pain"])
        XCTAssertFalse(front.matches[0].matchedAnswers.isEmpty)
        let twist = try service.explore(.init(regionId: "right_knee", warningStatus: "none", warningSigns: [], answers: answers(config, pattern: ["knee_twist"])))
        XCTAssertEqual(twist.matches.map { $0.topic.id }, ["meniscus-tear"])
        XCTAssertTrue(twist.matches.allSatisfy { $0.topic.regionIds.contains("right_knee") })
        XCTAssertTrue(twist.summary.contains("not a diagnosis"))
        XCTAssertEqual(twist.matches[0].fit, "possible")
    }

    func testFollowupsNarrowMatchesAndNegativeAnswersRemainVisible() throws {
        let service = try service(), config = try service.questions(for: "right_knee")
        let choices = answers(config, pattern: ["knee_twist"], overrides: ["knee_swelling": ["yes"], "knee_catch": ["yes"]])
        XCTAssertFalse(choices.keys.contains("knee_stairs"))
        let result = try service.explore(.init(regionId: "right_knee", warningStatus: "none", warningSigns: [], answers: choices))
        XCTAssertEqual(result.matches.first?.topic.id, "meniscus-tear")
        XCTAssertEqual(result.matches.first?.fit, "closer")
        XCTAssertEqual(result.matches.first?.matchedAnswers.count, 3)
        var negative = choices; negative["knee_catch"] = ["no"]
        let changed = try service.explore(.init(regionId: "right_knee", warningStatus: "none", warningSigns: [], answers: negative))
        XCTAssertEqual(changed.matches.first?.fit, "possible")
        XCTAssertEqual(changed.matches.first?.lessTypicalAnswers.count, 1)
        XCTAssertTrue(changed.nextStep.contains("routine appointment"))
    }

    func testMixedWristSymptomsAreReorderedByTheFollowupAnswers() throws {
        let service = try service(), config = try service.questions(for: "left_wrist")
        let patterns = ["wrist_twist", "tingling_fingers"]
        for (injury, fingers, night, expected) in [("yes", "other_fingers", "no", "wrist-sprain"), ("no", "median", "yes", "carpal-tunnel")] {
            let choices = answers(config, pattern: patterns, overrides: ["wrist_swelling": [injury], "wrist_move": [injury], "finger_distribution": [fingers], "tingling_night": [night]])
            let result = try service.explore(.init(regionId: "left_wrist", warningStatus: "none", warningSigns: [], answers: choices))
            XCTAssertEqual(result.matches.count, 2)
            XCTAssertEqual(result.matches.first?.topic.id, expected)
            XCTAssertEqual(result.matches.first?.fit, "closer")
            XCTAssertEqual(result.matches.last?.fit, "possible")
        }
    }

    func testOverlappingHipPatternsKeepEqualLabelsInsteadOfInventingCertainty() throws {
        let service = try service(), config = try service.questions(for: "left_hip")
        let choices = answers(config, pattern: ["outer_hip"], overrides: ["hip_side": ["yes"], "hip_lying": ["yes"], "hip_stairs": ["yes"]])
        let result = try service.explore(.init(regionId: "left_hip", warningStatus: "none", warningSigns: [], answers: choices))
        XCTAssertEqual(Set(result.matches.map { $0.topic.id }), ["gluteal-tendon", "hip-bursitis"])
        XCTAssertTrue(result.matches.allSatisfy { $0.fit == "closer" && $0.matchedAnswers.count == 3 })
    }

    func testNestedBranchesAndStaleAnswersAreValidated() throws {
        let service = try service(), config = try service.questions(for: "left_shoulder")
        let yes = answers(config, pattern: ["restricted_shoulder"], overrides: ["shoulder_stiff": ["yes"], "shoulder_slow": ["yes"]])
        XCTAssertNotNil(yes["shoulder_slow"])
        var no = yes; no["shoulder_stiff"] = ["no"]
        XCTAssertFalse(config.profile.activeQuestions(answers: no).contains(where: { $0.id == "shoulder_slow" }))
        XCTAssertThrowsError(try service.explore(.init(regionId: "left_shoulder", warningStatus: "none", warningSigns: [], answers: no)))
        no.removeValue(forKey: "shoulder_slow")
        let result = try service.explore(.init(regionId: "left_shoulder", warningStatus: "none", warningSigns: [], answers: no))
        XCTAssertEqual(result.matches.first?.fit, "possible")
        let unknown = answers(config, overrides: ["duration": ["persistent"]])
        XCTAssertTrue(try service.explore(.init(regionId: "left_shoulder", warningStatus: "none", warningSigns: [], answers: unknown)).matches.isEmpty)
    }

    func testAllApplicableWarningsOverrideEvenCompleteAnswers() throws {
        let service = try service()
        for region in BodyRegion.all {
            let config = try service.questions(for: region.id)
            for warning in config.warningSigns {
                let result = try service.explore(.init(regionId: region.id, warningStatus: "selected", warningSigns: [warning.id], answers: answers(config)))
                XCTAssertEqual(result.disposition, warning.level, region.id + warning.id)
                XCTAssertTrue(result.matches.isEmpty)
                XCTAssertFalse(result.sourceIds.isEmpty)
            }
        }
        let urgent = try service.explore(.init(regionId: "right_knee", warningStatus: "unsure", warningSigns: [], answers: [:]))
        XCTAssertEqual(urgent.disposition, "urgent")
        XCTAssertTrue(urgent.matches.isEmpty)
        let emergency = try service.explore(.init(regionId: "right_knee", warningStatus: "selected", warningSigns: ["sudden_severe", "chest_breathing"], answers: [:]))
        XCTAssertEqual(emergency.disposition, "emergency")
    }

    func testInvalidOrMissingChoicesCannotPassAsNoWarningSigns() throws {
        let service = try service(), config = try service.questions(for: "right_knee")
        let base = answers(config)
        let invalid: [ExplorationInput] = [
            .init(regionId: "missing", warningStatus: "none", warningSigns: [], answers: base),
            .init(regionId: "right_knee", warningStatus: "none", warningSigns: ["function"], answers: base),
            .init(regionId: "right_knee", warningStatus: "selected", warningSigns: [], answers: base),
            .init(regionId: "right_knee", warningStatus: "selected", warningSigns: ["head_injury"], answers: base),
            .init(regionId: "right_knee", warningStatus: "none", warningSigns: [], answers: [:])
        ]
        for input in invalid { XCTAssertThrowsError(try service.explore(input)) }
        for pattern in [["other", "knee_twist"], ["knee_twist", "knee_twist"], ["tingling_fingers"]] {
            XCTAssertThrowsError(try service.explore(.init(regionId: "right_knee", warningStatus: "none", warningSigns: [], answers: answers(config, pattern: pattern))))
        }
    }

    func testWorseningSymptomsAndUnexplainedChestPainGetAssessmentNextSteps() throws {
        let service = try service(), config = try service.questions(for: "right_knee")
        var choices = answers(config, pattern: ["front_knee_load"])
        choices["trend"] = ["worsening"]
        let knee = try service.explore(.init(regionId: "right_knee", warningStatus: "none", warningSigns: [], answers: choices))
        XCTAssertTrue(knee.nextStep.contains("routine appointment"))
        XCTAssertEqual(knee.disposition, "educational")
        let chestConfig = try service.questions(for: "left_chest")
        let chest = try service.explore(.init(regionId: "left_chest", warningStatus: "none", warningSigns: [], answers: answers(chestConfig, pattern: ["chest_activity"])))
        XCTAssertTrue(chest.nextStep.contains("medical advice"))
    }

    func testCatalogRejectsMissingProfilesAndDanglingTags() throws {
        let library = try ContentLibrary(directory: directory), catalog = library.exploration!
        let missing = ExplorationCatalog(version: 2, warningSigns: catalog.warningSigns, profiles: [])
        XCTAssertThrowsError(try missing.validated(topics: library.topics, sources: library.sources))
        var topics = library.topics
        topics[0].explorationTags = ["invented-pattern"]
        XCTAssertThrowsError(try catalog.validated(topics: topics, sources: library.sources))
    }

    func testExplorationRoutesAndJSONValidation() async throws {
        let app = try await Application.make(.testing)
        do {
            try configure(app, configuration: .init(contentDirectory: directory))
            try await app.test(.GET, "/api/regions/right_knee/exploration") { response async throws in
                XCTAssertEqual(response.status, .ok)
                XCTAssertGreaterThan(try response.content.decode(ExplorationQuestions.self).profile.questions.count, 5)
            }
            let config = try service().questions(for: "right_knee")
            let input = ExplorationInput(regionId: "right_knee", warningStatus: "none", warningSigns: [], answers: answers(config, pattern: ["front_knee_load"]))
            try await app.test(.POST, "/api/exploration", beforeRequest: { request async throws in
                try request.content.encode(input)
            }, afterResponse: { response async throws in
                XCTAssertEqual(response.status, .ok)
                XCTAssertEqual(try response.content.decode(ExplorationResponse.self).matches.first?.topic.id, "patellofemoral-pain")
            })
            try await app.test(.POST, "/api/exploration", headers: ["Content-Type": "text/plain"], body: ByteBuffer(string: "invalid")) { response async throws in
                XCTAssertEqual(response.status, .unsupportedMediaType)
            }
            try await app.asyncShutdown()
        } catch { try? await app.asyncShutdown(); throw error }
    }
}
