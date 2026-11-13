package org.taonity.fullstackstarter.security

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.taonity.fullstackstarter.other.ControllerTestsBaseClass
import org.taonity.fullstackstarter.user.entity.AccessRequestStatus
import org.taonity.fullstackstarter.user.entity.ConsoleRole
import org.taonity.fullstackstarter.user.entity.UserEntity
import org.taonity.fullstackstarter.user.repository.UserRepository

class DefaultViewerLoginTest : ControllerTestsBaseClass() {
    @Autowired
    private lateinit var users: UserRepository

    @BeforeEach
    @AfterEach
    fun clearUser() {
        users.deleteById(USER_ID)
    }

    @Test
    fun `first login grants approved viewer access without an access request`() {
        val cookie = authorizeOAuth2("stub-bob")
        mockMvc.perform(get("/console/access/me").cookie(cookie))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.role").value("VIEWER"))
            .andExpect(jsonPath("$.accessStatus").value("APPROVED"))
            .andExpect(jsonPath("$.requestedRole").isEmpty)
            .andExpect(jsonPath("$.canView").value(true))
            .andExpect(jsonPath("$.canEdit").value(false))
            .andExpect(jsonPath("$.isAdmin").value(false))
            .andExpect(jsonPath("$.isOwner").value(false))
        mockMvc.perform(get("/console/config").cookie(cookie))
            .andExpect(status().isOk)
        mockMvc.perform(get("/console/users").cookie(cookie))
            .andExpect(status().isForbidden)
        val saved = users.findById(USER_ID).orElseThrow()
        assertThat(saved.role).isEqualTo(ConsoleRole.VIEWER)
        assertThat(saved.accessStatus).isEqualTo(AccessRequestStatus.APPROVED)
        val ownerCookie = authorizeOAuth2()
        mockMvc.perform(get("/console/access/me").cookie(ownerCookie))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.role").value("OWNER"))
    }

    @Test
    fun `repeat login preserves assigned roles and pending or rejected access decisions`() {
        val assignments = ConsoleRole.entries.filter { it != ConsoleRole.NONE }
            .map { it to AccessRequestStatus.APPROVED } + listOf(
            ConsoleRole.NONE to AccessRequestStatus.NONE,
            ConsoleRole.NONE to AccessRequestStatus.REJECTED,
            ConsoleRole.VIEWER to AccessRequestStatus.PENDING,
        )
        for ((role, accessStatus) in assignments) {
            val requestedRole = if (accessStatus == AccessRequestStatus.PENDING) ConsoleRole.EDITOR else null
            users.save(UserEntity(
                googleId = USER_ID, email = "bob@example.com", displayName = "Old name",
                role = role, accessStatus = accessStatus, requestedRole = requestedRole,
            ))
            authorizeOAuth2("stub-bob")
            val saved = users.findById(USER_ID).orElseThrow()
            assertThat(saved.displayName).isEqualTo("Bob Tester")
            assertThat(saved.role).isEqualTo(role)
            assertThat(saved.accessStatus).isEqualTo(accessStatus)
            assertThat(saved.requestedRole).isEqualTo(requestedRole)
        }
    }

    companion object {
        private const val USER_ID = "google-user-bob"
    }
}
