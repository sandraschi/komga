package org.gotson.komga.infrastructure.llm.util

import mu.KotlinLogging
import org.springframework.http.*
import org.springframework.retry.RetryCallback
import org.springframework.retry.RetryContext
import org.springframework.retry.backoff.ExponentialBackOffPolicy
import org.springframework.retry.policy.SimpleRetryPolicy
import org.springframework.retry.support.RetryTemplate
import org.springframework.web.client.HttpClientErrorException
import org.springframework.web.client.HttpServerErrorException
import org.springframework.web.client.RestClientException
import org.springframework.web.client.RestTemplate
import java.net.URI
import java.net.URL
import java.time.Duration
import java.util.concurrent.TimeUnit

private val logger = KotlinLogging.logger {}

/**
 * Utility class for making HTTP requests with retry and error handling.
 */
class HttpUtils(
    private val restTemplate: RestTemplate,
    private val defaultHeaders: Map<String, String> = emptyMap(),
    private val maxRetries: Int = 3,
    private val initialBackoffMs: Long = 1000,
    private val maxBackoffMs: Long = 10000,
    private val timeoutMs: Long = 30000
) {
    private val retryTemplate = createRetryTemplate()

    /**
     * Creates a configured RetryTemplate with exponential backoff.
     *
     * @return A configured RetryTemplate
     */
    private fun createRetryTemplate(): RetryTemplate {
        val retryTemplate = RetryTemplate()

        // Configure retry policy
        val retryPolicy = SimpleRetryPolicy(maxRetries).apply {
            setRetryOnException { throwable ->
                when (throwable) {
                    is HttpServerErrorException -> {
                        // Retry on 5xx errors
                        true
                    }
                    is HttpClientErrorException -> {
                        // Don't retry on 4xx errors, except for 429 (Too Many Requests)
                        throwable.statusCode == HttpStatus.TOO_MANY_REQUESTS
                    }
                    is RestClientException -> {
                        // Retry on connection errors and timeouts
                        true
                    }
                    else -> false
                }
            }
        }

        // Configure backoff policy
        val backOffPolicy = ExponentialBackOffPolicy().apply {
            initialInterval = initialBackoffMs
            maxInterval = maxBackoffMs
            multiplier = 2.0
        }

        retryTemplate.setRetryPolicy(retryPolicy)
        retryTemplate.setBackOffPolicy(backOffPolicy)

        return retryTemplate
    }

    /**
     * Executes an HTTP GET request.
     *
     * @param url The URL to request
     * @param headers Additional headers to include in the request
     * @param responseType The expected response type
     * @return The response entity
     */
    fun <T> get(
        url: String,
        headers: Map<String, String> = emptyMap(),
        responseType: Class<T>
    ): ResponseEntity<T> {
        return executeRequest(HttpMethod.GET, url, null, headers, responseType)
    }

    /**
     * Executes an HTTP POST request.
     *
     * @param url The URL to request
     * @param body The request body
     * @param headers Additional headers to include in the request
     * @param responseType The expected response type
     * @return The response entity
     */
    fun <T, R> post(
        url: String,
        body: R? = null,
        headers: Map<String, String> = emptyMap(),
        responseType: Class<T>
    ): ResponseEntity<T> {
        return executeRequest(HttpMethod.POST, url, body, headers, responseType)
    }

    /**
     * Executes an HTTP PUT request.
     *
     * @param url The URL to request
     * @param body The request body
     * @param headers Additional headers to include in the request
     * @param responseType The expected response type
     * @return The response entity
     */
    fun <T, R> put(
        url: String,
        body: R? = null,
        headers: Map<String, String> = emptyMap(),
        responseType: Class<T>
    ): ResponseEntity<T> {
        return executeRequest(HttpMethod.PUT, url, body, headers, responseType)
    }

    /**
     * Executes an HTTP DELETE request.
     *
     * @param url The URL to request
     * @param headers Additional headers to include in the request
     * @param responseType The expected response type
     * @return The response entity
     */
    fun <T> delete(
        url: String,
        headers: Map<String, String> = emptyMap(),
        responseType: Class<T>
    ): ResponseEntity<T> {
        return executeRequest(HttpMethod.DELETE, url, null, headers, responseType)
    }

    /**
     * Executes an HTTP request with retry logic.
     *
     * @param method The HTTP method
     * @param url The URL to request
     * @param body The request body
     * @param headers Additional headers to include in the request
     * @param responseType The expected response type
     * @return The response entity
     */
    private fun <T, R> executeRequest(
        method: HttpMethod,
        url: String,
        body: R?,
        headers: Map<String, String>,
        responseType: Class<T>
    ): ResponseEntity<T> {
        validateUrl(url)

        val requestHeaders = HttpHeaders().apply {
            // Add default headers
            defaultHeaders.forEach { (key, value) ->
                set(key, value)
            }
            
            // Add request-specific headers
            headers.forEach { (key, value) ->
                set(key, value)
            }
            
            // Set content type if not already set and there's a body
            if (!contains(HttpHeaders.CONTENT_TYPE) && body != null) {
                contentType = MediaType.APPLICATION_JSON
            }
            
            // Set accept header if not already set
            if (!contains(HttpHeaders.ACCEPT)) {
                accept = listOf(MediaType.APPLICATION_JSON)
            }
        }


        val requestEntity = if (body != null) {
            HttpEntity(body, requestHeaders)
        } else {
            HttpEntity<Any>(requestHeaders)
        }

        return retryTemplate.execute<ResponseEntity<T>, Exception> { context ->
            val attempt = context.retryCount + 1
            logger.debug { "Sending $method request to $url (attempt $attempt/$maxRetries)" }
            
            try {
                restTemplate.exchange(
                    url,
                    method,
                    requestEntity,
                    responseType
                )
            } catch (e: Exception) {
                if (context.lastThrowable != null) {
                    logger.warn { "Retry attempt $attempt/$maxRetries failed: ${e.message}" }
                }
                throw e
            }
        }
    }

    /**
     * Validates that a URL is well-formed and uses an allowed protocol.
     *
     * @param url The URL to validate
     * @throws IllegalArgumentException if the URL is invalid or uses a disallowed protocol
     */
    private fun validateUrl(url: String) {
        try {
            val uri = URI.create(url).toURL()
            val protocol = uri.protocol.lowercase()
            
            if (protocol !in setOf("http", "https")) {
                throw IllegalArgumentException("Unsupported protocol: $protocol. Only http and https are allowed.")
            }
            
            // Validate host is not localhost or private IP address if in production
            if (isLocalOrPrivate(uri.host)) {
                logger.warn { "Accessing local or private host: ${uri.host}" }
            }
        } catch (e: Exception) {
            throw IllegalArgumentException("Invalid URL: $url", e)
        }
    }
    
    /**
     * Checks if a host is localhost or a private IP address.
     *
     * @param host The host to check
     * @return `true` if the host is localhost or a private IP address, `false` otherwise
     */
    private fun isLocalOrPrivate(host: String): Boolean {
        return host.equals("localhost", ignoreCase = true) ||
                host == "127.0.0.1" ||
                host == "::1" ||
                host.startsWith("192.168.") ||
                host.startsWith("10.") ||
                host.startsWith("172.16.") ||
                host.startsWith("172.17.") ||
                host.startsWith("172.18.") ||
                host.startsWith("172.19.") ||
                host.startsWith("172.20.") ||
                host.startsWith("172.21.") ||
                host.startsWith("172.22.") ||
                host.startsWith("172.23.") ||
                host.startsWith("172.24.") ||
                host.startsWith("172.25.") ||
                host.startsWith("172.26.") ||
                host.startsWith("172.27.") ||
                host.startsWith("172.28.") ||
                host.startsWith("172.29.") ||
                host.startsWith("172.30.") ||
                host.startsWith("172.31.")
    }
    
    /**
     * Creates a new instance with the specified default headers.
     *
     * @param headers The default headers to include in all requests
     * @return A new HttpUtils instance with the specified default headers
     */
    fun withDefaultHeaders(headers: Map<String, String>): HttpUtils {
        return HttpUtils(restTemplate, headers, maxRetries, initialBackoffMs, maxBackoffMs, timeoutMs)
    }
    
    /**
     * Creates a new instance with the specified retry configuration.
     *
     * @param maxRetries The maximum number of retry attempts
     * @param initialBackoffMs The initial backoff duration in milliseconds
     * @param maxBackoffMs The maximum backoff duration in milliseconds
     * @return A new HttpUtils instance with the specified retry configuration
     */
    fun withRetryConfig(
        maxRetries: Int = this.maxRetries,
        initialBackoffMs: Long = this.initialBackoffMs,
        maxBackoffMs: Long = this.maxBackoffMs
    ): HttpUtils {
        return HttpUtils(restTemplate, defaultHeaders, maxRetries, initialBackoffMs, maxBackoffMs, timeoutMs)
    }
}

/**
 * Creates a new HttpUtils instance with the specified RestTemplate.
 *
 * @param restTemplate The RestTemplate to use for HTTP requests
 * @return A new HttpUtils instance
 */
fun httpUtils(restTemplate: RestTemplate): HttpUtils {
    return HttpUtils(restTemplate)
}
