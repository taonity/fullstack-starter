package org.example.fullstackstarter.plugins

import io.ktor.http.Cookie
import io.ktor.http.CookieEncoding
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCallPipeline
import io.ktor.server.request.httpMethod
import io.ktor.server.response.respond
import org.example.fullstackstarter.config.AppConfig
import java.security.SecureRandom
import java.util.Base64

private val SECURE_RANDOM = SecureRandom()
private val MUTATING_METHODS = setOf(HttpMethod.Post, HttpMethod.Put, HttpMethod.Patch, HttpMethod.Delete)
private const val CSRF_HEADER = "X-XSRF-TOKEN"

private fun generateCsrfToken(): String {
    val bytes = ByteArray(32)
    SECURE_RANDOM.nextBytes(bytes)
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
}

/**
 * SPA cookie-to-header CSRF protection (replaces Spring Security's `CookieCsrfTokenRepository` +
 * `SpaCsrfTokenRequestHandler`). A readable `XSRF-TOKEN` cookie is issued to clients, and every
 * mutating request must echo that token back in the `X-XSRF-TOKEN` header.
 */
fun Application.configureCsrf(appConfig: AppConfig) {
    val cookieName = appConfig.app.csrfCookieName
    val secure = appConfig.app.cookie.secure
    val sameSite = appConfig.app.cookie.sameSite

    intercept(ApplicationCallPipeline.Plugins) {
        val call = context
        val existingToken = call.request.cookies[cookieName]

        if (call.request.httpMethod in MUTATING_METHODS) {
            val headerToken = call.request.headers[CSRF_HEADER]
            if (existingToken.isNullOrBlank() || headerToken.isNullOrBlank() || headerToken != existingToken) {
                call.respond(HttpStatusCode.Forbidden, mapOf("error" to "Invalid CSRF token"))
                return@intercept finish()
            }
        }

        // Ensure the client always has a CSRF cookie available for subsequent mutating requests.
        if (existingToken.isNullOrBlank()) {
            call.response.cookies.append(
                Cookie(
                    name = cookieName,
                    value = generateCsrfToken(),
                    encoding = CookieEncoding.RAW,
                    path = "/",
                    httpOnly = false,
                    secure = secure,
                    domain = appConfig.session.cookieDomain,
                    extensions = mapOf("SameSite" to sameSite)
                )
            )
        }
    }
}
