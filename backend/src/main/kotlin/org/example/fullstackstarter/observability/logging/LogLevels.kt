package org.example.fullstackstarter.observability.logging

import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.LoggerContext
import org.slf4j.LoggerFactory

/** Applies the configured per-logger levels programmatically (replaces Spring's `logging.level.*`). */
fun applyLogLevels(levels: Map<String, String>) {
    if (levels.isEmpty()) return
    val context = LoggerFactory.getILoggerFactory() as LoggerContext
    levels.forEach { (name, level) ->
        val loggerName = if (name.equals("root", ignoreCase = true)) Logger.ROOT_LOGGER_NAME else name
        context.getLogger(loggerName).level = Level.toLevel(level, Level.INFO)
    }
}
