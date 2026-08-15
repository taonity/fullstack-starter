# Adding / Changing OAuth2 Providers

This template uses Google OAuth2. Here's how to add other providers or switch entirely.

## Adding a New Provider (e.g., GitHub)

### 1. Spring Security Configuration

Add the registration in profile-specific files, mirroring `application-prod-google.yaml` and `application-stub-google.yaml`:

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          github:
            client-id: ${GITHUB_CLIENT_ID}
            client-secret: ${GITHUB_CLIENT_SECRET}
            scope: read:user,user:email
        provider:
          github:
            authorization-uri: https://github.com/login/oauth/authorize
            token-uri: https://github.com/login/oauth/access_token
            user-info-uri: https://api.github.com/user

```

### 2. Update Security Config

No authorization matcher change is required for the standard `/oauth2/authorization/{registrationId}` and `/login/oauth2/code/{registrationId}` endpoints; Spring Security's OAuth2 filters handle them.

### 3. Update the UserPrincipal

You have two approaches:

**A) Unified principal** — Modify `GoogleUserPrincipal` to become a generic `AppUserPrincipal` that handles different attribute schemas.

**B) Provider-specific principals** — Create a `GitHubUserPrincipal` and update `OAuth2UserPersistenceService` to detect the provider and create the right principal.

### 4. Update OAuth2UserPersistenceService

```kotlin
override fun loadUser(userRequest: OAuth2UserRequest?): OAuth2User {
    val validatedUserRequest = requireNotNull(userRequest)
    val oAuth2User = super.loadUser(validatedUserRequest)

    return when (validatedUserRequest.clientRegistration.registrationId) {
        "google-fullstack-starter" -> GoogleUserPrincipal.of(oAuth2User)
        "github" -> GitHubUserPrincipal.of(oAuth2User)
        else -> throw IllegalArgumentException("Unknown OAuth2 provider")
    }
}

```

### 5. Update User Entity

You may want to make the user entity provider-agnostic:

```kotlin
@Entity
@Table(name = "app_user")
class UserEntity(
    @Id val id: String,          // provider-specific ID
    var provider: String,        // "google", "github"
    var email: String,
    var displayName: String,
    var pictureUrl: String? = null
)

```

### 6. Frontend Login Buttons

Update `frontend/src/app/(public)/login/page.tsx` to show login buttons for each provider:

```tsx
<a href={`${config.publicBackendUrl}/oauth2/authorization/google-fullstack-starter`}>Sign in with Google</a>
<a href={`${config.publicBackendUrl}/oauth2/authorization/github`}>Sign in with GitHub</a>

```

## Replacing Google with a Different Provider Entirely

1. Remove the Google registration from `application-prod-google.yaml` and `application-stub-google.yaml`.
2. Add production and stub profiles for the new provider.
3. Create a new `XxxUserPrincipal` class.
4. Update `OAuth2UserPersistenceService` and `OidcUserPersistenceService` for the new attribute schema.
5. Rename `google-stubs/` to match (for example, `github-stubs/`) and update its WireMock resources.
6. Update profile names and the frontend login URL.

## WireMock Stubs for Local Dev

For each provider, place WireMock resources in a dedicated stub module, following `google-stubs/src/main/resources/wiremock/google/`.

```json
{
  "request": {
    "method": "GET",
    "urlPath": "/user"
  },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/json" },
    "jsonBody": {
      "id": 12345,
      "login": "testuser",
      "email": "test@example.com",
      "name": "Test User"
    }
  }
}

```
