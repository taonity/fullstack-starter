package org.example.fullstackstarter.observability.logging

import ch.qos.logback.classic.spi.ILoggingEvent
import net.logstash.logback.encoder.LogstashEncoder

/** Logstash JSON encoder that masks secrets in the serialized output (replaces the Spring Boot StructuredLogEncoder). */
class MaskingStructuredLogEncoder : LogstashEncoder() {

    private val masker = LogMasker()

    fun addMaskPattern(maskPattern: String) {
        masker.addMaskPattern(maskPattern)
    }

    override fun encode(event: ILoggingEvent): ByteArray {
        val raw = super.encode(event)
        val masked = masker.mask(String(raw, Charsets.UTF_8))
        return masked.toByteArray(Charsets.UTF_8)
    }
}
