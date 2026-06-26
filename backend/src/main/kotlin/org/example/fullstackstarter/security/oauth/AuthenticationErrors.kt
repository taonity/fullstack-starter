package org.example.fullstackstarter.security.oauth

/** Error codes surfaced to the SPA via the `auth_error` cookie on a failed login. */
enum class AuthenticationErrorCode {
    UNAUTHORIZED_ACCOUNT,
    AUTHENTICATION_FAILED
}

/** Thrown when the authenticated Google account is not permitted (e.g. invalid user-info response). */
class UnauthorizedAccountException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)

/** Thrown for generic OAuth2 login failures (token exchange / user-info retrieval problems). */
class OAuthAuthenticationException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)
