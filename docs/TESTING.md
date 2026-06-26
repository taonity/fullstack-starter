# Testing

## Backend Tests

### Running Tests

```bash
# All tests
./gradlew test

# Backend only
./gradlew :backend:test

# Single test
./gradlew :backend:test --tests "*HelloControllerTest"
```

### Test Patterns

#### Integration Tests (Routes)

Boot the real application with Ktor's `testApplication`. Extend `ControllerTestsBaseClass`, which
starts the app with the `h2,stub-google,wiremock-off` profiles and a shared Google WireMock stub.

```kotlin
class YourRoutesTest : ControllerTestsBaseClass() {

    @Test
    fun `endpoint requires authentication`() = withApp {
        val response = client.get("/your-endpoint")
        assertThat(response.status).isEqualTo(HttpStatusCode.Unauthorized)
    }

    @Test
    fun `authenticated user can access endpoint`() = withApp {
        val sessionCookie = authorizeOAuth2()
        val response = client.get("/your-endpoint") {
            header("Cookie", "$sessionCookieName=$sessionCookie")
        }
        assertThat(response.status).isEqualTo(HttpStatusCode.OK)
        assertThat(response.bodyAsText()).contains("expected")
    }
}
```

#### Repository Tests

Exercise the Exposed repositories against in-memory H2 with the real Flyway migrations applied
(`--app.profiles=h2`).

```kotlin
class YourRepositoryTest {

    private lateinit var databaseFactory: DatabaseFactory
    private val repository = YourRepository()

    @BeforeEach
    fun setUp() {
        databaseFactory = DatabaseFactory(ConfigLoader.load(arrayOf("--app.profiles=h2")))
        databaseFactory.connect()
    }

    @AfterEach
    fun tearDown() = databaseFactory.close()

    @Test
    fun `save and find by id`() {
        repository.save(YourEntity("id-1", "test"))
        assertThat(repository.findById("id-1")).isNotNull
    }
}
```

### Test Profiles

- `h2` — Uses in-memory H2 database with Flyway migrations
- `stub-google` — Drives the Google OAuth2 stub (WireMock); tests authenticate via `authorizeOAuth2()`

## Frontend Tests

### Running Tests

```bash
cd frontend
npm test           # Single run
npm run test:watch # Watch mode
```

### Test Patterns

Tests use Vitest. Place test files next to source files or in `__tests__/` directories:

```typescript
// src/lib/backend.test.ts
import { describe, it, expect } from 'vitest'

describe('fetchFromBackend', () => {
  it('passes cookies from request', () => {
    // ...
  })
})
```
