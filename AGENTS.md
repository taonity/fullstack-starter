# AGENTS.md

## Architecture

Multi-module Gradle monorepo (Ktor / Kotlin backend + Next.js TypeScript frontend).

- **`backend/`** — Main backend. Kotlin, Ktor (Netty engine), Koin DI, JetBrains Exposed persistence, manual OAuth2 authorization-code flow (Google login). Package-per-feature layout under `org.example.fullstackstarter`: `hello/`, `user/`, `security/`, `observability/`, `actuator/`, `db/`, `di/`, `plugins/`, `config/`, `web/`, `local/`.
- **`google-stubs/`** — WireMock stubs for Google OAuth2 (JSON mappings in `src/main/resources/wiremock/google/mappings/`). Used by the `stub-google` profile for local development without real Google credentials.
- **`frontend/`** — Next.js app (`src/app/` App Router). All backend calls go through Next.js API routes (`src/app/api/`) which proxy to the backend via `src/lib/backend.ts` using `fetchFromBackend()`.
- **`templates/docker/`** — Docker Compose templates with Flyway migrations in `flyway/sql/tables/`.

### Key data flow

1. User logs in via Google OAuth2 → `security/oauth/OAuthService` completes the code exchange and persists/updates the user via `user/service/UserService`.
2. Frontend calls `/api/hello` → Next.js route → backend `/hello` → returns greeting with user info.
3. All API calls are proxied through Next.js API routes (never call backend directly from client).

## Build & Run

The build uses **Gradle** (wrapper at repo root) and requires **JDK 17** (Gradle 8.12.1 does not run on newer JDKs).

```bash
# Full build (from root)
./gradlew build

# Run backend locally (Ktor application run task; ConfigLoader reads --app.profiles)
./gradlew :backend:run --args="--app.profiles=h2,stub-google,local"

# Build the runnable fat jar -> backend/build/libs/backend-all.jar
./gradlew :backend:buildFatJar

# Run frontend
cd frontend && npm install && npm run dev
```

Backend runs on port **8080**, frontend on **3000**.

### Profile system (one per resource group)

| Resource | Local/stub       | Production    |
|----------|------------------|---------------|
| DB       | `h2`             | `postgres`    |
| OAuth2   | `stub-google`    | `prod-google` |
| Logging  | `plain-log`      | *(default)*   |
| General  | `local`          | *(none)*      |

Local set: `h2,stub-google,local` (`local` auto-includes `plain-log`). Production set: `postgres,prod-google`. Stubs use WireMock (classpath mode).

## Conventions & Patterns

- **Package-per-feature**: each feature has `service/`, `dto/`, `entity/`, `repository/` sub-packages plus a `*Routes.kt` defining `Route` extension functions. Follow this layout when adding features.
- **Logging**: use `io.github.oshai.kotlinlogging.KotlinLogging` (`private val LOGGER = KotlinLogging.logger {}`), placed in a `companion object`.
- **Routing pattern**: define endpoints as `Route.xxxRoutes()` extension functions wired in `Application.module()`; protect them with `authenticate("session") { ... }` and read the user via `call.principal<UserSession>()`.
- **Dependency injection**: register beans in Koin modules (`di/AppModule.kt`); resolve in routes/services via constructor injection or `call.application` Koin extensions.
- **CSRF**: SPA pattern via a custom Ktor plugin (`plugins/Csrf.kt`) — issues an `XSRF-TOKEN` cookie and requires the `X-XSRF-TOKEN` header on mutating requests.
- **Sessions**: `Ktor Sessions` store the authenticated `UserSession` (cookie-backed, server-side `SessionStorageMemory`). Session payload classes must be `@Serializable`.
- **Frontend API proxy**: every backend call is proxied through Next.js API routes in `src/app/api/`. Never call the backend directly from client components.
- **DB migrations**: Flyway SQL scripts in `templates/docker/flyway/sql/tables/` (naming: `V100000__description.sql`). H2 profile uses Flyway with `filesystem:` locations.

## Testing

- **HTTP integration tests**: use Ktor's `testApplication` (see `other/ControllerTestsBaseClass`), booting the real `module()` with the `h2,stub-google,wiremock-off` profiles; a shared WireMock stub serves Google OAuth2.
- **Persistence tests**: use the Exposed repositories against in-memory H2 (see `other/UserRepositoryTest`).
- Run tests: `./gradlew :backend:test` (the `smoke`-tagged `SmokeIT` is excluded by default).

## Adding Features

See `docs/ADD_FEATURE.md` for the step-by-step guide.
