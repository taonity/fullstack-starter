package org.example.fullstackstarter.console

import org.example.fullstackstarter.console.entity.AuditAction
import org.example.fullstackstarter.console.entity.AuditLogEntity
import org.example.fullstackstarter.console.repository.AuditLogRepository
import org.example.fullstackstarter.other.ControllerTestsBaseClass
import org.example.fullstackstarter.security.principal.GoogleUserPrincipal
import org.example.fullstackstarter.security.principal.SafeGoogleUserInfo
import org.example.fullstackstarter.user.entity.UserEntity
import org.example.fullstackstarter.user.repository.UserRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant

@ActiveProfiles("h2", inheritProfiles = false)
class ConsoleDataControllerTest : ControllerTestsBaseClass() {

    @Autowired
    private lateinit var auditLogRepository: AuditLogRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @BeforeEach
    fun setUp() {
        auditLogRepository.deleteAll()
        userRepository.save(
            UserEntity(
                googleId = TEST_USER_ID,
                email = "owner@example.com",
                displayName = "Owner",
            ).grantOwner(),
        )
        auditLogRepository.saveAll(
            listOf(
                auditLog(AuditAction.RESET_CONFIG, "z-record", Instant.parse("2026-01-01T00:00:00Z")),
                auditLog(AuditAction.APPROVE_ACCESS, "a-record", Instant.parse("2026-01-03T00:00:00Z")),
                auditLog(AuditAction.CHANGE_ROLE, "m-record", Instant.parse("2026-01-02T00:00:00Z")),
            ),
        )
    }

    @Test
    fun `sorts unfiltered and searched audit logs by requested columns`() {
        mockMvc.perform(
            get("/console/audit-logs")
                .with(oauth2Login().oauth2User(principal()))
                .param("sort", "action")
                .param("direction", "asc"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].action").value("APPROVE_ACCESS"))
            .andExpect(jsonPath("$.content[1].action").value("CHANGE_ROLE"))
            .andExpect(jsonPath("$.content[2].action").value("RESET_CONFIG"))

        mockMvc.perform(
            get("/console/audit-logs")
                .with(oauth2Login().oauth2User(principal()))
                .param("q", "record")
                .param("sort", "targetId")
                .param("direction", "desc"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].targetId").value("z-record"))
            .andExpect(jsonPath("$.content[1].targetId").value("m-record"))
            .andExpect(jsonPath("$.content[2].targetId").value("a-record"))
    }

    private fun auditLog(action: AuditAction, targetId: String, occurredAt: Instant) = AuditLogEntity(
        action = action,
        targetType = "CONFIG",
        targetId = targetId,
        actorGoogleId = "audit-test-user",
        actorEmail = "audit@example.com",
        occurredAt = occurredAt,
    )

    private fun principal() = GoogleUserPrincipal(
        authorities = emptyList(),
        attributes = mapOf("sub" to TEST_USER_ID),
        safeGoogleUserInfo = SafeGoogleUserInfo(
            id = TEST_USER_ID,
            email = "owner@example.com",
            displayName = "Owner",
            pictureUrl = null,
        ),
        nameAttributeKey = "sub",
    )

    companion object {
        private const val TEST_USER_ID = "audit-test-owner"
    }
}