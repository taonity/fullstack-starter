import { spawn, spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const frontend = fileURLToPath(new URL('../', import.meta.url))
const backend = process.argv[2] === 'backend'
const jars = backend ? readdirSync(path.join(root, 'backend/build/libs')).filter(name => /^backend-.*\.jar$/.test(name) && !name.endsWith('-plain.jar')) : []
if (backend && jars.length !== 1) throw new Error('Run npm run demo:build before capturing screenshots')
const runtime = backend ? mkdtempSync(path.join(root, 'backend/build/demo-runtime-')) : null

if (runtime) {
  // WireMock needs an exploded classpath; Gradle's build-info also needs the JAR root.
  const extraction = spawnSync('jar', ['xf', path.join(root, 'backend/build/libs', jars[0])], { cwd: runtime, stdio: 'inherit' })
  if (extraction.error || extraction.status !== 0) {
    rmSync(runtime, { recursive: true, force: true })
    throw extraction.error ?? new Error('Could not extract the demo backend')
  }
} else {
  cpSync(path.join(frontend, '.next/static'), path.join(frontend, '.next/standalone/.next/static'), { recursive: true })
  cpSync(path.join(frontend, 'public'), path.join(frontend, '.next/standalone/public'), { recursive: true })
}

const child = spawn(
  backend ? 'java' : process.execPath,
  backend
    ? ['-Duser.timezone=UTC', '-cp', [`${runtime}/BOOT-INF/classes`, runtime, `${runtime}/BOOT-INF/lib/*`].join(path.delimiter), 'org.taonity.fullstackstarter.FullstackStarterApplicationKt', '--spring.profiles.active=demo']
    : ['.next/standalone/server.js'],
  {
    cwd: backend ? root : frontend,
    stdio: 'inherit',
    env: { ...process.env, FRONTEND_PROFILE: 'local', LOCAL_BACKEND_URL: 'http://127.0.0.1:8080', HOSTNAME: '127.0.0.1', PORT: '3000' },
  },
)

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
const cleanRuntime = () => { if (runtime) rmSync(runtime, { recursive: true, force: true }) }
child.on('error', error => { cleanRuntime(); throw error })
child.on('exit', code => { cleanRuntime(); process.exit(code ?? 1) })
