package org.taonity.fullstackstarter.console.controller

import org.taonity.fullstackstarter.console.dto.AuditLogDto
import org.taonity.fullstackstarter.console.dto.AuditLogDateRangeDto
import org.taonity.fullstackstarter.console.dto.PageResponse
import org.taonity.fullstackstarter.console.service.ConsoleDataService
import org.taonity.fullstackstarter.security.principal.GoogleUserPrincipal
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequestMapping("/console")
class ConsoleDataController(
    private val consoleDataService: ConsoleDataService,
) {
    @GetMapping("/audit-logs/date-range")
    fun auditLogDateRange(
        @AuthenticationPrincipal principal: GoogleUserPrincipal,
    ): AuditLogDateRangeDto = consoleDataService.auditLogDateRange(principal)

    @GetMapping("/audit-logs")
    fun auditLogs(
        @AuthenticationPrincipal principal: GoogleUserPrincipal,
        @RequestParam(required = false) q: String?,
        @RequestParam(required = false) field: String?,
        @RequestParam(defaultValue = "false") exact: Boolean,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) startDate: LocalDate?,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) endDate: LocalDate?,
        @RequestParam(defaultValue = "occurredAt") sort: String,
        @RequestParam(defaultValue = "desc") direction: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int,
    ): PageResponse<AuditLogDto> = consoleDataService.listAuditLogs(
        principal, q, field, sort, direction, page, size, exact, startDate, endDate,
    )
}
