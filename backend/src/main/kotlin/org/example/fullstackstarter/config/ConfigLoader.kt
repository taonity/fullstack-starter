package org.example.fullstackstarter.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory

/**
 * Loads and merges profile-specific YAML config, resolves `${ENV:default}` placeholders, and
 * builds a typed [AppConfig]. Replaces Spring Boot's profile + property-source machinery.
 *
 * Active profiles are resolved (in priority order) from:
 *  - program args `--app.profiles=` / `--spring.profiles.active=`
 *  - env `APP_PROFILES` / `SPRING_PROFILES_ACTIVE`
 *  - system property `app.profiles`
 *
 * Profile groups: `local` implicitly activates `plain-log` (mirrors the old `spring.profiles.group`).
 * `app.additionalProfiles` (e.g. `flyway-clean-migrate`) is honoured with a second merge pass.
 */
object ConfigLoader {

    private val yamlMapper = ObjectMapper(YAMLFactory())

    fun load(args: Array<String> = emptyArray()): AppConfig {
        var profiles = resolveProfiles(args)
        var merged = loadAndMerge(profiles)

        // Second pass: a profile may request additional profiles (e.g. flyway-clean-migrate).
        val additional = stringOrNull(merged, "app", "additionalProfiles")
            ?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() } ?: emptyList()
        if (additional.any { it !in profiles }) {
            profiles = expandGroups((profiles + additional).toList())
            merged = loadAndMerge(profiles)
        }

