package org.taonity.fullstackstarter.demo

import org.assertj.core.api.Assertions.assertThat
import org.taonity.fullstackstarter.common.demo.DemoDataContributor
import org.taonity.fullstackstarter.console.repository.AuditLogRepository
import org.taonity.fullstackstarter.user.entity.AccessRequestStatus
import org.taonity.fullstackstarter.user.entity.ConsoleRole
import org.taonity.fullstackstarter.user.repository.UserRepository
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

@SpringBootTest
@ActiveProfiles("h2", "demo-data")
class DemoDataProfileTest {
    @Autowired
    private lateinit var contributors: List<DemoDataContributor>

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var auditLogRepository: AuditLogRepository

    @Test
    fun `demo profile seeds feature data idempotently`() {
        val pending = userRepository.findByAccessStatusOrderByEmailAsc(AccessRequestStatus.PENDING)
        assertThat(pending).hasSize(2)
        assertThat(pending.map { it.requestedRole }).containsExactly(ConsoleRole.VIEWER, ConsoleRole.EDITOR)

        assertThat(auditLogRepository.count()).isEqualTo(5)
        assertThat(auditLogRepository.existsByActorGoogleId("demo-data-owner")).isTrue()

        assertThat(contributors.sumOf { it.seed() }).isZero()
        assertThat(userRepository.count()).isEqualTo(2)
        assertThat(auditLogRepository.count()).isEqualTo(5)
    }
}
