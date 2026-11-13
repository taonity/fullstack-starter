package org.taonity.fullstackstarter.local

import com.github.tomakehurst.wiremock.WireMockServer
import com.github.tomakehurst.wiremock.client.WireMock.aResponse
import com.github.tomakehurst.wiremock.client.WireMock.get
import com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Profile
import org.springframework.core.annotation.Order
import org.springframework.core.io.ClassPathResource
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator
import org.springframework.stereotype.Component
import org.taonity.fullstackstarter.common.demo.DemoDataContributor
import javax.sql.DataSource

@Component
@Profile("demo & demo-data")
@Order(0)
class ScreenshotDemoDataContributor(
    private val dataSource: DataSource,
    @Qualifier("googleWireMockServer") private val google: WireMockServer,
) : DemoDataContributor {
    override val feature = "portfolio-screenshots"

    override fun seed(): Int {
        dataSource.connection.use { connection ->
            require(connection.metaData.url == "jdbc:h2:mem:fullstack-demo") {
                "Screenshot fixtures require the isolated in-memory demo database"
            }
        }
        val jdbc = JdbcTemplate(dataSource)
        val before = recordCount(jdbc)
        ResourceDatabasePopulator(ClassPathResource("demo/screenshots.sql")).execute(dataSource)
        stubUser("", "demo-data-owner", "Alice Morgan", "alice.morgan@example.com")
        stubUser("/alice", "google-user-alice", "James Chen", "james.chen@example.com")
        stubUser("/bob", "google-user-bob", "Sophia Patel", "sophia.patel@example.com")
        stubUser("/guest", "demo-emma", "Emma Wilson", "emma.wilson@example.com")
        stubUser("/editor", "demo-noah", "Noah Reed", "noah.reed@example.com")
        stubUser("/viewer", "demo-olivia", "Olivia Bennett", "olivia.bennett@example.com")
        return recordCount(jdbc) - before
    }

    private fun recordCount(jdbc: JdbcTemplate): Int =
        jdbc.queryForObject("SELECT (SELECT COUNT(*) FROM app_user) + (SELECT COUNT(*) FROM audit_log)", Int::class.java)!!

    private fun stubUser(path: String, id: String, name: String, email: String) {
        google.stubFor(
            get(urlEqualTo("/oauth2/v3/userinfo$path")).atPriority(1).willReturn(
                aResponse().withHeader("Content-Type", "application/json").withBody(
                    """{"sub":"$id","name":"$name","email":"$email","email_verified":true}"""
                )
            )
        )
    }
}
