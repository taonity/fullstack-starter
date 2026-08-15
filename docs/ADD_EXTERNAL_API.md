# Integrating an External API

This guide covers adding a new external API integration (e.g., Stripe, Twilio, GitHub API).

## Step 1: Add Dependencies

In `backend/pom.xml` add the client library or use Spring's `RestClient`:

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>example-client</artifactId>
    <version>1.0.0</version>
</dependency>

```

Or use Spring's built-in `RestClient` (no extra dependency needed).

## Step 2: Configuration

Add settings to the relevant `application*.yaml` file and bind them through `@ConfigurationProperties`:

```yaml
integration:
  example-api:
    base-url: ${EXAMPLE_API_URL:https://api.example.com}
    api-key: ${EXAMPLE_API_KEY}
    timeout: 30s

```

## Step 3: Create Integration Package

```ini
integration/
└── exampleapi/
    ├── config/
    │   └── ExampleApiConfig.kt      # RestClient bean config
    ├── service/
    │   └── ExampleApiService.kt     # Service wrapping API calls
    ├── dto/
    │   └── ExampleApiResponse.kt    # Response DTOs
    └── exception/
        └── ExampleApiException.kt   # Custom exceptions

```

## Step 4: RestClient Configuration

```kotlin
@ConfigurationProperties("integration.example-api")
data class ExampleApiProperties(
    val baseUrl: URI,
    val apiKey: String,
    val timeout: Duration,
)

@Configuration
@EnableConfigurationProperties(ExampleApiProperties::class)
class ExampleApiConfig(
    private val properties: ExampleApiProperties,
    private val restClientBuilder: RestClient.Builder,
) {
    @Bean
    fun exampleApiClient(): RestClient {
        val requestFactory = SimpleClientHttpRequestFactory().apply {
            setConnectTimeout(properties.timeout)
            setReadTimeout(properties.timeout)
        }
        return restClientBuilder
            .baseUrl(properties.baseUrl.toString())
            .defaultHeader("Authorization", "Bearer ${properties.apiKey}")
            .requestFactory(requestFactory)
            .build()
    }
}
```

## Step 5: Service Implementation

```kotlin
@Service
class ExampleApiService(
    private val exampleApiClient: RestClient
) {
    companion object {
        private val LOGGER = KotlinLogging.logger {}
    }

    fun fetchData(id: String): ExampleApiResponse {
        LOGGER.info { "Fetching data for $id" }
        return exampleApiClient.get()
            .uri("/data/{id}", id)
            .retrieve()
            .body(ExampleApiResponse::class.java)
            ?: throw ExampleApiException("No data returned for $id")
    }
}

```

## Step 6: WireMock Stubs for Testing

Create a WireMock stub module like `google-stubs/`:

1. Create `example-stubs/pom.xml` by following `google-stubs/pom.xml`.
2. Add WireMock resources under `src/main/resources/wiremock/example/`.
3. Create a stub profile in `application-stub-example.yaml`.
4. Add the module to the root `pom.xml` and its dependency to `backend/pom.xml`.

## Step 7: Health Check (Optional)

```kotlin
@Component
class ExampleApiHealthIndicator(
    private val exampleApiClient: RestClient
) : AbstractHealthIndicator() {
    override fun doHealthCheck(builder: Health.Builder) {
        val response = exampleApiClient.get().uri("/health").retrieve().toBodilessEntity()
        if (response.statusCode.is2xxSuccessful) {
            builder.up()
        } else {
            builder.down()
        }
    }
}

```

## Step 8: Exception Handling

Add handlers in `GlobalExceptionHandler` for timeout/connection issues.

## Environment Variables

Add to `templates/docker/.env`:

```sh
EXAMPLE_API_URL=https://api.example.com
EXAMPLE_API_KEY=your-api-key

```
