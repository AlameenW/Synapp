import Foundation

struct ScreeningResult: Sendable {
    let disposition: String
    let reasons: [String]
    let sourceIds: [String]
}

struct SafetyScreeningService: Sendable {
    static let questions: [ScreeningQuestion] = [
        .init(id: "chestPain", prompt: "Do you have sudden ongoing chest discomfort, pain spreading to your arm/jaw/back, or chest pain with sweating, sickness or shortness of breath?", appliesTo: "all"),
        .init(id: "seriousAccident", prompt: "Did this begin after a serious accident, such as a car crash or major fall?", appliesTo: "all"),
        .init(id: "backNeurologicalSymptoms", prompt: "With back pain, do you have new symptoms in both legs, numbness around your groin, or bladder/bowel changes?", appliesTo: "lower_back"),
        .init(id: "lossOfSensation", prompt: "Has the injured area become numb, blue/grey or cold, or have you lost feeling?", appliesTo: "all"),
        .init(id: "unableToUseLimb", prompt: "Are you unable to bear weight, walk, or use or move the affected limb?", appliesTo: "all"),
        .init(id: "feverWithHotSwollenJoint", prompt: "Do you feel feverish or unwell with a hot, swollen or red joint?", appliesTo: "all"),
        .init(id: "deformity", prompt: "Has the injured area changed shape or become angled abnormally?", appliesTo: "all"),
        .init(id: "suddenSeverePain", prompt: "Is the pain sudden and severe or worsening rapidly?", appliesTo: "all")
    ]

    func evaluate(_ input: GuidanceInput) -> ScreeningResult {
        guard let screening = input.screening else {
            if let intensity = input.painIntensity, intensity >= 8 {
                return .init(disposition: "urgent", reasons: ["Severe pain was reported."],
                             sourceIds: ["nhs-sprains"])
            }
            return .init(disposition: "needs_more_information",
                         reasons: ["The safety questions have not been answered."], sourceIds: [])
        }
        let emergency: [(ScreeningAnswer, String, String)] = [
            (screening.chestPain, "Concerning chest symptoms were reported.", "nhs-chest"),
            (screening.seriousAccident, "A serious accident was reported.", "nhs-back"),
            (screening.backNeurologicalSymptoms, "Neurological or bladder/bowel warning signs were reported.", "nhs-back"),
            (screening.lossOfSensation, "Loss of feeling or circulation changes were reported.", "nhs-sprains"),
            (screening.deformity, "A visible change in the injured area's shape was reported.", "nhs-sprains")
        ]
        let confirmed = emergency.filter { $0.0 == .yes }
        if !confirmed.isEmpty {
            return .init(disposition: "emergency", reasons: confirmed.map { $0.1 },
                         sourceIds: Array(Set(confirmed.map { $0.2 })).sorted())
        }
        let urgent: [(ScreeningAnswer, String, String)] = [
            (screening.unableToUseLimb, "Difficulty using the affected limb was reported.", "nhs-sprains"),
            (screening.feverWithHotSwollenJoint, "Fever with a hot or swollen joint was reported.", "nhs-knee"),
            (screening.suddenSeverePain, "Sudden severe or rapidly worsening pain was reported.", "nhs-back")
        ]
        var reasons = urgent.filter { $0.0 != .no }.map { $0.1 }
        var sources = urgent.filter { $0.0 != .no }.map { $0.2 }
        if emergency.contains(where: { $0.0 == .unsure }) {
            reasons.append("You were unsure about a warning sign; seek human assessment.")
            sources += emergency.filter { $0.0 == .unsure }.map { $0.2 }
        }
        if let intensity = input.painIntensity, intensity >= 8 {
            reasons.append("Severe pain was reported.")
            sources.append("nhs-sprains")
        }
        if !reasons.isEmpty {
            return .init(disposition: "urgent", reasons: reasons, sourceIds: Array(Set(sources)).sorted())
        }
        return .init(disposition: "not_assessed",
                     reasons: ["No listed warning signs were selected; this does not rule out injury or illness."],
                     sourceIds: [])
    }
}

