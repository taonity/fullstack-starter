package org.taonity.fullstackstarter.web.exception

data class ClientErrorResponse(
    val clientErrorCode: ClientErrorCode,
    val errorMessage: String
)
