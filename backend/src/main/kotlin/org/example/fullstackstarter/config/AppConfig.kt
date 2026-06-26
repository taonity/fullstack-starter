package org.example.fullstackstarter.config

/**
 * Strongly-typed application configuration, assembled by [ConfigLoader] from the merged
 * YAML profile files. Replaces Spring's `@ConfigurationProperties` / `application*.yaml` system.
 */
data class AppConfig(
    val serverPort: Int,
    val session: SessionConfig,
    val app: AppProperties,
    val oauth: OAuthConfig?,
    val datasource: DataSourceConfig,
    val flyway: FlywayConfig,
    val wiremock: WireMockConfig?,
    val logging: LoggingConfig,
    val metricsApplicationTag: String,
    val activeProfiles: Set<String>,
)

data class SessionConfig(
    val cookieDomain: String?,
    val cookieName: String,
)

/** Mirrors the former `AppProperties` (`app.*`). */
data class AppProperties(
    val minimisedHttpServletLogging: Boolean,
    val csrfCookieName: String,
    val defaultSuccessUrl: String,
    val loginUrl: String,
    val cookie: Cookie,
) {
    data class Cookie(
        val secure: Boolean,
        val sameSite: String,
    )
}

data class OAuthConfig(
    val registration: Registration,
    val provider: Provider,
) {
    data class Registration(
        val registrationId: String,
        val clientId: String,
        val clientSecret: String,
        val redirectUri: String?,
        val scope: String,
    ) {
        /** OAuth2 wants space-delimited scopes; config keeps the Spring-style comma list. */
        val scopeParam: String get() = scope.split(",").joinToString(" ") { it.trim() }
    }

    data class Provider(
        val authorizationUri: String,
        val tokenUri: String,
        val userInfoUri: String,
        val jwkSetUri: String?,
    )
}

data class DataSourceConfig(
    val url: String,
    val username: String,
    val password: String,
    val driverClassName: String,
)

data class FlywayConfig(
    val enabled: Boolean,
    val cleanDisabled: Boolean,
    val locations: List<String>,
    val cleanMigrate: Boolean,
)

data class WireMockConfig(
    val enabled: Boolean,
    val port: Int,
    val classpathRoot: String,
)

data class LoggingConfig(
    val structuredFormat: String,
    val levels: Map<String, String>,
)
