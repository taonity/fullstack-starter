package org.taonity.fullstackstarter.console.service

import io.github.oshai.kotlinlogging.KotlinLogging
import org.taonity.fullstackstarter.config.AppSettings
import org.taonity.fullstackstarter.console.repository.AuditLogRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.temporal.ChronoUnit

@Service
class AuditLogCleanupService(
    private val auditLogRepository: AuditLogRepository,
    private val settings: AppSettings,
) {
    companion object {
        private val LOGGER = KotlinLogging.logger {}
    }

    @Transactional
    fun cleanupOldAuditLogs() {
        val cutoff = Instant.now().minus(settings.retention().audit.retentionDays, ChronoUnit.DAYS)
        val removed = auditLogRepository.deleteByOccurredAtBefore(cutoff)
        LOGGER.info { "Audit log retention cleanup: removed $removed entries older than $cutoff" }
    }
}
