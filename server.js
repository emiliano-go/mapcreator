import http from 'http'
import fs from 'fs'
import path from 'path'

const PORT = parseInt(process.env.PORT || '80', 10)
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || './dist')
const EXPORT_DIR = path.resolve(process.env.EXPORT_DIR || './exports')

if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true })
}

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/export') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const { filename, data } = JSON.parse(body)
        const safeName = (filename || 'map.json').replace(/[^a-zA-Z0-9_.\-]/g, '_')
        const filepath = path.join(EXPORT_DIR, safeName)
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, path: filepath }))
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: err.message }))
      }
    })
    return
  }

  if (req.method === 'GET' && req.url === '/api/export') {
    fs.readdir(EXPORT_DIR, (err, files) => {
      if (err) {
        res.writeHead(500)
        res.end('[]')
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(files.filter((f) => f.endsWith('.json'))))
    })
    return
  }

  const urlPath = req.url === '/' ? '/index.html' : req.url!
  const filePath = path.join(STATIC_DIR, urlPath)

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(STATIC_DIR, 'index.html'), (_, fallback) => {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(fallback)
        })
      } else {
        res.writeHead(500)
        res.end('Internal Server Error')
      }
      return
    }
    const ext = path.extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    res.end(content)
  })
})

server.listen(PORT, () => {
  console.log(`MapCreator server running on http://localhost:${PORT}`)
  console.log(`Static files: ${STATIC_DIR}`)
  console.log(`Exports saved to: ${EXPORT_DIR}`)
})
