# Deployment

## Build images

Run the image build from the repository root. Build both images with names that match `DOCKER_REGISTRY` in the deployment environment:

```bash
mvn -pl backend -am -P build-docker-image package -DskipTests -Ddocker.registry=your-registry; docker build -t your-registry/fullstack-starter-frontend:latest frontend
```

## Docker Compose

Run the local stack from the repository root with the tracked test environment and published ports:

```bash
docker compose --env-file templates/docker/.env.test -f templates/docker/docker-compose.yml -f templates/docker/docker-compose.ports-local.yml up
```

For production, create an environment file with deployment-specific values:

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

The required groups are Compose/image selection, one database and OAuth2 profile, OAuth credentials and redirects, shared session/CSRF cookie settings, PostgreSQL admin and application credentials, and internal/public backend URLs.

The production override [`docker-compose.prodenv.yml`](../templates/docker/docker-compose.prodenv.yml) attaches backend and frontend to the external `prodenv-shared-internal` network. That network must already exist in the target production environment.

Start production Compose from the repository root:

```bash
docker compose --env-file templates/docker/.env -f templates/docker/docker-compose.yml -f templates/docker/docker-compose.prodenv.yml up -d
```

## Health endpoints

- Backend: `GET /actuator/health`
- Backend liveness: `GET /actuator/health/liveness`
- Backend readiness: `GET /actuator/health/readiness`
- Frontend proxy: `GET /api/actuator/health`

## Conventions

- Keep configurable values in `application*.yaml`, frontend environment files, or Compose; do not hardcode environment defaults in application code.
- Keep backend and frontend cookie names aligned, and use a shared parent cookie domain when they run on different subdomains.
- Add every infrastructure service to the base Compose file with a production-ready configuration and a local published-port override when developers need direct access.
- Never commit production credentials or deployment environment files.
