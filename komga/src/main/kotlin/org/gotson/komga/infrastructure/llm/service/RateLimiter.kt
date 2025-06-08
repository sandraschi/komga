package org.gotson.komga.infrastructure.llm.service

import mu.KotlinLogging
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import kotlin.math.max
import kotlin.math.min

private val logger = KotlinLogging.logger {}

/**
 * A rate limiter that enforces request limits for LLM API calls.
 * Supports both fixed and adaptive rate limiting.
 *
 * @property requestsPerMinute Maximum number of requests allowed per minute
 * @property maxConcurrent Maximum number of concurrent requests allowed
 * @property adaptive Whether to enable adaptive rate limiting
 */
class RateLimiter(
  private val requestsPerMinute: Int = 60,
  private val maxConcurrent: Int = 10,
  private val adaptive: Boolean = true,
) {
  private val requestTimestamps = ArrayDeque<Instant>()
  private val activeRequests = AtomicInteger(0)
  private val errorRates = ConcurrentHashMap<String, ErrorRateTracker>()

  // Adaptive rate limiting state
  private var currentRateLimit = requestsPerMinute
  private var lastAdjustment = Instant.now()
  private var consecutiveErrors = 0

  /**
   * Track an error for adaptive rate limiting
   */
  fun trackError(endpoint: String) {
    errorRates.computeIfAbsent(endpoint) { ErrorRateTracker() }.recordError()
    consecutiveErrors++

    if (adaptive && consecutiveErrors >= 3) {
      adjustRateLimit(false)
    }
  }

  /**
   * Track a successful request for adaptive rate limiting
   */
  fun trackSuccess(endpoint: String) {
    errorRates.computeIfAbsent(endpoint) { ErrorRateTracker() }.recordSuccess()

    if (consecutiveErrors > 0) {
      consecutiveErrors = 0
      if (adaptive) {
        // Gradually increase rate limit after recovery
        currentRateLimit = min(requestsPerMinute, (currentRateLimit * 1.1).toInt())
        logger.info { "Increased rate limit to $currentRateLimit requests/minute" }
      }
    }
  }

  /**
   * Acquire a permit for an API call
   * @param endpoint The API endpoint being called (for rate limiting)
   * @param timeout Maximum time to wait for a permit
   * @return true if permit was acquired, false if timed out
   */
  suspend fun acquirePermit(
    endpoint: String,
    timeout: Duration = Duration.ofSeconds(30),
  ): Boolean {
    val startTime = Instant.now()

    while (true) {
      // Check max concurrent requests
      if (activeRequests.get() >= maxConcurrent) {
        if (Instant.now().isAfter(startTime.plus(timeout))) {
          return false
        }
        kotlinx.coroutines.delay(100)
        continue
      }

      synchronized(this) {
        val now = Instant.now()

        // Clean up old timestamps (older than 1 minute)
        while (requestTimestamps.isNotEmpty() &&
          requestTimestamps.first().isBefore(now.minus(Duration.ofMinutes(1)))
        ) {
          requestTimestamps.removeFirst()
        }

        // Check rate limit
        if (requestTimestamps.size < currentRateLimit) {
          requestTimestamps.add(now)
          activeRequests.incrementAndGet()
          return true
        }

        // Calculate wait time
        val oldestAllowed = now.minus(Duration.ofMinutes(1))
        val nextAvailable =
          requestTimestamps
            .firstOrNull {
              it.isAfter(oldestAllowed)
            }?.plus(Duration.ofMinutes(1)) ?: now

        val waitMillis = Duration.between(now, nextAvailable).toMillis()
        if (waitMillis > 0) {
          if (Instant.now().plusMillis(waitMillis).isAfter(startTime.plus(timeout))) {
            return false
          }
          kotlinx.coroutines.delay(waitMillis)
        }
      }
    }
  }

  /**
   * Release a permit after API call is complete
   */
  fun releasePermit() {
    activeRequests.decrementAndGet()
  }

  /**
   * Execute a rate-limited operation
   */
  suspend fun <T> withRateLimit(
    endpoint: String,
    timeout: Duration = Duration.ofSeconds(30),
    block: suspend () -> T,
  ): T {
    if (!acquirePermit(endpoint, timeout)) {
      throw RateLimitException("Rate limit exceeded for $endpoint")
    }

    try {
      val result = block()
      trackSuccess(endpoint)
      return result
    } catch (e: Exception) {
      trackError(endpoint)
      throw e
    } finally {
      releasePermit()
    }
  }

  private fun adjustRateLimit(decrease: Boolean) {
    val now = Instant.now()

    // Don't adjust too frequently
    if (Duration.between(lastAdjustment, now) < Duration.ofMinutes(1)) {
      return
    }

    synchronized(this) {
      lastAdjustment = now

      val oldRate = currentRateLimit
      currentRateLimit =
        if (decrease) {
          max(1, (currentRateLimit * 0.8).toInt())
        } else {
          min(requestsPerMinute, (currentRateLimit * 1.2).toInt())
        }

      if (currentRateLimit != oldRate) {
        val action = if (decrease) "Decreased" else "Increased"
        logger.warn { "$action rate limit to $currentRateLimit requests/minute due to ${if (decrease) 'e' else 's'}rrors" }
      }
    }
  }

  /**
   * Tracks error rates for adaptive rate limiting
   */
  private inner class ErrorRateTracker {
    private val windowSize = 100
    private val recentResults = ArrayDeque<Boolean>()
    private var errorCount = 0

    @Synchronized
    fun recordError() {
      recentResults.addLast(false)
      errorCount++
      maintainWindow()
      checkErrorRate()
    }

    @Synchronized
    fun recordSuccess() {
      recentResults.addLast(true)
      maintainWindow()
      checkErrorRate()
    }

    @Synchronized
    fun errorRate(): Double {
      if (recentResults.isEmpty()) return 0.0
      return errorCount.toDouble() / recentResults.size
    }

    private fun maintainWindow() {
      while (recentResults.size > windowSize) {
        if (!recentResults.removeFirst()) {
          errorCount--
        }
      }
    }

    private fun checkErrorRate() {
      if (recentResults.size < windowSize / 2) return

      val rate = errorRate()
      if (rate > 0.1) { // More than 10% errors
        adjustRateLimit(true)
      } else if (rate < 0.01) { // Less than 1% errors
        adjustRateLimit(false)
      }
    }
  }
}

/**
 * Thrown when rate limit is exceeded
 */
class RateLimitException(
  message: String,
) : RuntimeException(message) {
  constructor() : this("Rate limit exceeded")
}
