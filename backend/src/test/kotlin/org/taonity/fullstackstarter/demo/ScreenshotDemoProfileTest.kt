package org.taonity.fullstackstarter.demo

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.taonity.fullstackstarter.common.demo.DemoDataContributor
import org.taonity.fullstackstarter.user.entity.AccessRequestStatus
import org.taonity.fullstackstarter.user.entity.ConsoleRole
import org.taonity.fullstackstarter.user.repository.UserRepository
import java.time.LocalDateTime
import javax.sql.DataSource

@SpringBootTest
@ActiveProfiles("h2", "stub-google", "demo-data", "demo-settings", "demo")
class ScreenshotDemoProfileTest {
    @Autowired
    private lateinit var dataSource: DataSource

    @Autowired
    private lateinit var users: UserRepository

    @Autowired
    private lateinit var contributors: List<DemoDataContributor>

    @Test
    fun `screenshot fixtures are isolated deterministic and idempotent`() {
        dataSource.connection.use { assertThat(it.metaData.url).isEqualTo("jdbc:h2:mem:fullstack-demo") }
        val jdbc = JdbcTemplate(dataSource)
        assertThat(users.findByAccessStatusOrderByEmailAsc(AccessRequestStatus.PENDING).map { it.displayName })
            .containsExactly("James Chen", "Sophia Patel")
        assertThat(users.findById("demo-data-owner").orElseThrow().role).isEqualTo(ConsoleRole.OWNER)
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log", Int::class.java)).isEqualTo(5)
        assertThat(jdbc.queryForObject("SELECT MAX(occurred_at) FROM audit_log", java.sql.Timestamp::class.java)?.toLocalDateTime())
            .isEqualTo(LocalDateTime.parse("2026-06-15T10:24:00"))
        assertThat(contributors.sumOf { it.seed() }).isZero()
        assertThat(users.count()).isEqualTo(7)
    }
}
