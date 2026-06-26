package org.example.fullstackstarter.db

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.github.oshai.kotlinlogging.KotlinLogging
import org.example.fullstackstarter.config.AppConfig
import org.flywaydb.core.Flyway
import org.jetbrains.exposed.sql.Database
import javax.sql.DataSource

/**
 * Builds the HikariCP datasource, runs Flyway migrations (replacing Spring Boot's Flyway
 * auto-configuration + the former `LocalFlywayConfig` clean-migrate strategy) and connects Exposed.
 */
class DatabaseFactory(private val config: AppConfig) {

    companion object {
        private val LOGGER = KotlinLogging.logger {}
    }

    lateinit var dataSource: HikariDataSource
        private set

    fun connect(): Database {
        dataSource = HikariDataSource(
            HikariConfig().apply {
                jdbcUrl = config.datasource.url
                username = config.datasource.username
                password = config.datasource.password
                driverClassName = config.datasource.driverClassName
                maximumPoolSize = 10
                isAutoCommit = false
                poolName = "fullstack-starter-pool"
            }
        )
        migrate(dataSource)
        return Database.connect(dataSource)
    }

    private fun migrate(ds: DataSource) {
        if (!config.flyway.enabled) {
            LOGGER.info { "Flyway disabled; skipping migrations" }
            return
        }
        val flyway = Flyway.configure()
            .dataSource(ds)
            .locations(*config.flyway.locations.toTypedArray())
            .cleanDisabled(config.flyway.cleanDisabled)
            .load()
        if (config.flyway.cleanMigrate) {
            LOGGER.info { "Running Flyway clean + migrate (flyway-clean-migrate profile)" }
            flyway.clean()
        }
        flyway.migrate()
    }

    fun close() {
        if (::dataSource.isInitialized) {
            dataSource.close()
        }
    }
}
