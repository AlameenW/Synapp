import Foundation

actor RateLimiter {
    struct Bucket: Sendable { var started: TimeInterval; var count: Int }
    private var buckets: [String: Bucket] = [:]
    let limit: Int
    let window: TimeInterval
    let capacity: Int

    init(limit: Int, windowSeconds: Int = 60, capacity: Int = 10_000) {
        self.limit = limit
        self.window = TimeInterval(windowSeconds)
        self.capacity = capacity
    }

    // Returns seconds until retry when denied. Monotonic time avoids clock adjustments.
    func consume(key: String, now: TimeInterval = ProcessInfo.processInfo.systemUptime) -> Int? {
        buckets = buckets.filter { now - $0.value.started < window }
        if var bucket = buckets[key] {
            let retry = max(1, Int(ceil(window - (now - bucket.started))))
            guard bucket.count < limit else { return retry }
            bucket.count += 1
            buckets[key] = bucket
        } else {
            guard buckets.count < capacity else { return Int(ceil(window)) }
            buckets[key] = .init(started: now, count: 1)
        }
        return nil
    }
}

