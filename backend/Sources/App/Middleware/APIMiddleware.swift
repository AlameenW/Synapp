import Foundation
import Vapor

struct APIMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: any AsyncResponder) async throws -> Response {
        let requestId = UUID().uuidString
        let response: Response
        do {
            response = try await next.respond(to: request)
        } catch {
            let status: HTTPResponseStatus
            let code: String
            let reason: String
            var retryAfter: Int?
            if let error = error as? APIError {
                status = error.status; code = error.code; reason = error.reason; retryAfter = error.retryAfter
            } else if error is DecodingError {
                status = .badRequest; code = "invalid_json"; reason = "The JSON body does not match the request schema."
            } else if let abort = error as? any AbortError {
                status = abort.status
                code = "http_\(status.code)"
                reason = status.code >= 500 ? "The service could not complete this request." : status.reasonPhrase
            } else {
                status = .internalServerError; code = "internal_error"; reason = "The service could not complete this request."
            }
            response = Response(status: status)
            try response.content.encode(ErrorBody(error: true, code: code, reason: reason, requestId: requestId))
            if let retryAfter { response.headers.replaceOrAdd(name: "Retry-After", value: String(retryAfter)) }
            // Never log the error text, URL query, request body or user-supplied headers.
            if status.code >= 500 { request.logger.error("API request failed", metadata: ["request_id": "\(requestId)"]) }
        }
        response.headers.replaceOrAdd(name: "X-Request-ID", value: requestId)
        response.headers.replaceOrAdd(name: "X-Content-Type-Options", value: "nosniff")
        response.headers.replaceOrAdd(name: "Cache-Control", value: "no-store")
        return response
    }
}

struct GuidanceRateLimitMiddleware: AsyncMiddleware {
    let limiter: RateLimiter
    var reason = "Too many guidance requests. Try again later."

    func respond(to request: Request, chainingTo next: any AsyncResponder) async throws -> Response {
        // Do not trust X-Forwarded-For from arbitrary callers.
        let key = request.remoteAddress?.ipAddress ?? "local"
        if let retryAfter = await limiter.consume(key: key) {
            throw APIError(.tooManyRequests, "rate_limited", reason, retryAfter: retryAfter)
        }
        return try await next.respond(to: request)
    }
}

