package org.example.fullstackstarter.observability.logging

import com.fasterxml.jackson.databind.ObjectMapper
import io.github.oshai.kotlinlogging.KotlinLogging
import io.ktor.server.application.ApplicationCall
import io.ktor.server.request.httpMethod
import io.ktor.server.request.path
import io.ktor.server.request.receiveText
import org.example.fullstackstarter.config.AppProperties

/**
 * Logs incoming HTTP requests (headers/cookies/body) at DEBUG, honouring the same blocklists and
 * `minimisedHttpServletLogging` toggle as the former servlet-based `HttpServletLoggingService`.
 */
class HttpRequestLoggingService(
    private val appProperties: AppProperties,
    private val objectMapper: ObjectMapper
) {
    companion object {
        private val LOGGER = KotlinLogging.logger {}
        private val headerLoggingBlocklist = listOf(
            "host", "user-agent", "accept", "accept-language", "accept-encoding", "connection",
            "sec-fetch-dest", "sec-fetch-mode", "sec-fetch-site", "priority", "cookie",
            "upgrade-insecure-requests", "sec-fetch-user", "referer", "x-requested-with",
            "sec-ch-ua-platform", "sec-ch-ua", "sec-ch-ua-mobile", "origin"
        )
        private val cookiesLoggingBlocklist = emptyList<String>()
        private val endpointBlocklist = listOf("/actuator/health")
    }

    fun logStartupBanner() {
        if (appProperties.minimisedHttpServletLogging) {
            LOGGER.info { "Minimised logging mode enabled - app.minimisedHttpServletLogging=true" }
            LOGGER.info { "Following endpoints will be ignored: $endpointBlocklist" }
            LOGGER.info { "Following headers will be ignored: $headerLoggingBlocklist" }
            LOGGER.info { "Following cookies will be ignored: $cookiesLoggingBlocklist" }
        }
    }

    suspend fun logRequest(call: ApplicationCall) {
        if (shouldSkipEndpointLogging(call)) return

        val headersJson = interestedHeaders(call)
        val cookiesJson = interestedCookies(call)
        val body = runCatching { call.receiveText() }.getOrDefault("")

        LOGGER.debug {
            "[${call.request.httpMethod.value}] ${call.request.path()} with headers $headersJson, " +
                "cookies $cookiesJson, body [$body]"
        }
    }

    private fun shouldSkipEndpointLogging(call: ApplicationCall) =
        appProperties.minimisedHttpServletLogging && call.request.path() in endpointBlocklist

    private fun interestedHeaders(call: ApplicationCall): String {
        val headers = call.request.headers.entries()
            .filter { filterHeaderIfEnabled(it.key.lowercase()) }
            .map { it.key to it.value.joinToString(",") }
        return objectMapper.writeValueAsString(headers.toMap())
    }

    private fun filterHeaderIfEnabled(headerName: String) =
        headerName !in headerLoggingBlocklist || !appProperties.minimisedHttpServletLogging

    private fun interestedCookies(call: ApplicationCall): String {
        val cookies = call.request.cookies.rawCookies
            .filter { filterCookieIfEnabled(it.key) }
        return objectMapper.writeValueAsString(cookies)
    }

    private fun filterCookieIfEnabled(cookieName: String) =
        cookieName !in cookiesLoggingBlocklist || !appProperties.minimisedHttpServletLogging
}
