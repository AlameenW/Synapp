import Vapor

struct BodyRegion: Content, Equatable {
    let id: String
    let name: String
    let side: String

    // Keep aligned with content/body-areas.json; validate-content checks parity.
    static let pairedAreas = ["chest", "shoulder", "upper_arm", "elbow", "forearm", "wrist", "hand", "hip", "glute", "thigh", "hamstring", "knee", "shin", "calf", "ankle", "foot"]
    static let midlineAreas = ["head", "neck", "abdomen", "upper_back", "lower_back"]

    static let all: [BodyRegion] = pairedAreas.flatMap { region in
        ["left", "right"].map { side in
            let label = region == "thigh" ? "front thigh" : region.replacingOccurrences(of: "_", with: " ")
            return BodyRegion(id: "\(side)_\(region)", name: "\(side.capitalized) \(label)", side: side)
        }
    } + midlineAreas.map { region in
        let label = region.replacingOccurrences(of: "_", with: " ")
        return BodyRegion(id: region, name: label.prefix(1).uppercased() + label.dropFirst(), side: "midline")
    }
}
