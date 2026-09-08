package org.taonity.fullstackstarter

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class FullstackStarterApplication

fun main(args: Array<String>) {
    runApplication<org.taonity.fullstackstarter.FullstackStarterApplication>(*args)
}
