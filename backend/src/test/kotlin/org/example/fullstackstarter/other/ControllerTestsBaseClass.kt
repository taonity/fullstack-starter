package org.example.fullstackstarter.other

import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.http.Url
import io.ktor.http.setCookie
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import org.example.fullstackstarter.config.ConfigLoader
import org.example.fullstackstarter.config.WireMockConfig
import org.example.fullstackstarter.local.GoogleWireMockServerManager
import org.example.fullstackstarter.module

/**
 * Base class for HTTP-level tests. Boots the real Ktor application via the test host with the
 * `h2` + `stub-google` profiles (replaces the former `@SpringBootTest` + `MockMvc` setup).
 *
 * The Google OAuth2 stub (WireMock) is started once per JVM here and shared across all test
 * methods; the application's own WireMock is disabled via the `wiremock-off` profile so that the
 * per-test application lifecycle does not repeatedly bind the fixed stub port.
 */
abstract class ControllerTestsBaseClass {

    protected val sessionCookieName = "JSESSIONID-TEST"

    protected fun withApp(block: suspend ApplicationTestBuilder.() -> Unit) = testApplication {
        application {
            module(ConfigLoader.load(arrayOf("--app.profiles=h2,stub-google,wiremock-off")))
        }
        block()
    }

    /** Drives the stub OAuth2 authorization-code flow and returns the value of the session cookie. */
    protected suspend fun ApplicationTestBuilder.authorizeOAuth2(): String {
        val client = createClient { followRedirects = false }

        val authResponse = client.get("/oauth2/authorization/google-fullstack-starter")
        val location = authResponse.headers["Location"] ?: error("Missing authorize redirect Location")
        val state = Url(location).parameters["state"] ?: error("Missing state parameter")
        val oauthStateCookie = authResponse.setCookie().first { it.name == "OAUTH_STATE" }.value

        val callbackResponse = client.get(
            "/login/oauth2/code/google-fullstack-starter?code=stub-auth-code&state=$state"
        ) {
            header("Cookie", "OAUTH_STATE=$oauthStateCookie")
        }
        return callbackResponse.setCookie().first { it.name == sessionCookieName }.value
    }

    companion object {
        @Suppress("unused")
        private val wireMock: GoogleWireMockServerManager =
            GoogleWireMockServerManager(
                WireMockConfig(enabled = true, port = 9561, classpathRoot = "wiremock/google")
            ).also { it.start() }
    }
}
