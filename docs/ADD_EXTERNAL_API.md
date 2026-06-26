# Integrating an External API

This guide covers adding a new external API integration (e.g., Stripe, Twilio, GitHub API).

## Step 1: Add Dependencies

The Ktor HTTP client is already on the classpath. Only add a dependency if you need a dedicated SDK — in `backend/build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.example:example-client:1.0.0")
}
```

Otherwise reuse the shared `HttpClient` (CIO) registered in Koin — no extra dependency needed.

## Step 2: Configuration

Add settings to `application.yaml`:

```yaml
integration:
  example-api:
    base-url: ${EXAMPLE_API_URL:https://api.example.com}
    api-key: ${EXAMPLE_API_KEY}
    timeout: 30s
```

## Step 3: Create Integration Package

```
integration/
└── exampleapi/
    ├── service/
    │   └── ExampleApiService.kt     # Service wrapping API calls (uses HttpClient)
    ├── dto/
    │   └── ExampleApiResponse.kt    # Response DTOs
    └── exception/
        └── ExampleApiException.kt   # Custom exceptions
```

## Step 4: Register the client in Koin

Add the service (and any dedicated client) to the Koin module in `di/AppModule.kt`:

```kotlin
single {
    ExampleApiService(
        httpClient = get(),
        baseUrl = appConfig.integration.exampleApi.baseUrl,
        apiKey = appConfig.integration.exampleApi.apiKey
    )
}
```

## Step 5: Service Implementation

```kotlin
class ExampleApiService(
    private val httpClient: HttpClient,
    private val baseUrl: String,
    private val apiKey: String
) {
    companion object {
        private val LOGGER = KotlinLogging.logger {}
    }

    suspend fun fetchData(id: String): ExampleApiResponse {
        LOGGER.info { "Fetching data for $id" }
        val response = httpClient.get("$baseUrl/data/$id") {
            header(HttpHeaders.Authorization, "Bearer $apiKey")
        }
        if (!response.status.isSuccess()) {
            throw ExampleApiException("No data returned for $id (status ${response.status})")
        }
        return response.body()
    }
}
```

## Step 6: WireMock Stubs for Testing

Create a WireMock contract module (like `google-stubs/`):

1. Create `example-stubs/build.gradle.kts` (copy from `google-stubs/build.gradle.kts`)
2. Add WireMock mappings in `src/main/resources/wiremock/example/mappings/`
3. Create a stub profile in `application-stub-example.yaml`
4. Add the module to `settings.gradle.kts`

## Step 7: Health Check (Optional)

```kotlin
class ExampleApiHealthIndicator(
    private val httpClient: HttpClient,
    private val baseUrl: String
) : HealthIndicator {

    override val name: String = "example-api"

    override suspend fun health(): Health {
        return try {
            val response = httpClient.get("$baseUrl/health")
            if (response.status.value in 500..599) Health.down() else Health.up()
        } catch (exception: Exception) {
            Health.down(linkedMapOf("error" to (exception.message ?: "unknown")))
        }
    }
}
```

## Step 8: Exception Handling

Add handlers in `GlobalExceptionHandler` for timeout/connection issues.

## Environment Variables

Add to `templates/docker/.env`:
```
EXAMPLE_API_URL=https://api.example.com
EXAMPLE_API_KEY=your-api-key
```
