package org.taonity.fullstackstarter.console.service

import org.taonity.fullstackstarter.config.AppSettings
import org.taonity.fullstackstarter.console.dto.AuditLogDto
import org.taonity.fullstackstarter.console.dto.PageResponse
import org.taonity.fullstackstarter.console.repository.AuditLogRepository
import org.taonity.fullstackstarter.security.principal.GoogleUserPrincipal
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service

@Service
class ConsoleDataService(
    private val auditLogRepository: AuditLogRepository,
    private val accessGuard: AccessGuard,
    private val settings: AppSettings,
) {
    fun listAuditLogs(
        principal: GoogleUserPrincipal,
        q: String?,
        field: String?,
        sort: String,
        direction: String,
        page: Int,
        size: Int,
    ): PageResponse<AuditLogDto> {
        accessGuard.requireAdmin(principal)
        val sortProperty = AUDIT_SORT_FIELDS[sort] ?: "occurredAt"
        val sortDirection = if (direction.equals("asc", ignoreCase = true)) Sort.Direction.ASC else Sort.Direction.DESC
        val pageable = PageRequest.of(
            page.coerceAtLeast(0),
            size.coerceIn(1, settings.console().maxPageSize),
            Sort.by(sortDirection, sortProperty).and(Sort.by(Sort.Direction.DESC, "id")),
        )
        val result = if (q.isNullOrBlank()) {
            auditLogRepository.findAll(pageable)
        } else {
            auditLogRepository.search(q.trim(), field.orAllField(), pageable)
        }
        return PageResponse.of(result, AuditLogDto::from)
    }

    private fun String?.orAllField(): String = this?.takeIf { it.isNotBlank() } ?: "all"

    companion object {
        private val AUDIT_SORT_FIELDS = mapOf(
            "occurredAt" to "occurredAt",
            "action" to "action",
            "targetType" to "targetType",
            "targetId" to "targetId",
            "actorEmail" to "actorEmail",
        )
    }
}
