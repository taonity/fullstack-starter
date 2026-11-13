package org.taonity.fullstackstarter.security

import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.taonity.fullstackstarter.other.ControllerTestsBaseClass
import org.taonity.fullstackstarter.local.DevRoleUsers

class DevRoleLoginTest : ControllerTestsBaseClass() {
    @Autowired
    private lateinit var roleUsers: DevRoleUsers

    @BeforeEach
    fun seedRoles() {
        roleUsers.seed()
    }

    @Test
    fun `editor and viewer shortcuts authenticate with their actual permissions`() {
        for ((role, canEdit) in listOf("EDITOR" to true, "VIEWER" to false)) {
            val cookie = authorizeOAuth2("stub-${role.lowercase()}")
            mockMvc.perform(get("/console/access/me").cookie(cookie))
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.role").value(role))
                .andExpect(jsonPath("$.canView").value(true))
                .andExpect(jsonPath("$.canEdit").value(canEdit))
                .andExpect(jsonPath("$.isAdmin").value(false))
            mockMvc.perform(get("/console/users").cookie(cookie))
                .andExpect(status().isForbidden)
        }
    }
}
