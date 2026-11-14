import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Plugin } from 'vite'

/**
 * Local-only persistence: notes are stored in ./data/notes.json on this computer.
 * Served by both `vite` (dev) and `vite preview` (npm start). Localhost only.
 */
function localStore(): Plugin {
  const file = path.resolve(process.cwd(), 'data/notes.json')
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/local-state') return next()
    const host = (req.headers.host ?? '').split(':')[0]
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) { res.statusCode = 403; return res.end() }
    if (req.method === 'GET') {
      if (!fs.existsSync(file)) { res.statusCode = 404; return res.end() }
      res.setHeader('content-type', 'application/json')
      return res.end(fs.readFileSync(file))
    }
    if (req.method === 'PUT') {
      if (!String(req.headers['content-type']).startsWith('application/json')) { res.statusCode = 415; return res.end() }
      const chunks: Buffer[] = []
      let size = 0
      req.on('data', (c: Buffer) => {
        size += c.length
        if (size > 100 * 1024 * 1024) { res.statusCode = 413; res.end(); req.destroy() } else chunks.push(c)
      })
      req.on('end', () => {
        try {
          const body = Buffer.concat(chunks)
          JSON.parse(body.toString('utf8')) // refuse to overwrite good data with garbage
          fs.mkdirSync(path.dirname(file), { recursive: true })
          const tmp = `${file}.tmp`
          fs.writeFileSync(tmp, body)
          if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`) // one-step backup
          fs.renameSync(tmp, file)
          res.statusCode = 204; res.end()
        } catch {
          res.statusCode = 400; res.end()
        }
      })
      return
    }
    res.statusCode = 405; res.end()
  }
  return {
    name: 'mynotes-local-store',
    configureServer: (s) => { s.middlewares.use(handler) },
    configurePreviewServer: (s) => { s.middlewares.use(handler) },
  }
}

export default defineConfig({
  plugins: [react(), localStore()],
})
