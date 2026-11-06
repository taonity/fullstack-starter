# Demo screenshots

Requires Java 17 and Node.js 24+. On Windows, use a Linux checkout in WSL with Linux Node dependencies. Keep ports 3000, 8080, and 9561 free.

```bash
cd frontend
npm ci
npx playwright install --with-deps chromium
npm run demo:screenshots
```

Open `screenshots/index.html` in the repository root. The capture covers Admin, Config, About, login, requesting access, and pending access in desktop/phone and light/dark variants. To capture again without rebuilding, run `npm run demo:capture`.

The `demo` profile uses an isolated in-memory database, fixed English fixtures, and stub Google login. It needs no production credentials. Add scenes in `frontend/demo/screenshots.spec.ts`.

Run **Demo Screenshots** manually, or let **Release** call it after `deploy-prod` succeeds. Pushes alone and stage deployments do not trigger captures.

The workflow uses [demo-screenshots](https://github.com/taonity/demo-screenshots). Successful captures on `main` publish `screenshots.zip` in a `portfolio-screenshots-<commit-SHA>` prerelease. Browser reports are kept as workflow artifacts. The portfolio imports the release separately.
