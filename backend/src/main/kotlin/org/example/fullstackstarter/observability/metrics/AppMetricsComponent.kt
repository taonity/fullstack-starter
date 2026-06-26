package org.example.fullstackstarter.observability.metrics

import io.micrometer.core.instrument.MeterRegistry
import org.example.fullstackstarter.user.repository.UserRepository

/** Registers application-level Micrometer metrics (gauge for the user count). */
class AppMetricsComponent(
    private val meterRegistry: MeterRegistry,
    private val userRepository: UserRepository
) {
    companion object {
        private const val APP_USERS_COUNT: String = "app.users.count"
    }

    fun register() {
        meterRegistry.gauge(APP_USERS_COUNT, userRepository) { it.count().toDouble() }
    }
}
