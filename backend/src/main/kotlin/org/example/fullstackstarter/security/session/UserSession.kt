package org.example.fullstackstarter.security.session

import kotlinx.serialization.Serializable
import org.example.fullstackstarter.security.principal.GoogleUserPrincipal
import org.example.fullstackstarter.security.principal.SafeGoogleUserInfo

/**
 * Server-side session payload for an authenticated user (stored via Ktor Sessions, akin to the
 * former Spring `SecurityContext` persisted in the HTTP session / JSESSIONID cookie).
 */
@Serializable
data class UserSession(
    val googleId: String,
    val email: String,
    val displayName: String,
    val pictureUrl: String?
) {
    fun toPrincipal(): GoogleUserPrincipal =
        GoogleUserPrincipal(SafeGoogleUserInfo(googleId, email, displayName, pictureUrl))

    companion object {
        fun fromPrincipal(principal: GoogleUserPrincipal): UserSession = UserSession(
            googleId = principal.getGoogleId(),
            email = principal.getEmail(),
            displayName = principal.getDisplayName(),
            pictureUrl = principal.getPictureUrl()
        )
    }
}
