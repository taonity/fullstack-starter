package org.example.fullstackstarter.security.oauth

import com.fasterxml.jackson.databind.ObjectMapper
import com.google.api.services.oauth2.model.Userinfo
import io.github.oshai.kotlinlogging.KotlinLogging
import io.ktor.client.HttpClient
import io.ktor.client.request.forms.submitForm
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.Parameters
import io.ktor.http.URLBuilder
import io.ktor.http.isSuccess
import org.example.fullstackstarter.config.OAuthConfig
import org.example.fullstackstarter.security.principal.GoogleUserPrincipal
import org.example.fullstackstarter.security.principal.SafeGoogleUserInfo
import org.example.fullstackstarter.user.service.UserService

/**
 * Implements the OAuth2 authorization-code flow against the configured provider (Google or the
 * WireMock stub). Replaces Spring Security's `oauth2Login`, `DefaultOAuth2UserService` and
 * `OidcUserService` while keeping the same endpoints and the same user-persistence side effect.
 */
class OAuthService(
    private val oauth: OAuthConfig,
    private val httpClient: HttpClient,
    private val userService: UserService,
    private val objectMapper: ObjectMapper
) {
    companion object {
        private val LOGGER = KotlinLogging.logger {}
    }

    fun buildAuthorizationUrl(state: String, redirectUri: String): String {
        val builder = URLBuilder(oauth.provider.authorizationUri)
        builder.parameters.append("response_type", "code")
        builder.parameters.append("client_id", oauth.registration.clientId)
        builder.parameters.append("redirect_uri", redirectUri)
        builder.parameters.append("scope", oauth.registration.scopeParam)
        builder.parameters.append("state", state)
        return builder.buildString()
    }

    /** Exchanges the authorization code, fetches user-info, persists the user and returns the principal. */
    suspend fun completeLogin(code: String, redirectUri: String): GoogleUserPrincipal {
        val accessToken = requestAccessToken(code, redirectUri)
        val userinfo = fetchUserInfo(accessToken)
        val safeGoogleUserInfo = try {
            SafeGoogleUserInfo.fromApi(userinfo)
        } catch (e: IllegalArgumentException) {
            LOGGER.warn { "User authentication failed due to invalid user info: ${e.message}" }
            throw UnauthorizedAccountException(e.message ?: "invalid_user_info_response", e)
        }
        val principal = GoogleUserPrincipal.of(safeGoogleUserInfo)
        userService.createOrUpdateUser(principal)
        return principal
    }

    private suspend fun requestAccessToken(code: String, redirectUri: String): String {
        val response = httpClient.submitForm(
            url = oauth.provider.tokenUri,
            formParameters = Parameters.build {
                append("grant_type", "authorization_code")
                append("code", code)
                append("redirect_uri", redirectUri)
                append("client_id", oauth.registration.clientId)
                append("client_secret", oauth.registration.clientSecret)
            }
        )
        if (!response.status.isSuccess()) {
            throw OAuthAuthenticationException("Token endpoint returned ${response.status}: ${response.bodyAsText()}")
        }
        val node = objectMapper.readTree(response.bodyAsText())
        return node.path("access_token").asText(null)
            ?: throw OAuthAuthenticationException("Token response did not contain an access_token")
    }

    private suspend fun fetchUserInfo(accessToken: String): Userinfo {
        val response = httpClient.get(oauth.provider.userInfoUri) {
            header(HttpHeaders.Authorization, "Bearer $accessToken")
        }
        if (response.status == HttpStatusCode.Unauthorized || !response.status.isSuccess()) {
            throw OAuthAuthenticationException("User-info endpoint returned ${response.status}")
        }
        val attributes: Map<String, Any?> = objectMapper.readValue(
            response.bodyAsText(),
            objectMapper.typeFactory.constructMapType(LinkedHashMap::class.java, String::class.java, Any::class.java)
        )
        return toUserinfo(attributes)
    }

    private fun toUserinfo(attributes: Map<String, Any?>): Userinfo {
        val userinfo = Userinfo()
        userinfo.id = attributes["sub"] as? String
        userinfo.email = attributes["email"] as? String
        userinfo.name = attributes["name"] as? String
        userinfo.givenName = attributes["given_name"] as? String
        userinfo.familyName = attributes["family_name"] as? String
        userinfo.picture = attributes["picture"] as? String
        userinfo.verifiedEmail = attributes["email_verified"] as? Boolean
        return userinfo
    }
}
