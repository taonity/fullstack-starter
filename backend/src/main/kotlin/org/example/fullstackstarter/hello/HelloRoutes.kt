package org.example.fullstackstarter.hello

import io.ktor.server.auth.authenticate
import io.ktor.server.auth.principal
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import org.example.fullstackstarter.security.session.UserSession

/** Hello endpoints (replaces the Spring `HelloController`). */
fun Route.helloRoutes() {
    // Public root endpoint.
    get("/") {
        call.respond(mapOf("status" to "ok", "service" to "fullstack-starter"))
    }

    // Authenticated greeting.
    authenticate("session") {
        get("/hello") {
            val principal = call.principal<UserSession>()!!.toPrincipal()
            call.respond(
                mapOf(
                    "message" to "Hello, ${principal.getName()}!",
                    "email" to principal.getEmail()
                )
            )
        }
    }
}
