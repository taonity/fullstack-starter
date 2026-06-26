package org.example.fullstackstarter.health

import javax.sql.DataSource

/** Database connectivity health (replaces Spring Boot's auto-configured `DataSourceHealthIndicator`). */
class DbHealthIndicator(
    private val dataSource: DataSource
) : HealthIndicator {

    override val name: String = "db"

    override suspend fun health(): Health = try {
        dataSource.connection.use { connection ->
            if (connection.isValid(1)) {
                Health.up(mapOf("database" to connection.metaData.databaseProductName))
            } else {
                Health.down(mapOf("error" to "connection not valid"))
            }
        }
    } catch (exception: Exception) {
        Health.down(mapOf("error" to (exception.message ?: exception::class.simpleName ?: "unknown")))
    }
}
