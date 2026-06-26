package org.example.fullstackstarter.plugins

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.session
import io.ktor.server.response.respond
import org.example.fullstackstarter.security.session.UserSession

/**
 * Session-based authentication. A valid [UserSession] authenticates the request; otherwise the
 * `challenge` returns 401 (mirrors Spring Security returning 401 for unauthenticated API calls).
 */
fun Application.configureAuthentication() {
    install(Authentication) {
        session<UserSession>("session") {
            validate { session -> session }
            challenge {
                call.respond(HttpStatusCode.Unauthorized)
            }
        }
    }
}
