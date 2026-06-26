package org.example.fullstackstarter

import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationStopped
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.defaultheaders.DefaultHeaders
import io.ktor.server.plugins.forwardedheaders.ForwardedHeaders
import io.ktor.server.routing.routing
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry
import org.example.fullstackstarter.config.AppConfig
import org.example.fullstackstarter.config.ConfigLoader
import org.example.fullstackstarter.db.DatabaseFactory
import org.example.fullstackstarter.di.appModule
import org.example.fullstackstarter.health.DbHealthIndicator
import org.example.fullstackstarter.health.GoogleHealthIndicator
import org.example.fullstackstarter.actuator.actuatorRoutes
import org.example.fullstackstarter.hello.helloRoutes
import org.example.fullstackstarter.local.GoogleWireMockServerManager
import org.example.fullstackstarter.observability.configureObservability
import org.example.fullstackstarter.observability.logging.HttpRequestLoggingService
import org.example.fullstackstarter.observability.logging.applyLogLevels
import org.example.fullstackstarter.observability.metrics.AppMetricsComponent
import org.example.fullstackstarter.plugins.configureAuthentication
import org.example.fullstackstarter.plugins.configureCsrf
import org.example.fullstackstarter.plugins.configureSerialization
import org.example.fullstackstarter.plugins.configureSessions
import org.example.fullstackstarter.security.oauth.OAuthService
import org.example.fullstackstarter.security.oauth.oauthRoutes
import org.example.fullstackstarter.web.exception.configureStatusPages
import org.koin.ktor.ext.get
import org.koin.ktor.ext.getKoin
import org.koin.ktor.plugin.Koin
import org.koin.logger.slf4jLogger

fun main(args: Array<String>) {
    // Choose the logback appender (plain vs JSON) BEFORE any logger is initialised.
    val profiles = ConfigLoader.resolveProfiles(args)
    System.setProperty("LOG_FORMAT", if ("plain-log" in profiles) "plain" else "logstash")

    val appConfig = ConfigLoader.load(args)
    embeddedServer(Netty, port = appConfig.serverPort, host = "0.0.0.0") {
        module(appConfig)
    }.start(wait = true)
}

fun Application.module(appConfig: AppConfig) {
    install(Koin) {
        slf4jLogger()
        modules(appModule(appConfig))
    }

    applyLogLevels(appConfig.logging.levels)

    // Connect to the database (and run Flyway) before anything that touches it.
    val databaseFactory = get<DatabaseFactory>()
    databaseFactory.connect()

    // Start the Google OAuth2 WireMock stub if the stub-google profile is active.
    val wireMock = getKoin().getOrNull<GoogleWireMockServerManager>()?.also { it.start() }

    val meterRegistry = get<PrometheusMeterRegistry>()
    get<AppMetricsComponent>().register()
    get<HttpRequestLoggingService>().logStartupBanner()

    // Resolve Koin beans before the routing block (where `get` means the HTTP verb).
    val dbHealthIndicator = get<DbHealthIndicator>()
    val googleHealthIndicator = get<GoogleHealthIndicator>()
    val oauthService = getKoin().getOrNull<OAuthService>()

    install(DefaultHeaders)
    install(ForwardedHeaders)
    configureSerialization()
    configureSessions(appConfig)
    configureAuthentication()
    configureStatusPages()
    configureObservability(meterRegistry, get())
    configureCsrf(appConfig)

    routing {
        helloRoutes()
        actuatorRoutes(meterRegistry, dbHealthIndicator, googleHealthIndicator)
        if (oauthService != null) {
            oauthRoutes(appConfig, oauthService)
        }
    }

    monitor.subscribe(ApplicationStopped) {
        wireMock?.stop()
        databaseFactory.close()
    }
}
