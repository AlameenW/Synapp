import Vapor

struct APIError: Error, Sendable {
    let status: HTTPResponseStatus
    let code: String
    let reason: String
    let retryAfter: Int?

    init(_ status: HTTPResponseStatus, _ code: String, _ reason: String, retryAfter: Int? = nil) {
        self.status = status
        self.code = code
        self.reason = reason
        self.retryAfter = retryAfter
    }
}

struct ErrorBody: Content {
    let error: Bool
    let code: String
    let reason: String
    let requestId: String
}

