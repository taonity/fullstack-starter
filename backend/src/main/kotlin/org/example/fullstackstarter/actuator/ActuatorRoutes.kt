package org.example.fullstackstarter.actuator

import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry
import org.example.fullstackstarter.health.Health
import org.example.fullstackstarter.health.HealthIndicator
import org.example.fullstackstarter.health.Status
import java.util.Properties

/**
 * Actuator-style management endpoints implemented as plain (public) Ktor routes. Replaces Spring
 * Boot Actuator's `/actuator/` endpoints, preserving the same paths, the `external` health group
 * and the same up/down semantics (200 when UP, 503 when DOWN).
 */
fun Route.actuatorRoutes(
    meterRegistry: PrometheusMeterRegistry,
    dbHealthIndicator: HealthIndicator,
    googleHealthIndicator: HealthIndicator
) {
    val gitInfo by lazy { loadProperties("git.properties") }
    val buildInfo by lazy { loadProperties("META-INF/build-info.properties") }

    // Main health: aggregates all indicators.
    get("/actuator/health") {
        respondHealth(call, listOf(dbHealthIndicator, googleHealthIndicator))
    }

    // Liveness probe: the app is running.
    get("/actuator/health/liveness") {
        call.respond(HttpStatusCode.OK, mapOf("status" to Status.UP.name))
    }

    // Readiness probe: the app is ready to accept traffic (DB reachable).
    get("/actuator/health/readiness") {
        respondHealth(call, listOf(dbHealthIndicator))
    }

    // `external` health group (google).
    get("/actuator/health/external") {
        respondHealth(call, listOf(googleHealthIndicator))
    }

    get("/actuator/info") {
        val info = buildMap<String, Any?> {
            val git = gitInfo.toMapWithPrefixStripped("git.")
            if (git.isNotEmpty()) put("git", git)
            val build = buildInfo.toMapWithPrefixStripped("build.")
            put("build", build.ifEmpty { mapOf("name" to "fullstack-starter", "version" to "main-SNAPSHOT") })
        }
        call.respond(info)
    }

    get("/actuator/prometheus") {
        call.respondText(meterRegistry.scrape(), ContentType.parse("text/plain; version=0.0.4; charset=utf-8"))
    }

    get("/actuator/metrics") {
        call.respond(mapOf("names" to meterRegistry.meters.map { it.id.name }.distinct().sorted()))
    }
}

private suspend fun respondHealth(call: ApplicationCall, indicators: List<HealthIndicator>) {
    val components = indicators.associate { it.name to it.health() }
    val overall = if (components.values.any { it.status == Status.DOWN }) Status.DOWN else Status.UP
    val body = mapOf(
        "status" to overall.name,
        "components" to components.mapValues { (_, health) -> health.toResponse() }
    )
    val httpStatus = if (overall == Status.DOWN) HttpStatusCode.ServiceUnavailable else HttpStatusCode.OK
    call.respond(httpStatus, body)
}

private fun Health.toResponse(): Map<String, Any?> = buildMap {
    put("status", status.name)
    if (details.isNotEmpty()) put("details", details)
}

private fun loadProperties(resource: String): Properties {
    val props = Properties()
    object {}.javaClass.classLoader.getResourceAsStream(resource)?.use { props.load(it) }
    return props
}

private fun Properties.toMapWithPrefixStripped(prefix: String): Map<String, String> =
    entries.associate { (k, v) -> k.toString().removePrefix(prefix) to v.toString() }
