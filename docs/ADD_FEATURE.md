# Adding a New Feature

Use this checklist to add one vertical feature without bypassing existing boundaries.

## Checklist

1. Choose a package under [`backend/src/main/kotlin/org/example/fullstackstarter`](../backend/src/main/kotlin/org/example/fullstackstarter).
   Keep feature code together; use the [`console` feature](../backend/src/main/kotlin/org/example/fullstackstarter/console/) as the representative layout.
2. Add only the layers the feature needs: controller, service, DTO, entity, repository, exception, or configuration.
   Do not create empty layers.
3. Keep HTTP payloads at a DTO boundary.
   Do not expose JPA entities from controllers.
4. Put orchestration and transaction boundaries in the service layer.
   Keep controllers focused on transport and authorization.
5. Authenticate controller endpoints with the established principal pattern.
   Validate request DTOs and return deliberate status codes.
6. If the schema changes, inspect [`templates/docker/flyway/sql/tables`](../templates/docker/flyway/sql/tables/) and use the next unused Flyway version.
   Update [Database](DATABASE.md) when the schema workflow changes.
7. Add a Next.js API route so browser code never calls the backend directly.
   Use the focused [`user` proxy](../frontend/src/app/api/user/route.ts) or the [`console` catch-all proxy](../frontend/src/app/api/console/%5B...path%5D/route.ts) as the closest pattern.
8. For POST, PUT, PATCH, and DELETE routes, forward the `X-XSRF-TOKEN` header with the authenticated session.
   Preserve backend response status, headers, and body.
9. Build the UI inside the relevant feature directory.
   [`frontend/src/features/console`](../frontend/src/features/console/) shows the current feature organization.
10. Add focused backend tests for authorization, validation, service behavior, persistence, and error mapping as applicable.
    Add frontend tests for proxy and UI behavior.
11. Follow [Testing](TESTING.md) for current commands and test patterns.

## Verify

Run only the checks relevant to the changed slice, then run the full module checks from the repository root before merging.

```bash
mvn -pl backend test; npm test --prefix frontend; npm run lint --prefix frontend
```
