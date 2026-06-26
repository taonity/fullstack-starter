package org.example.fullstackstarter.advisory

import io.ktor.server.application.ApplicationCall
import io.ktor.util.AttributeKey

/**
 * Per-call collector of advisories. The former Spring `@RequestScope` bean is replaced by a value
 * stored in [ApplicationCall.attributes]; use [ApplicationCall.responseAttachments] to access it.
 */
class ResponseAttachments {
    private val notices: MutableMap<Advisory, List<String>> = linkedMapOf()

    val advisories: MutableSet<Advisory> = object : AbstractMutableSet<Advisory>() {
        override val size: Int get() = notices.size
        override fun iterator() = notices.keys.iterator()
        override fun add(element: Advisory): Boolean {
            if (notices.containsKey(element)) return false
            notices[element] = emptyList()
            return true
        }
    }

    fun add(advisory: Advisory, vararg args: String) {
        notices[advisory] = args.toList()
    }

    fun advisoryDtos(): Set<AdvisoryDto> =
        notices.entries.map { (advisory, args) -> advisory.toDto(args) }.toSet()

    companion object {
        val KEY = AttributeKey<ResponseAttachments>("ResponseAttachments")
    }
}

/** Lazily creates and returns the [ResponseAttachments] bound to this call. */
val ApplicationCall.responseAttachments: ResponseAttachments
    get() = attributes.computeIfAbsent(ResponseAttachments.KEY) { ResponseAttachments() }
