package org.example.fullstackstarter.security.exception

import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode

class RestClientErrorException(
    httpStatusCode: HttpStatusCode,
    method: HttpMethod,
    uri: String,
    requestHeadersJson: String,
    body: String
) : RuntimeException(buildMessage(httpStatusCode, method, uri, requestHeadersJson, body)) {
    companion object {
        fun buildMessage(
            httpStatusCode: HttpStatusCode,
            method: HttpMethod,
            uri: String,
            requestHeadersJson: String,
            body: String
        ): String {
            return "Request failed: $httpStatusCode, [${method.value}] $uri, request headers: $requestHeadersJson, response body: [$body]"
        }
    }
}
