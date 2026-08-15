# Deployment

## Docker Images

### Backend

From the project root:

```bash
mvn -pl backend spring-boot:build-image -DskipTests

```

Or with a Dockerfile:

```dockerfile
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY backend/target/backend-*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]

```

### Frontend

```bash
cd frontend
docker build -t fullstack-starter-frontend .

```

## Docker Compose

### Local Development

```bash
cd templates/docker
docker compose -f docker-compose.yml -f docker-compose.ports-local.yml up

```

### Production

From `templates/docker`, set the production values in an environment file. The backend must activate one database profile and one OAuth2 profile:

```env
COMPOSE_PROJECT_NAME=fullstack-starter
COMPOSE_ENV_FILE=.env
DOCKER_REGISTRY=your-registry
SPRING_PROFILES_ACTIVE=postgres,prod-google

GOOGLE_CLIENT_ID=your-real-client-id
GOOGLE_CLIENT_SECRET=your-real-secret
APP_DEFAULT_SUCCESS_URL=https://app.example.com
APP_LOGIN_URL=https://app.example.com/login
SERVER_SERVLET_SESSION_COOKIE_DOMAIN=.example.com
SERVER_SERVLET_SESSION_COOKIE_NAME=JSESSIONID
CSRF_COOKIE_NAME=XSRF-TOKEN

POSTGRES_USER=dbadmin
POSTGRES_PASSWORD=strong-password
POSTGRES_DB=fullstack_starter_db
POSTGRES_APP_USER=app
POSTGRES_APP_PASSWORD=app-password
POSTGRES_ADDRESS=db
POSTGRES_PORT=5432

LOCAL_BACKEND_URL=http://backend:8080
PUBLIC_BACKEND_URL=https://api.example.com

```

Ensure the production environment provides the external `prodenv-shared-internal` network, then start Compose with the production override:

```bash
docker compose -f docker-compose.yml -f docker-compose.prodenv.yml up -d
```

## Service Architecture

```ini
                    ┌─────────────┐
Internet ──────────▶│  Frontend   │ :3000
                    │  (Next.js)  │
                    └──────┬──────┘
                           │ /api/* proxy
                    ┌──────▼──────┐
                    │   Backend   │ :8080
                    │(Spring Boot)│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │ :5432
                    └─────────────┘

```

## Health Checks

- Backend: `GET /actuator/health`
- Frontend: `GET /api/actuator/health`

## Environment Variables

| Variable | Description | Required/default |
|----------|-------------|------------------|
| `COMPOSE_PROJECT_NAME` | Docker Compose project name | Required |
| `DOCKER_REGISTRY` | Registry containing both application images | Required |
| `SPRING_PROFILES_ACTIVE` | Active Spring profiles | `postgres,prod-google` in production |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID | Required by `prod-google` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret | Required by `prod-google` |
| `APP_DEFAULT_SUCCESS_URL` | Frontend URL after successful login | Required by `prod-google` |
| `APP_LOGIN_URL` | Frontend login URL after failed login | Required by `prod-google` |
| `SERVER_SERVLET_SESSION_COOKIE_DOMAIN` | Shared frontend/backend cookie domain | Required |
| `SERVER_SERVLET_SESSION_COOKIE_NAME` | Session cookie name | Required |
| `CSRF_COOKIE_NAME` | Shared backend/frontend CSRF cookie name | Required |
| `POSTGRES_ADDRESS` | PostgreSQL host | `db` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_DB` | Database name | Required |
| `POSTGRES_APP_USER` | App database user | Required |
| `POSTGRES_APP_PASSWORD` | App database password | Required |
| `LOCAL_BACKEND_URL` | Backend URL used by the frontend server | `http://backend:8080` |
| `PUBLIC_BACKEND_URL` | Public backend URL used for OAuth initiation | Required |

## Conventions

### Environment Variables

- Do **not** hardcode environment variable default values inside application code or service-specific Dockerfiles.
- You may hardcode only values that are unlikely to change across environments.
- Define environment-specific defaults only in:
   - `.yml` files (for backend — e.g., `application-*.yaml`)
   - `.env.*` files (for frontend — e.g., `.env.development`, `.env.production`)
   - Docker Compose files (for infrastructure)

### Docker Compose Deployability

- All additional services must be deployable in the Docker Compose infrastructure.
- Every service must support easy launch in a local environment (via `docker-compose.ports-local.yml` overrides or equivalent).
- When adding a new service, provide both a production-ready Compose configuration and a local development override.
