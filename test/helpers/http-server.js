import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fixtures = fileURLToPath(new URL('../fixtures/', import.meta.url))
export async function startServer () {
  const timers = new Set()
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    const route = req.url.slice(1)
    if (route === '404' || route === '500') { res.writeHead(Number(route)); res.end('error'); return }
    if (route === 'invalid') { res.end('not a PDF'); return }
    if (route === 'disconnect') { req.socket.destroy(); return }
    if (route === 'slow' || route === 'slow-body') {
      if (route === 'slow-body') { res.writeHead(200); res.write('%PDF-') }
      const timer = setTimeout(() => { timers.delete(timer); res.end('delayed') }, 10000)
      timers.add(timer)
      res.on('close', () => { clearTimeout(timer); timers.delete(timer) })
      return
    }
    try {
      const bytes = await readFile(path.join(fixtures, path.basename(route)))
      res.setHeader('Content-Type', 'application/pdf')
      res.end(bytes)
    } catch { res.writeHead(404); res.end() }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: async () => {
      for (const timer of timers) clearTimeout(timer)
      server.closeAllConnections()
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  }
}
