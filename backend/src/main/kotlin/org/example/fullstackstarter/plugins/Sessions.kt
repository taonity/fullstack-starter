package org.example.fullstackstarter.plugins

import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.sessions.SessionStorageMemory
import io.ktor.server.sessions.Sessions
import io.ktor.server.sessions.cookie
import org.example.fullstackstarter.config.AppConfig
import org.example.fullstackstarter.security.session.OAuthStateSession
import org.example.fullstackstarter.security.session.UserSession

/**
 * Server-side HTTP sessions. The authenticated [UserSession] is stored server-side (in-memory) and
 * referenced by an opaque cookie (the JSESSIONID equivalent). The transient [OAuthStateSession] is
 * stored client-side so it survives the cross-site redirect to the OAuth provider.
 */
fun Application.configureSessions(appConfig: AppConfig) {
    install(Sessions) {
        cookie<UserSession>(appConfig.session.cookieName, SessionStorageMemory()) {
            cookie.path = "/"
            cookie.httpOnly = true
            cookie.secure = appConfig.app.cookie.secure
            cookie.extensions["SameSite"] = appConfig.app.cookie.sameSite
            appConfig.session.cookieDomain?.let { cookie.domain = it }
        }
        cookie<OAuthStateSession>("OAUTH_STATE") {
            cookie.path = "/"
            cookie.httpOnly = true
            cookie.maxAgeInSeconds = 300
            cookie.secure = appConfig.app.cookie.secure
            cookie.extensions["SameSite"] = appConfig.app.cookie.sameSite
            appConfig.session.cookieDomain?.let { cookie.domain = it }
        }
    }
}
