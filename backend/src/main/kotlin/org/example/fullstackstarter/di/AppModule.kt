package org.example.fullstackstarter.di

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.micrometer.core.instrument.MeterRegistry
import io.micrometer.prometheusmetrics.PrometheusConfig
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry
import org.example.fullstackstarter.config.AppConfig
import org.example.fullstackstarter.db.DatabaseFactory
import org.example.fullstackstarter.health.DbHealthIndicator
import org.example.fullstackstarter.health.GoogleHealthIndicator
import org.example.fullstackstarter.local.GoogleWireMockServerManager
import org.example.fullstackstarter.observability.logging.HttpRequestLoggingService
import org.example.fullstackstarter.observability.metrics.AppMetricsComponent
import org.example.fullstackstarter.security.oauth.OAuthService
import org.example.fullstackstarter.user.repository.UserRepository
import org.example.fullstackstarter.user.service.UserService
import org.koin.dsl.bind
import org.koin.dsl.module

/** Koin dependency graph (replaces Spring's component scanning / bean definitions). */
fun appModule(appConfig: AppConfig) = module {
    single { appConfig }

    single<ObjectMapper> { jacksonObjectMapper().apply { findAndRegisterModules() } }

    single { HttpClient(CIO) { expectSuccess = false } }

    // ---- persistence ----
    single { DatabaseFactory(get()) }
    single { UserRepository() }
    single { UserService(get()) }

    // ---- metrics ----
    single {
        PrometheusMeterRegistry(PrometheusConfig.DEFAULT).apply {
            config().commonTags("application", appConfig.metricsApplicationTag)
        }
    } bind MeterRegistry::class
    single { AppMetricsComponent(get(), get()) }

    // ---- security / oauth ----
    appConfig.oauth?.let { oauth ->
        single { OAuthService(oauth, get(), get(), get()) }
    }

    // ---- health indicators ----
    single { GoogleHealthIndicator(appConfig.oauth?.provider?.userInfoUri ?: "", get()) }
    single { DbHealthIndicator(get<DatabaseFactory>().dataSource) }

    // ---- observability ----
    single { HttpRequestLoggingService(appConfig.app, get()) }

    // ---- local stubs ----
    appConfig.wiremock?.let { wiremock ->
        single { GoogleWireMockServerManager(wiremock) }
    }
}
