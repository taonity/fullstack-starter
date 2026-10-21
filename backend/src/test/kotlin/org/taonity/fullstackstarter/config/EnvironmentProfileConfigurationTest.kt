package org.taonity.fullstackstarter.config

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer
import org.springframework.boot.test.context.runner.ApplicationContextRunner
import java.nio.file.Files
import java.nio.file.Path

class EnvironmentProfileConfigurationTest {

    @Test
    fun `container secrets resolve from required configuration tree`(@TempDir directory: Path) {
        val secrets = mapOf(
            "POSTGRES_APP_USER" to "fixture_app",
            "POSTGRES_APP_PASSWORD" to "fixture:password'\\dollar$",
            "GOOGLE_CLIENT_ID" to "fixture-client",
            "GOOGLE_CLIENT_SECRET" to "fixture-google-secret",
        )
        secrets.forEach { (name, value) -> Files.writeString(directory.resolve(name), value) }

        ApplicationContextRunner()
            .withInitializer(ConfigDataApplicationContextInitializer())
            .withSystemProperties(
                "spring.profiles.active=stage",
                "spring.config.import=configtree:${directory.toAbsolutePath().toString().replace('\\', '/')}/",
            )
            .run { context ->
                assertThat(context.startupFailure).isNull()
                val environment = context.environment
                assertThat(environment.getProperty("POSTGRES_APP_PASSWORD"))
                    .isEqualTo(secrets["POSTGRES_APP_PASSWORD"])
                assertThat(environment.getProperty("spring.security.oauth2.client.registration.google-fullstack-starter.client-secret"))
                    .isEqualTo(secrets["GOOGLE_CLIENT_SECRET"])
            }
    }

    @Test
    fun `missing required secret directory fails startup`(@TempDir directory: Path) {
        ApplicationContextRunner()
            .withInitializer(ConfigDataApplicationContextInitializer())
            .withSystemProperties("spring.config.import=configtree:${directory.resolve("missing").toAbsolutePath().toString().replace('\\', '/')}/")
            .run { context -> assertThat(context.startupFailure).isNotNull() }
    }

    @Test
    fun `stage profile loads its public deployment configuration`() {
        assertEnvironmentProfile(
            profile = "stage",
            frontendUrl = "https://fullstack-starter-stage.taonity.org",
            sessionCookieName = "JSESSIONID-FULLSTACK-STARTER-STAGE",
            csrfCookieName = "XSRF-TOKEN-FULLSTACK-STARTER-STAGE",
        )
    }

    @Test
    fun `prod profile loads its public deployment configuration`() {
        assertEnvironmentProfile(
            profile = "prod",
            frontendUrl = "https://fullstack-starter.taonity.org",
            sessionCookieName = "JSESSIONID-FULLSTACK-STARTER-PROD",
            csrfCookieName = "XSRF-TOKEN-FULLSTACK-STARTER-PROD",
        )
    }

    private fun assertEnvironmentProfile(
        profile: String,
        frontendUrl: String,
        sessionCookieName: String,
        csrfCookieName: String,
    ) {
        ApplicationContextRunner()
            .withInitializer(ConfigDataApplicationContextInitializer())
            .withSystemProperties("spring.profiles.active=$profile")
            .run { context ->
                val environment = context.environment

                assertThat(environment.getProperty("app.default-success-url")).isEqualTo(frontendUrl)
                assertThat(environment.getProperty("app.login-url")).isEqualTo("$frontendUrl/login")
                assertThat(environment.getProperty("server.servlet.session.cookie.domain"))
                    .isEqualTo("taonity.org")
                assertThat(environment.getProperty("server.servlet.session.cookie.name"))
                    .isEqualTo(sessionCookieName)
                assertThat(environment.getProperty("app.csrf-cookie-name")).isEqualTo(csrfCookieName)
                assertThat(environment.getProperty("spring.datasource.url"))
                    .isEqualTo("jdbc:postgresql://db:5432/fullstack_starter_db")
                assertThat(environment.getProperty("spring.security.oauth2.client.provider.google.authorization-uri"))
                    .isEqualTo("https://accounts.google.com/o/oauth2/v2/auth")
            }
    }
}