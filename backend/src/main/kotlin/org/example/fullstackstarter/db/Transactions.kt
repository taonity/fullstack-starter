package org.example.fullstackstarter.db

import org.jetbrains.exposed.sql.Slf4jSqlDebugLogger
import org.jetbrains.exposed.sql.Transaction
import org.jetbrains.exposed.sql.addLogger
import org.jetbrains.exposed.sql.transactions.transaction

/**
 * Runs an Exposed transaction with SQL statement logging attached (logged at DEBUG via SLF4J).
 * Preserves the database-change visibility previously provided by the Hibernate entity-change
 * listeners.
 */
fun <T> loggedTransaction(statement: Transaction.() -> T): T = transaction {
    addLogger(Slf4jSqlDebugLogger)
    statement()
}
