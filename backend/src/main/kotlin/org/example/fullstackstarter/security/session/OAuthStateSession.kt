package org.example.fullstackstarter.security.session

import kotlinx.serialization.Serializable

/**
 * Short-lived OAuth2 authorization-code-flow state, persisted in a dedicated cookie between the
 * redirect to the provider and the callback (replaces Spring Security's
 * `HttpSessionOAuth2AuthorizationRequestRepository`).
 */
@Serializable
data class OAuthStateSession(
    val state: String,
    val redirectUri: String
)
