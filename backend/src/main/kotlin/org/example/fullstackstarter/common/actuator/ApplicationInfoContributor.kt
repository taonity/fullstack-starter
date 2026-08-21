package org.example.fullstackstarter.common.actuator

import org.springframework.boot.actuate.info.Info
import org.springframework.boot.actuate.info.InfoContributor
import org.springframework.boot.info.BuildProperties
import org.springframework.boot.info.GitProperties
import org.springframework.stereotype.Component

@Component
class ApplicationInfoContributor(
    private val buildProperties: BuildProperties,
    private val gitProperties: GitProperties
) : InfoContributor {

    override fun contribute(builder: Info.Builder) {
        builder
            .withDetail(
                "app",
                mapOf(
                    "name" to buildProperties.name,
                    "version" to buildProperties.version
                )
            )
            .withDetail(
                "git",
                mapOf(
                    "commit" to gitProperties["commit.id.full"],
                    "branch" to gitProperties.branch
                )
            )
            .withDetail("build", mapOf("time" to buildProperties.time))
    }
}
