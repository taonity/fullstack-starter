package org.example.fullstackstarter.web.exception

import com.fasterxml.jackson.databind.exc.MismatchedInputException
import io.github.oshai.kotlinlogging.KotlinLogging
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.install
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import io.ktor.server.routing.RoutingCall

/** Thrown to signal a request validation failure (mapped to 400 / VALIDATION_ERROR). */
class ValidationException(message: String) : RuntimeException(message)

private val LOGGER = KotlinLogging.logger("org.example.fullstackstarter.web.exception.GlobalExceptionHandler")

/**
 * Centralised exception handling (replaces the Spring `@RestControllerAdvice`). Installs Ktor's
 * StatusPages plugin and maps exceptions to the same JSON error payloads / HTTP statuses as before.
 */
fun io.ktor.server.application.Application.configureStatusPages() {
    install(StatusPages) {
        // 400 - malformed/missing request body (was HttpMessageNotReadableException)
        exception<BadRequestException> { call, cause ->
            val message = (cause.cause as? MismatchedInputException)?.message ?: cause.message ?: ""
            call.respond(HttpStatusCode.BadRequest, ClientErrorResponse(ClientErrorCode.MISSING_FIELD, message))
        }
        exception<MismatchedInputException> { call, cause ->
            call.respond(
                HttpStatusCode.BadRequest,
                ClientErrorResponse(ClientErrorCode.MISSING_FIELD, cause.message ?: "")
            )
        }
        // 400 - bean validation failures (was MethodArgumentNotValidException)
        exception<ValidationException> { call, cause ->
            call.respond(
                HttpStatusCode.BadRequest,
                ClientErrorResponse(ClientErrorCode.VALIDATION_ERROR, cause.message ?: "")
            )
        }
        // 500 - anything else
        exception<Throwable> { call, cause ->
            LOGGER.error(cause) { "Unhandled exception" }
            call.respond(HttpStatusCode.InternalServerError, ServerErrorResponse(ServerErrorCode.UNKNOWN))
        }
        // 404 - unmatched routes (was NoResourceFoundException)
        status(HttpStatusCode.NotFound) { call, _ ->
            (call as? RoutingCall)?.let { LOGGER.debug { "No resource found: ${it.request.local.uri}" } }
        }
    }
}
