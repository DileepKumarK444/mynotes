// `npm start`: serve MyNotes at http://127.0.0.1:4173, or report that it already is.
import { spawn } from 'node:child_process'

const PORT = process.env.PORT || '4173'
const URL = `http://127.0.0.1:${PORT}/`
const running = await fetch(URL, { signal: AbortSignal.timeout(1500) }).then((r) => r.ok).catch(() => false)
if (running) {
  console.log(`MyNotes is already running: ${URL}`)
  process.exit(0)
}
const run = (args) => new Promise((res, rej) => {
  const p = spawn('npx', ['vite', ...args], { stdio: 'inherit' })
  p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`vite ${args[0]} exited with ${c}`))))
})
try {
  await run(['build'])
  await run(['preview', '--host', '127.0.0.1', '--port', PORT, '--strictPort'])
} catch (e) {
  console.error(String(e.message ?? e), `\nPort ${PORT} may be used by another program.`)
  process.exit(1)
}
