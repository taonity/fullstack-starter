# Adding a New Feature

This guide shows how to add a new feature to the backend following the package-per-feature convention.

## Step 1: Create the Package Structure

Under `backend/src/main/kotlin/org/example/fullstackstarter/`, create a new package:

```
yourfeature/
├── YourFeatureRoutes.kt           # Route extension function
├── service/
│   └── YourFeatureService.kt
├── dto/
│   └── YourFeatureDto.kt
├── entity/
│   └── YourFeatureEntity.kt
├── repository/
│   └── YourFeatureRepository.kt
└── exception/
    └── YourFeatureNotFoundException.kt
```

## Step 2: Table, Entity & Repository

Define the Exposed table mapping (the table itself is created by Flyway):

```kotlin
object YourFeatureTable : Table("your_feature") {
    val id = varchar("id", 255)
    val name = varchar("name", 512)
    val description = varchar("description", 2048).nullable()
    override val primaryKey = PrimaryKey(id)
}

data class YourFeatureEntity(val id: String, val name: String, val description: String?)
```

```kotlin
class YourFeatureRepository {
    fun findAll(): List<YourFeatureEntity> = loggedTransaction {
        YourFeatureTable.selectAll().map {
            YourFeatureEntity(it[YourFeatureTable.id], it[YourFeatureTable.name], it[YourFeatureTable.description])
        }
    }

    fun findById(id: String): YourFeatureEntity? = loggedTransaction {
        YourFeatureTable.selectAll().where { YourFeatureTable.id eq id }.singleOrNull()?.let {
            YourFeatureEntity(it[YourFeatureTable.id], it[YourFeatureTable.name], it[YourFeatureTable.description])
        }
    }
}
```

## Step 3: Service

```kotlin
class YourFeatureService(
    private val repository: YourFeatureRepository
) {
    fun getAll(): List<YourFeatureEntity> = repository.findAll()
    fun getById(id: String): YourFeatureEntity =
        repository.findById(id) ?: throw YourFeatureNotFoundException(id)
}
```

## Step 4: Routes

Define endpoints as a `Route` extension function; protect them with the `session` authenticator
and read the user from the `UserSession`:

```kotlin
fun Route.yourFeatureRoutes(service: YourFeatureService) {
    authenticate("session") {
        get("/your-feature") {
            val principal = call.principal<UserSession>()!!.toPrincipal()
            call.respond(service.getAll().map { YourFeatureDto.from(it) })
        }
    }
}
```

## Step 5: Wire into Koin and routing

Register the service in `di/AppModule.kt`:

```kotlin
single { YourFeatureRepository() }
single { YourFeatureService(get()) }
```

Then mount the routes in `Application.module()` (resolve the Koin bean as a local before the
`routing { }` block):

```kotlin
val yourFeatureService = get<YourFeatureService>()
routing {
    helloRoutes()
    yourFeatureRoutes(yourFeatureService)
}
```

## Step 6: Database Migration

Add a Flyway migration in `templates/docker/flyway/sql/tables/`:

```sql
-- V100001__create_your_feature_table.sql
CREATE TABLE your_feature (
    id          VARCHAR PRIMARY KEY,
    name        VARCHAR NOT NULL,
    description VARCHAR
);
```

## Step 7: Frontend API Route

Add `frontend/src/app/api/your-feature/route.ts`:

```typescript
import { type NextRequest } from 'next/server'
import { fetchFromBackend } from '@/lib/backend'

export async function GET(req: NextRequest) {
  const response = await fetchFromBackend(req, '/your-feature')
  const data = await response.json()
  return Response.json(data, { status: response.status })
}
```

## Step 8: Test

```kotlin
class YourFeatureRoutesTest : ControllerTestsBaseClass() {

    @Test
    fun `list requires auth`() = withApp {
        val response = client.get("/your-feature")
        assertThat(response.status).isEqualTo(HttpStatusCode.Unauthorized)
    }
}
```

## Step 9: Exception Handling (Optional)

If you need custom error responses, add a handler in `configureStatusPages()`
(`web/exception/GlobalExceptionHandler.kt`):

```kotlin
exception<YourFeatureNotFoundException> { call, cause ->
    call.respond(
        HttpStatusCode.NotFound,
        ClientErrorResponse(ClientErrorCode.NOT_FOUND, cause.message ?: "")
    )
}
```

