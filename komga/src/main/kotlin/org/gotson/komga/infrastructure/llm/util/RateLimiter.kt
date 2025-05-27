package org.gotson.komga.infrastructure.llm.util

import mu.KotlinLogging
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds
import kotlin.time.TimeMark
import kotlin.time.TimeSource

private val logger = KotlinLogging.logger {}

/**
 * A rate limiter that limits the number of operations that can be performed within a given time window.
 *
 * This implementation is thread-safe and uses a sliding window algorithm to enforce rate limits.
 * It's designed to be simple and efficient, with minimal overhead.
 *
 * @property maxRequests The maximum number of requests allowed in the time window
 * @property timeWindow The duration of the time window
 * @property clock The time source used for measuring time (can be replaced for testing)
 */
class RateLimiter(
    private val maxRequests: Int,
    private val timeWindow: Duration = 1.seconds,
    private val clock: TimeSource = TimeSource.Monotonic
) {
    private data class RequestCounter(
        val count: AtomicInteger = AtomicInteger(0),
        var windowStart: TimeMark = clock.markNow()
    )

    private val lock = ReentrantLock()
    private val counters = ConcurrentHashMap<String, RequestCounter>()

    /**
     * Tries to acquire a permit to perform an operation.
     *
     * @param key A key to identify the rate limit bucket (e.g., user ID or IP address)
     * @return `true` if the operation is allowed, `false` if rate limited
     */
    fun tryAcquire(key: String = "default"): Boolean {
        val now = clock.markNow()
        val counter = counters.computeIfAbsent(key) { RequestCounter() }

        return lock.withLock {
            // Reset the counter if the time window has passed
            if (now - counter.windowStart >= timeWindow) {
                counter.count.set(0)
                counter.windowStart = now
            }

            // Check if we can increment the counter
            if (counter.count.get() < maxRequests) {
                counter.count.incrementAndGet()
                true
            } else {
                false
            }
        }
    }

    /**
     * Executes the block if a permit is available, or throws an exception if rate limited.
     *
     * @param key A key to identify the rate limit bucket
     * @param block The block of code to execute if not rate limited
     * @return The result of the block
     * @throws RateLimitExceededException if rate limited
     */
    @Throws(RateLimitExceededException::class)
    suspend fun <T> withRateLimit(key: String = "default", block: suspend () -> T): T {
        if (!tryAcquire(key)) {
            throw RateLimitExceededException("Rate limit exceeded: $maxRequests requests per $timeWindow")
        }
        return block()
    }

    /**
     * Gets the number of remaining requests in the current time window.
     *
     * @param key The rate limit bucket key
     * @return The number of remaining requests, or 0 if the key doesn't exist
     */
    fun getRemainingRequests(key: String = "default"): Int {
        val counter = counters[key] ?: return maxRequests
        val now = clock.markNow()

        return lock.withLock {
            if (now - counter.windowStart >= timeWindow) {
                maxRequests
            } else {
                (maxRequests - counter.count.get()).coerceAtLeast(0)
            }
        }
    }

    /**
     * Gets the time until the next request would be allowed.
     *
     * @param key The rate limit bucket key
     * @return The duration until the next request would be allowed, or Duration.ZERO if requests are allowed
     */
    fun getTimeUntilNextRequest(key: String = "default"): Duration {
        val counter = counters[key] ?: return Duration.ZERO
        val now = clock.markNow()
        val elapsed = now - counter.windowStart

        return lock.withLock {
            if (elapsed >= timeWindow) {
                Duration.ZERO
            } else if (counter.count.get() < maxRequests) {
                Duration.ZERO
            } else {
                timeWindow - elapsed
            }
        }
    }

    /**
     * Cleans up expired rate limit counters to prevent memory leaks.
     * This should be called periodically from a background task.
     *
     * @param maxAge The maximum age of a counter before it's considered expired
     */
    fun cleanupExpiredCounters(maxAge: Duration = 1.hours) {
        val now = clock.markNow()
        val expiredKeys = mutableListOf<String>()

        // Find expired counters
        counters.forEach { (key, counter) ->
            if (now - counter.windowStart >= maxAge) {
                expiredKeys.add(key)
            }
        }

        // Remove expired counters
        if (expiredKeys.isNotEmpty()) {
            lock.withLock {
                expiredKeys.forEach { counters.remove(it) }
            }
            logger.debug { "Cleaned up ${expiredKeys.size} expired rate limit counters" }
        }
    }

    companion object {
        /**
         * Creates a rate limiter with requests per minute.
         *
         * @param requestsPerMinute The maximum number of requests per minute
         * @return A new RateLimiter instance
         */
        fun perMinute(requestsPerMinute: Int): RateLimiter {
            return RateLimiter(requestsPerMinute, 1.minutes)
        }

        /**
         * Creates a rate limiter with requests per second.
         *
         * @param requestsPerSecond The maximum number of requests per second
         * @return A new RateLimiter instance
         */
        fun perSecond(requestsPerSecond: Int): RateLimiter {
            return RateLimiter(requestsPerSecond, 1.seconds)
        }
    }
}

/**
 * Exception thrown when a rate limit is exceeded.
 */
class RateLimitExceededException(
    message: String,
    val retryAfter: Duration? = null,
    cause: Throwable? = null
) : Exception(message, cause)

/**
 * Converts an integer number of minutes to a Duration.
 */
val Int.minutes: Duration get() = Duration.ofMinutes(this.toLong())

/**
 * Converts an integer number of hours to a Duration.
 */
val Int.hours: Duration get() = Duration.ofHours(this.toLong())
