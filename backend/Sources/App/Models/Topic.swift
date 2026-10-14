import Vapor

struct Topic: Content, Equatable {
    let id: String
    let regionIds: [String]
    let title: String
    let overview: String
    let symptoms: [String]
    let commonness: String
    let generalCare: [String]
    let whenToSeekHelp: [String]
    let sourceIds: [String]
    let contentStatus: String
}

struct HealthSource: Content, Equatable {
    let id: String
    let title: String
    let publisher: String
    let url: String
    let accessedOn: String
}

struct TopicPage: Content {
    let items: [Topic]
    let total: Int
    let limit: Int
    let offset: Int
}

