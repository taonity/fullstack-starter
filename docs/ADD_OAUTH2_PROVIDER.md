# Adding / Changing OAuth2 Providers

This template uses Google OAuth2 via a hand-rolled authorization-code flow (`security/oauth/OAuthService`
+ `security/oauth/OAuthRoutes`). A single provider registration is active at a time, selected by the
active profile (e.g. `stub-google`, `prod-google`). Here's how to point it at a different provider.

## Configuring a Provider (e.g., GitHub)

### 1. Provider configuration

In a profile YAML (e.g. `application-prod-github.yaml`), add the `oauth` block. The schema maps to
`config/AppConfig.kt` (`OAuthConfig`):

```yaml
oauth:
  registration:
    registrationId: github
    clientId: ${GITHUB_CLIENT_ID}
    clientSecret: ${GITHUB_CLIENT_SECRET}
    redirectUri: http://127.0.0.1:8080/login/oauth2/code/github
    scope: read:user,user:email
  provider:
    authorizationUri: https://github.com/login/oauth/authorize
    tokenUri: https://github.com/login/oauth/access_token
    userInfoUri: https://api.github.com/user
```

The OAuth routes are generic: `GET /oauth2/authorization/{registrationId}` and
`GET /login/oauth2/code/{registrationId}` match the configured `registrationId` — no per-provider
security filter chain to edit.

### 2. Map the provider's user-info

`OAuthService.toUserinfo()` maps the user-info JSON to the internal model. Different providers use
different attribute names, so adjust the keys (GitHub uses `id`/`login` instead of `sub`):

```kotlin
private fun toUserinfo(attributes: Map<String, Any?>): Userinfo {
    val userinfo = Userinfo()
    userinfo.id = attributes["id"]?.toString()        // GitHub: numeric id
    userinfo.email = attributes["email"] as? String
    userinfo.name = (attributes["name"] ?: attributes["login"]) as? String
    userinfo.picture = attributes["avatar_url"] as? String
    return userinfo
}
```

If you need provider-specific validation, adapt `SafeGoogleUserInfo.fromApi(...)` (or introduce a
provider-agnostic equivalent) — it is where required fields are enforced before the user is persisted.

### 3. User Entity

The `app_user` table is keyed by the provider's stable user id (`UsersTable.googleId` / `UserEntity`).
To make it provider-agnostic, rename the column via a Flyway migration and optionally add a `provider`
column; update `db/UsersTable.kt` and `user/entity/UserEntity.kt` accordingly.

### 4. Frontend Login Buttons

Update `frontend/src/app/(app)/page.tsx` to link to the configured registration id:

```tsx
<a href={`${config.publicBackendUrl}/oauth2/authorization/github`}>Sign in with GitHub</a>
```

## Replacing Google Entirely

1. Create a `prod-<provider>` (and optional `stub-<provider>`) profile with the `oauth` block above
2. Adjust `OAuthService.toUserinfo()` (and `SafeGoogleUserInfo`) for the new attributes
3. Update the frontend login link to `/oauth2/authorization/<registrationId>`
4. For local dev, add a WireMock stubs module (like `google-stubs/`) and register it in `settings.gradle.kts`
5. Point the `stub-<provider>` profile's `wiremock.classpathRoot` at the new stubs

## WireMock Stubs for Local Dev

For each provider, add stubs under a stubs module's `src/main/resources/wiremock/<provider>/mappings/`:

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

