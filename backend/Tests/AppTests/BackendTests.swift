import Foundation
import XCTVapor
@testable import App

final class BackendTests: XCTestCase, @unchecked Sendable {
    private var contentDirectory: URL {
        URL(fileURLWithPath: #filePath).deletingLastPathComponent()
            .deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().appendingPathComponent("content")
    }

    private func withApp(limit: Int = 20, _ body: (Application) async throws -> Void) async throws {
        let app = try await Application.make(.testing)
        do {
            try configure(app, configuration: .init(contentDirectory: contentDirectory, guidanceLimit: limit))
            try await body(app)
            try await app.asyncShutdown()
        } catch {
            try? await app.asyncShutdown()
            throw error
        }
    }

    private func screening(chest: ScreeningAnswer = .no, back: ScreeningAnswer = .no,
                           unable: ScreeningAnswer = .no) -> SafetyScreening {
        .init(chestPain: chest, seriousAccident: .no, backNeurologicalSymptoms: back,
              lossOfSensation: .no, unableToUseLimb: unable, feverWithHotSwollenJoint: .no,
              deformity: .no, suddenSeverePain: .no)
    }

    func testHealthRegionsAndSources() async throws {
        try await withApp { app in
            try await app.test(.GET, "/api/health") { response in
                XCTAssertEqual(response.status, .ok)
                XCTAssertEqual(response.headers.first(name: "Cache-Control"), "no-store")
                XCTAssertNotNil(response.headers.first(name: "X-Request-ID"))
            }
            try await app.test(.GET, "/api/ready") { response in
                XCTAssertEqual(response.status, .ok)
                XCTAssertTrue(response.body.string.contains("\"aiEnabled\":false"))
            }
            try await app.test(.GET, "/api/regions") { response in
                let regions = try response.content.decode([BodyRegion].self)
                XCTAssertEqual(regions.count, 11)
            }
            try await app.test(.GET, "/api/sources/nhs-knee") { response in
                XCTAssertEqual(try response.content.decode(HealthSource.self).publisher, "NHS")
            }
        }
    }

    func testTopicsAreLinkedToCorrectRegionAndSearchIsPaginated() async throws {
        try await withApp { app in
            try await app.test(.GET, "/api/regions/right_knee/topics") { response in
                let topics = try response.content.decode([Topic].self)
                XCTAssertEqual(topics.count, 2)
                XCTAssertTrue(topics.allSatisfy { $0.regionIds.contains("right_knee") })
                XCTAssertTrue(topics.allSatisfy { !$0.sourceIds.isEmpty })
            }
            try await app.test(.GET, "/api/topics?regionId=right_knee&limit=1&offset=1") { response in
                let page = try response.content.decode(TopicPage.self)
                XCTAssertEqual(page.total, 2)
                XCTAssertEqual(page.items.count, 1)
                XCTAssertEqual(page.offset, 1)
            }
            try await app.test(.GET, "/api/topics?q=gripping") { response in
                let page = try response.content.decode(TopicPage.self)
                XCTAssertGreaterThan(page.total, 0)
                XCTAssertLessThan(page.total, 12)
            }
            try await app.test(.GET, "/api/topics?offset=99999") { response in
                XCTAssertTrue(try response.content.decode(TopicPage.self).items.isEmpty)
            }
        }
    }

    func testInvalidPathsAndQueriesReturnJSONErrors() async throws {
        try await withApp { app in
            for path in ["/api/regions/missing", "/api/regions/missing/topics", "/api/topics/missing",
                         "/api/sources/missing", "/api/missing"] {
                try await app.test(.GET, path) { response in
                    XCTAssertEqual(response.status, .notFound)
                    XCTAssertTrue(try response.content.decode(ErrorBody.self).error)
                }
            }
            for path in ["/api/topics?limit=0", "/api/topics?offset=-1", "/api/topics?limit=abc",
                         "/api/topics?regionId=missing"] {
                try await app.test(.GET, path) { response in XCTAssertEqual(response.status, .badRequest) }
            }
        }
    }

    func testGuidanceWithoutScreeningRequestsInformation() async throws {
        try await withApp { app in
            try await app.test(.POST, "/api/guidance", beforeRequest: { request in
                try request.content.encode(GuidanceInput(regionId: "right_knee", description: "Pain after running"))
            }, afterResponse: { response in
                XCTAssertEqual(response.status, .ok)
                let guidance = try response.content.decode(GuidanceResponse.self)
                XCTAssertEqual(guidance.disposition, "needs_more_information")
                XCTAssertFalse(guidance.aiEnabled)
                XCTAssertTrue(guidance.topics.isEmpty)
                XCTAssertTrue(guidance.generalCare.isEmpty)
                XCTAssertFalse(guidance.followUpQuestions.isEmpty)
            })
        }
    }

    func testEducationalGuidanceDoesNotClaimToDiagnose() async throws {
        let answers = screening()
        try await withApp { app in
            try await app.test(.POST, "/api/guidance", beforeRequest: { request in
                try request.content.encode(GuidanceInput(regionId: "right_knee", description: "Pain after running", screening: answers))
            }, afterResponse: { response in
                let guidance = try response.content.decode(GuidanceResponse.self)
                XCTAssertEqual(guidance.mode, "educational")
                XCTAssertEqual(guidance.disposition, "not_assessed")
                XCTAssertEqual(guidance.topics.count, 2)
                XCTAssertEqual(guidance.sourceIds, ["nhs-knee"])
                XCTAssertFalse(guidance.aiEnabled)
                XCTAssertTrue(guidance.limitations.contains { $0.contains("not medically interpreted") })
            })
        }
    }

    func testEmergencySignsSuppressLibraryCare() async throws {
        let answers = screening(chest: .yes)
        try await withApp { app in
            try await app.test(.POST, "/api/guidance", beforeRequest: { request in
                try request.content.encode(GuidanceInput(regionId: "right_knee", description: "Pain", screening: answers))
            }, afterResponse: { response in
                let guidance = try response.content.decode(GuidanceResponse.self)
                XCTAssertEqual(guidance.disposition, "emergency")
                XCTAssertTrue(guidance.topics.isEmpty)
                XCTAssertTrue(guidance.generalCare.isEmpty)
                XCTAssertTrue(guidance.sourceIds.contains("nhs-chest"))
            })
        }
    }

    func testUncertaintyAndHighIntensityDoNotReturnRoutineCare() async throws {
        let service = EducationalGuidanceService(library: try ContentLibrary(directory: contentDirectory))
        let unsure = try await service.guidance(for: .init(regionId: "right_knee", description: "Pain", screening: screening(unable: .unsure)))
        XCTAssertEqual(unsure.disposition, "urgent")
        XCTAssertTrue(unsure.generalCare.isEmpty)
        let severe = try await service.guidance(for: .init(regionId: "right_knee", description: "Pain", painIntensity: 10))
        XCTAssertEqual(severe.disposition, "urgent")
        let neuro = try await service.guidance(for: .init(regionId: "lower_back", description: "Pain", screening: screening(back: .yes)))
        XCTAssertEqual(neuro.disposition, "emergency")
    }

    func testInvalidGuidanceAndMalformedJSON() async throws {
        try await withApp { app in
            let invalid = [
                GuidanceInput(regionId: "unknown", description: "Pain"),
                GuidanceInput(regionId: "right_knee", description: "   "),
                GuidanceInput(regionId: "right_knee", description: String(repeating: "a", count: 2001)),
                GuidanceInput(regionId: "right_knee", description: "Pain", durationDays: -1),
                GuidanceInput(regionId: "right_knee", description: "Pain", painIntensity: 11),
                GuidanceInput(regionId: "right_knee", description: "Pain", activity: String(repeating: "a", count: 201))
            ]
            for input in invalid {
                try await app.test(.POST, "/api/guidance", beforeRequest: { request in
                    try request.content.encode(input)
                }, afterResponse: { response in
                    XCTAssertEqual(response.status, .badRequest)
                    XCTAssertTrue(try response.content.decode(ErrorBody.self).error)
                })
            }
            try await app.test(.POST, "/api/guidance",
                               headers: ["Content-Type": "application/json"], body: ByteBuffer(string: "{bad")) { response in
                XCTAssertEqual(response.status, .badRequest)
                XCTAssertFalse(response.body.string.contains("{bad"))
            }
            try await app.test(.POST, "/api/guidance", body: ByteBuffer(string: "text")) { response in
                XCTAssertEqual(response.status, .unsupportedMediaType)
            }
            try await app.test(.POST, "/api/guidance", headers: ["Content-Type": "application/json"],
                               body: ByteBuffer(string: String(repeating: "x", count: 17000))) { response in
                XCTAssertEqual(response.status, .payloadTooLarge)
            }
            try await app.test(.POST, "/api/guidance",
                               headers: ["Content-Type": "application/json"], body: ByteBuffer(string: "{\"regionId\":\"right_knee\",\"description\":\"Pain\",\"screening\":{}}")) { response in
                XCTAssertEqual(response.status, .badRequest)
            }
        }
    }

    func testRateLimitAndRetryHeader() async throws {
        try await withApp(limit: 1) { app in
            let input = GuidanceInput(regionId: "right_knee", description: "Pain")
            try await app.test(.POST, "/api/guidance", beforeRequest: { request in
                try request.content.encode(input)
            }, afterResponse: { response in XCTAssertEqual(response.status, .ok) })
            try await app.test(.POST, "/api/guidance", beforeRequest: { request in
                try request.content.encode(input)
            }, afterResponse: { response in
                XCTAssertEqual(response.status, .tooManyRequests)
                XCTAssertNotNil(response.headers.first(name: "Retry-After"))
            })
        }
    }

    func testRateLimiterExpiresAndSeparatesClients() async {
        let limiter = RateLimiter(limit: 1, windowSeconds: 60, capacity: 2)
        let first = await limiter.consume(key: "a", now: 0)
        let denied = await limiter.consume(key: "a", now: 1)
        let separate = await limiter.consume(key: "b", now: 1)
        let capacity = await limiter.consume(key: "c", now: 2)
        let expired = await limiter.consume(key: "a", now: 60)
        XCTAssertNil(first)
        XCTAssertEqual(denied, 59)
        XCTAssertNil(separate)
        XCTAssertNotNil(capacity)
        XCTAssertNil(expired)
    }

    func testCORSAllowsConfiguredOriginOnly() async throws {
        try await withApp { app in
            try await app.test(.OPTIONS, "/api/guidance", headers: [
                "Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"
            ]) { response in
                XCTAssertEqual(response.headers.first(name: "Access-Control-Allow-Origin"), "http://localhost:5173")
            }
            try await app.test(.GET, "/api/regions", headers: ["Origin": "https://untrusted.example"]) { response in
                XCTAssertNil(response.headers.first(name: "Access-Control-Allow-Origin"))
            }
        }
    }

    func testContentValidationRejectsDuplicatesAndMissingSources() throws {
        let library = try ContentLibrary(directory: contentDirectory)
        XCTAssertThrowsError(try ContentLibrary(topics: library.topics + [library.topics[0]], sources: library.sources))
        XCTAssertThrowsError(try ContentLibrary(topics: library.topics, sources: []))
        XCTAssertThrowsError(try ContentLibrary(topics: library.topics, sources: library.sources.filter { $0.id != "nhs-knee" }))
        XCTAssertThrowsError(try ContentLibrary(topics: library.topics, sources: library.sources.filter { $0.id != "nhs-chest" }))
        XCTAssertThrowsError(try ContentLibrary(topics: [], sources: library.sources))
    }

    func testEveryWarningSignSuppressesRoutineCare() async throws {
        let service = EducationalGuidanceService(library: try ContentLibrary(directory: contentDirectory))
        let fields = SafetyScreeningService.questions.map(\.id)
        let emergencies: Set<String> = ["chestPain", "seriousAccident", "backNeurologicalSymptoms", "lossOfSensation", "deformity"]
        for field in fields {
            for answer in ["yes", "unsure"] {
                var raw = Dictionary(uniqueKeysWithValues: fields.map { ($0, "no") })
                raw[field] = answer
                let answers = try JSONDecoder().decode(SafetyScreening.self, from: JSONEncoder().encode(raw))
                let result = try await service.guidance(for: .init(regionId: "lower_back", description: "Symptoms", screening: answers))
                XCTAssertEqual(result.disposition, answer == "yes" && emergencies.contains(field) ? "emergency" : "urgent", field)
                XCTAssertTrue(result.generalCare.isEmpty, field)
                XCTAssertTrue(result.topics.isEmpty, field)
                XCTAssertFalse(result.sourceIds.isEmpty, field)
            }
        }
    }

    func testMissingContentFailsStartup() async throws {
        let app = try await Application.make(.testing)
        XCTAssertThrowsError(try configure(app, configuration: .init(contentDirectory: contentDirectory.appendingPathComponent("missing"))))
        try await app.asyncShutdown()
    }
}

