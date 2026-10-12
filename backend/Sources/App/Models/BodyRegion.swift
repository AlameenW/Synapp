import Vapor

struct BodyRegion: Content, Equatable {
    let id: String
    let name: String
    let side: String

    static let all: [BodyRegion] = [
        "shoulder", "elbow", "wrist", "knee", "ankle"
    ].flatMap { region in
        ["left", "right"].map { side in
            BodyRegion(id: "\(side)_\(region)", name: "\(side.capitalized) \(region)", side: side)
        }
    } + [BodyRegion(id: "lower_back", name: "Lower back", side: "midline")]
}

