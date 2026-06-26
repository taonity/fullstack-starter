package org.example.fullstackstarter.observability

import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCallPipeline
import io.ktor.server.application.install
import io.ktor.server.plugins.callid.CallId
import io.ktor.server.plugins.callid.callIdMdc
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.plugins.doublereceive.DoubleReceive
import io.ktor.server.request.httpMethod
import io.ktor.server.request.path
import io.ktor.server.sessions.get
import io.ktor.server.sessions.sessions
import io.ktor.server.metrics.micrometer.MicrometerMetrics
import io.ktor.util.AttributeKey
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry
import org.example.fullstackstarter.observability.logging.HttpRequestLoggingService
import org.example.fullstackstarter.security.session.UserSession
import org.slf4j.event.Level
import java.util.UUID

private val START_TIME_KEY = AttributeKey<Long>("RequestStartTime")
const val CORRELATION_ID_HEADER = "X-Correlation-Id"

/**
 * Cross-cutting observability: correlation-id propagation, MDC enrichment, per-request access logging
 * (with timing), HTTP request detail logging and Micrometer metrics. Replaces the former servlet
 * filters (`MdcFilter`, `UserMdcFilter`, `AllRequestsLoggingFilter`), the
 * `ControllerLoggingInterceptor` and Spring Boot's Micrometer auto-configuration.
 */
fun Application.configureObservability(
    meterRegistry: PrometheusMeterRegistry,
    requestLogger: HttpRequestLoggingService
) {
    install(DoubleReceive)

    install(CallId) {
        header(CORRELATION_ID_HEADER)
        generate { UUID.randomUUID().toString() }
        verify { it.isNotBlank() }
    }

    install(CallLogging) {
        level = Level.INFO
        callIdMdc("correlationId")
        mdc("method") { it.request.httpMethod.value }
        mdc("uri") { it.request.path() }
        mdc("userId") { it.sessions.get<UserSession>()?.googleId ?: "anonymous" }
        format { call ->
            val start = call.attributes.getOrNull(START_TIME_KEY)
            val elapsed = if (start != null) System.currentTimeMillis() - start else -1
            val status = call.response.status()?.value
            "[${call.request.httpMethod.value}] ${call.request.path()} -> $status (${elapsed}ms)"
        }
    }

    install(MicrometerMetrics) {
        registry = meterRegistry
    }

    // Record request start time as early as possible (used by CallLogging for elapsed time).
    intercept(ApplicationCallPipeline.Setup) {
        context.attributes.put(START_TIME_KEY, System.currentTimeMillis())
    }

    // Detailed request logging (headers/cookies/body) at DEBUG.
    intercept(ApplicationCallPipeline.Monitoring) {
        requestLogger.logRequest(context)
    }
}