        return build(merged, profiles)
    }

    fun resolveProfiles(args: Array<String> = emptyArray()): Set<String> {
        val raw = argValue(args, "--app.profiles")
            ?: argValue(args, "--spring.profiles.active")
            ?: System.getenv("APP_PROFILES")
            ?: System.getenv("SPRING_PROFILES_ACTIVE")
            ?: System.getProperty("app.profiles")
            ?: ""
        val explicit = raw.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        return expandGroups(explicit)
    }

    private fun expandGroups(profiles: List<String>): Set<String> {
        val result = LinkedHashSet(profiles)
        if ("local" in result) result.add("plain-log")
        return result
    }

    private fun argValue(args: Array<String>, key: String): String? =
        args.firstOrNull { it.startsWith("$key=") }?.substringAfter("=")

    @Suppress("UNCHECKED_CAST")
    private fun loadAndMerge(profiles: Set<String>): Map<String, Any?> {
        var merged = readYaml("application.yaml")
        for (profile in profiles) {
            val profileConfig = readYaml("application-$profile.yaml")
            merged = deepMerge(merged, profileConfig)
        }
        return resolvePlaceholders(merged) as Map<String, Any?>
    }

    @Suppress("UNCHECKED_CAST")
    private fun readYaml(resource: String): Map<String, Any?> {
        val stream = javaClass.classLoader.getResourceAsStream(resource) ?: return emptyMap()
        return stream.use { yamlMapper.readValue(it, Map::class.java) as Map<String, Any?> }
    }

    @Suppress("UNCHECKED_CAST")
    private fun deepMerge(base: Map<String, Any?>, override: Map<String, Any?>): Map<String, Any?> {
        val result = LinkedHashMap<String, Any?>(base)
        for ((key, overrideValue) in override) {
            val baseValue = result[key]
            result[key] = if (baseValue is Map<*, *> && overrideValue is Map<*, *>) {
                deepMerge(baseValue as Map<String, Any?>, overrideValue as Map<String, Any?>)
            } else {
                overrideValue
            }
        }
        return result
    }

    private val placeholderRegex = Regex("""\$\{([^:}]+)(?::([^}]*))?}""")

    @Suppress("UNCHECKED_CAST")
    private fun resolvePlaceholders(value: Any?): Any? = when (value) {
        is Map<*, *> -> (value as Map<String, Any?>).mapValues { resolvePlaceholders(it.value) }
        is List<*> -> value.map { resolvePlaceholders(it) }
        is String -> placeholderRegex.replace(value) { match ->
            val name = match.groupValues[1]
            val default = match.groups[2]?.value ?: ""
            System.getenv(name) ?: System.getProperty(name) ?: default
        }
        else -> value
    }

    // ---- typed building helpers ----

    @Suppress("UNCHECKED_CAST")
    private fun node(map: Map<String, Any?>, vararg path: String): Map<String, Any?>? {
        var current: Any? = map
        for (key in path) {
            current = (current as? Map<String, Any?>)?.get(key) ?: return null
        }
        return current as? Map<String, Any?>
    }

    @Suppress("UNCHECKED_CAST")
    private fun stringOrNull(map: Map<String, Any?>, vararg path: String): String? {
        var current: Any? = map
        for ((i, key) in path.withIndex()) {
            current = if (i == path.lastIndex) (current as? Map<String, Any?>)?.get(key)
            else (current as? Map<String, Any?>)?.get(key)
            if (current == null) return null
        }
        return current?.toString()?.takeIf { it.isNotBlank() }
    }

    private fun bool(map: Map<String, Any?>, default: Boolean, vararg path: String): Boolean =
        stringOrNull(map, *path)?.toBooleanStrictOrNull() ?: default

    private fun int(map: Map<String, Any?>, default: Int, vararg path: String): Int =
        stringOrNull(map, *path)?.toIntOrNull() ?: default

    @Suppress("UNCHECKED_CAST")
    private fun stringList(map: Map<String, Any?>, vararg path: String): List<String> {
        var current: Any? = map
        for (key in path) current = (current as? Map<String, Any?>)?.get(key)
        return (current as? List<*>)?.map { it.toString() } ?: emptyList()
    }

    private fun build(merged: Map<String, Any?>, profiles: Set<String>): AppConfig {
        val oauthNode = node(merged, "oauth")
        val oauth = if (oauthNode != null) {
            OAuthConfig(
                registration = OAuthConfig.Registration(
                    registrationId = stringOrNull(merged, "oauth", "registration", "registrationId")
                        ?: "google-fullstack-starter",
                    clientId = stringOrNull(merged, "oauth", "registration", "clientId") ?: "",
                    clientSecret = stringOrNull(merged, "oauth", "registration", "clientSecret") ?: "",
                    redirectUri = stringOrNull(merged, "oauth", "registration", "redirectUri"),
                    scope = stringOrNull(merged, "oauth", "registration", "scope") ?: "profile,email",
                ),
                provider = OAuthConfig.Provider(
                    authorizationUri = stringOrNull(merged, "oauth", "provider", "authorizationUri") ?: "",
                    tokenUri = stringOrNull(merged, "oauth", "provider", "tokenUri") ?: "",
                    userInfoUri = stringOrNull(merged, "oauth", "provider", "userInfoUri") ?: "",
                    jwkSetUri = stringOrNull(merged, "oauth", "provider", "jwkSetUri"),
                ),
            )
        } else {
            null
        }

        val wiremockNode = node(merged, "wiremock")
        val wiremock = if (wiremockNode != null) {
            WireMockConfig(
                enabled = bool(merged, false, "wiremock", "enabled"),
                port = int(merged, 9561, "wiremock", "port"),
                classpathRoot = stringOrNull(merged, "wiremock", "classpathRoot") ?: "wiremock/google",
            )
        } else {
            null
        }

        @Suppress("UNCHECKED_CAST")
        val levels = (node(merged, "logging", "levels") ?: emptyMap())
            .mapValues { it.value.toString() }

        return AppConfig(
            serverPort = int(merged, 8080, "server", "port"),
            session = SessionConfig(
                cookieDomain = stringOrNull(merged, "session", "cookieDomain"),
                cookieName = stringOrNull(merged, "session", "cookieName") ?: "JSESSIONID",
            ),
            app = AppProperties(
                minimisedHttpServletLogging = bool(merged, true, "app", "minimisedHttpServletLogging"),
                csrfCookieName = stringOrNull(merged, "app", "csrfCookieName") ?: "XSRF-TOKEN",
                defaultSuccessUrl = stringOrNull(merged, "app", "defaultSuccessUrl") ?: "",
                loginUrl = stringOrNull(merged, "app", "loginUrl") ?: "",
                cookie = AppProperties.Cookie(
                    secure = bool(merged, true, "app", "cookie", "secure"),
                    sameSite = stringOrNull(merged, "app", "cookie", "sameSite") ?: "Lax",
                ),
            ),
            oauth = oauth,
            datasource = DataSourceConfig(
                url = stringOrNull(merged, "datasource", "url") ?: "jdbc:h2:mem:default",
                username = stringOrNull(merged, "datasource", "username") ?: "sa",
                password = stringOrNull(merged, "datasource", "password") ?: "",
                driverClassName = stringOrNull(merged, "datasource", "driverClassName") ?: "org.h2.Driver",
            ),
            flyway = FlywayConfig(
                enabled = bool(merged, false, "flyway", "enabled"),
                cleanDisabled = bool(merged, true, "flyway", "cleanDisabled"),
                locations = stringList(merged, "flyway", "locations"),
                cleanMigrate = "flyway-clean-migrate" in profiles,
            ),
            wiremock = wiremock,
            logging = LoggingConfig(
                structuredFormat = stringOrNull(merged, "logging", "structuredFormat") ?: "logstash",
                levels = levels,
            ),
            metricsApplicationTag = stringOrNull(merged, "management", "metricsApplicationTag") ?: "fullstack-starter",
            activeProfiles = profiles,
        )
    }
}
