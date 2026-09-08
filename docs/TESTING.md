# Testing

## Commands

Run each command from the repository root.

All backend tests:

```bash
./gradlew test
```

Backend only:

```bash
./gradlew :backend:test
```

Single backend test:

```bash
./gradlew :backend:test --tests '*LazyFetchingArchitectureTest'
```

Demo-data profile and idempotency:

```bash
./gradlew :backend:test --tests '*DemoDataProfileTest'
```

Smoke tests require Docker and both application images. The command below matches the registry in `templates/docker/.env.test`:

```bash
docker build -t generaltao725/fullstack-starter-frontend:latest frontend; ./gradlew :backend:jibDockerBuild :backend:smokeTest
```

Frontend tests once:

```bash
npm test --prefix frontend
```

Frontend tests in watch mode:

```bash
npm run test:watch --prefix frontend
```

## Backend expectations

- Use `@SpringBootTest`, `@AutoConfigureMockMvc`, and the `h2` profile for MVC integration tests.
- Cover anonymous rejection and authenticated behavior for protected controllers.
- Use the OAuth2 stub flow when persistence or session behavior matters; [`ControllerTestsBaseClass`](../backend/src/test/kotlin/org/taonity/fullstackstarter/other/ControllerTestsBaseClass.kt) provides that pattern.
- Add repository tests for custom queries, constraints, mappings, and transaction-sensitive behavior rather than framework-provided CRUD.
- Keep architecture rules focused; [`LazyFetchingArchitectureTest`](../backend/src/test/kotlin/org/taonity/fullstackstarter/other/LazyFetchingArchitectureTest.kt) is the current example.
- [`SmokeIT`](../backend/src/test/kotlin/org/taonity/fullstackstarter/automation/SmokeIT.kt) owns the opt-in Compose readiness check.

Complete authenticated-controller pattern:

```kotlin
package org.taonity.fullstackstarter.example

import org.taonity.fullstackstarter.other.ControllerTestsBaseClass
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

class ExampleControllerTest : ControllerTestsBaseClass() {
    @Test
    fun `authenticated user can access endpoint`() {
        val sessionCookie = authorizeOAuth2()

        mockMvc.perform(get("/example").cookie(sessionCookie))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.field").value("expected"))
    }
}
```

## Frontend expectations

Use Vitest for environment parsing, authentication helpers, proxy behavior, and failure cases. Keep tests beside their source when practical. Current focused patterns are [`auth.test.ts`](../frontend/src/lib/auth.test.ts), [`env.test.ts`](../frontend/src/lib/env.test.ts), and [`runtimeConfig.test.ts`](../frontend/src/lib/runtimeConfig.test.ts).
