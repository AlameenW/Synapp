import Vapor

struct Topic: Content {
    let id: String
    let regionIds: [String]
    let title: String
    let overview: String
    let sourceIds: [String]
}

