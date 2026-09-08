package org.taonity.fullstackstarter.advisory

data class AdvisoryResponse(
    val advisories: Set<AdvisoryDto> = setOf()
)
