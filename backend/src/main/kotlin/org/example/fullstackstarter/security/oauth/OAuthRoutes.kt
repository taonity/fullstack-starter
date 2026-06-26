package org.example.fullstackstarter.security.oauth

import io.github.oshai.kotlinlogging.KotlinLogging
import io.ktor.http.Cookie
import io.ktor.http.CookieEncoding
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import io.ktor.server.plugins.origin
import io.ktor.server.response.respond
import io.ktor.server.response.respondRedirect
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.sessions.clear
import io.ktor.server.sessions.get
import io.ktor.server.sessions.sessions
import io.ktor.server.sessions.set
import org.example.fullstackstarter.config.AppConfig
import org.example.fullstackstarter.security.session.OAuthStateSession
import org.example.fullstackstarter.security.session.UserSession
import java.util.UUID

private val LOGGER = KotlinLogging.logger("org.example.fullstackstarter.security.oauth.OAuthRoutes")

/**
 * OAuth2 login + logout endpoints, preserving the exact Spring Security URLs:
 *  - `GET  /oauth2/authorization/{registrationId}` — start the authorization-code flow
 *  - `GET  /login/oauth2/code/{registrationId}`     — provider callback
 *  - `POST /logout`                                 — clear the session
 */
fun Route.oauthRoutes(appConfig: AppConfig, oauthService: OAuthService) {
    val registrationId = appConfig.oauth!!.registration.registrationId

    get("/oauth2/authorization/$registrationId") {
        val state = UUID.randomUUID().toString()
        val redirectUri = resolveRedirectUri(call, appConfig, registrationId)
        call.sessions.set(OAuthStateSession(state, redirectUri))
        call.respondRedirect(oauthService.buildAuthorizationUrl(state, redirectUri), permanent = false)
    }

    get("/login/oauth2/code/$registrationId") {
        val stateSession = call.sessions.get<OAuthStateSession>()
        val code = call.request.queryParameters["code"]
        val state = call.request.queryParameters["state"]
        try {
            require(!code.isNullOrBlank()) { "Missing authorization code" }
            require(!state.isNullOrBlank()) { "Missing state parameter" }
            require(stateSession != null && stateSession.state == state) { "Invalid OAuth2 state" }

            val principal = oauthService.completeLogin(code, stateSession.redirectUri)
            call.sessions.clear<OAuthStateSession>()
            call.sessions.set(UserSession.fromPrincipal(principal))
            call.respondRedirect(appConfig.app.defaultSuccessUrl, permanent = false)
        } catch (exception: Exception) {
            handleLoginFailure(call, appConfig, exception)
        }
    }

    post("/logout") {
        call.sessions.clear<UserSession>()
        call.respond(HttpStatusCode.OK)
    }
}

private fun resolveRedirectUri(call: ApplicationCall, appConfig: AppConfig, registrationId: String): String {
    val configured = appConfig.oauth?.registration?.redirectUri
    if (!configured.isNullOrBlank()) return configured
    val origin = call.request.origin
    val portPart = if ((origin.scheme == "http" && origin.serverPort == 80) ||
        (origin.scheme == "https" && origin.serverPort == 443)
    ) "" else ":${origin.serverPort}"
    return "${origin.scheme}://${origin.serverHost}$portPart/login/oauth2/code/$registrationId"
}

private suspend fun handleLoginFailure(call: ApplicationCall, appConfig: AppConfig, exception: Exception) {
    val errorCode = when (exception) {
        is UnauthorizedAccountException, is IllegalArgumentException -> AuthenticationErrorCode.UNAUTHORIZED_ACCOUNT
        else -> AuthenticationErrorCode.AUTHENTICATION_FAILED
    }
    LOGGER.warn(exception) { "OAuth2 login failed: ${errorCode.name}" }
    call.sessions.clear<OAuthStateSession>()
    call.response.cookies.append(
        Cookie(
            name = "auth_error",
            value = errorCode.name,
            encoding = CookieEncoding.RAW,
            maxAge = 60,
            path = "/",
            httpOnly = false,
            secure = appConfig.app.cookie.secure,
            domain = appConfig.session.cookieDomain,
            extensions = mapOf("SameSite" to appConfig.app.cookie.sameSite)
        )
    )
    call.respondRedirect(appConfig.app.loginUrl, permanent = false)
}
