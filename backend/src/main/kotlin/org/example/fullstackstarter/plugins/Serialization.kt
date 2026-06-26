package org.example.fullstackstarter.plugins

import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import io.ktor.serialization.jackson.jackson
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation

/** JSON (de)serialization via Jackson (replaces Spring MVC's Jackson message converters). */
fun Application.configureSerialization() {
    install(ContentNegotiation) {
        jackson {
            registerKotlinModule()
            configure(SerializationFeature.INDENT_OUTPUT, false)
        }
    }
}
