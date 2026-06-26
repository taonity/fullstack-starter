package org.example.fullstackstarter.security.principal

/**
 * Authenticated Google user. Plain replacement for the former Spring Security `OidcUser`
 * implementation; only the fields the application actually needs are retained.
 */
class GoogleUserPrincipal(
    val safeGoogleUserInfo: SafeGoogleUserInfo
) {
    fun getName(): String = safeGoogleUserInfo.displayName

    fun getGoogleId(): String = safeGoogleUserInfo.id

    fun getEmail(): String = safeGoogleUserInfo.email

    fun getDisplayName(): String = safeGoogleUserInfo.displayName

    fun getPictureUrl(): String? = safeGoogleUserInfo.pictureUrl

    companion object {
        fun of(safeGoogleUserInfo: SafeGoogleUserInfo): GoogleUserPrincipal =
            GoogleUserPrincipal(safeGoogleUserInfo)
    }
}
