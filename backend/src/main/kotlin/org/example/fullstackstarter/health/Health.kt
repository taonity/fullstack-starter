package org.example.fullstackstarter.health

/** Minimal health model replacing Spring Boot Actuator's `Health` / `HealthIndicator`. */
enum class Status { UP, DOWN }

data class Health(
    val status: Status,
    val details: Map<String, Any?> = emptyMap()
) {
    companion object {
        fun up(details: Map<String, Any?> = emptyMap()) = Health(Status.UP, details)
        fun down(details: Map<String, Any?> = emptyMap()) = Health(Status.DOWN, details)
    }
}

interface HealthIndicator {
    /** Name shown under the aggregated health `components`. */
    val name: String
    suspend fun health(): Health
}
