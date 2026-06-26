package org.example.fullstackstarter.local

import com.github.tomakehurst.wiremock.WireMockServer
import com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig
import io.github.oshai.kotlinlogging.KotlinLogging
import org.example.fullstackstarter.config.WireMockConfig

/**
 * Starts an embedded WireMock server serving the Google OAuth2 stubs from the classpath when the
 * `stub-google` profile is active (replaces the Spring `@Profile("stub-google")` configuration).
 */
class GoogleWireMockServerManager(
    private val config: WireMockConfig
) {
    companion object {
        private val LOGGER = KotlinLogging.logger {}
    }

    private var server: WireMockServer? = null

    fun start() {
        if (!config.enabled) return
        val wireMockServer = WireMockServer(
            wireMockConfig()
                .port(config.port)
                .usingFilesUnderClasspath(config.classpathRoot)
                .globalTemplating(true)
        )
        wireMockServer.start()
        server = wireMockServer
        LOGGER.info { "Google WireMock stub started on port ${wireMockServer.port()}" }
    }

    fun stop() {
        server?.stop()
        server = null
    }
}
