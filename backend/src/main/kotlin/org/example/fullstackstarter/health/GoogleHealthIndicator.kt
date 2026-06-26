package org.example.fullstackstarter.health

import io.github.oshai.kotlinlogging.KotlinLogging
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import java.time.Duration
import java.time.Instant

/**
 * Reports whether Google's user-info endpoint is reachable (a 4xx still means reachable, only 5xx
 * or connection failures are DOWN). Replaces the Spring Boot custom `HealthIndicator`.
 */
class GoogleHealthIndicator(
    private val userInfoUri: String,
    private val httpClient: HttpClient
) : HealthIndicator {

    override val name: String = "google"

    companion object {
        private val LOGGER = KotlinLogging.logger {}
        private const val MAX_BODY_PREVIEW_CHARS = 160
    }

    override suspend fun health(): Health {
        val start = Instant.now()
        return try {
            val response = httpClient.get(userInfoUri)
            val elapsedMs = Duration.between(start, Instant.now()).toMillis()
            val statusCode = response.status.value
            val is5xx = statusCode in 500..599
            val details = linkedMapOf<String, Any?>(
                "url" to userInfoUri,
                "statusCode" to statusCode,
                "responseTimeMs" to elapsedMs
            )
            if (is5xx) {
                details["responsePreview"] = response.bodyAsText().take(MAX_BODY_PREVIEW_CHARS)
                Health.down(details)
            } else {
                // 4xx (e.g. 401 without a token) still means Google is reachable
                Health.up(details)
            }
        } catch (exception: Exception) {
            val elapsedMs = Duration.between(start, Instant.now()).toMillis()
            LOGGER.warn { "Google availability check failed for $userInfoUri" }
            Health.down(
                linkedMapOf(
                    "url" to userInfoUri,
                    "responseTimeMs" to elapsedMs,
                    "error" to (exception.message ?: exception::class.simpleName ?: "unknown")
                )
            )
        }
    }
}
