const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/upload') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const filename = payload.filename || 'uploaded_image.png';
        const data = payload.data;
        const matches = data ? data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/) : null;
        
        if (!matches || matches.length !== 3) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid base64 image data' }));
          return;
        }

        const buffer = Buffer.from(matches[2], 'base64');
        const cleanFileName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const showcaseDir = path.join(PUBLIC_DIR, 'assets', 'showcase');
        
        if (!fs.existsSync(showcaseDir)) {
          fs.mkdirSync(showcaseDir, { recursive: true });
        }

        const targetPath = path.join(showcaseDir, cleanFileName);

        fs.writeFile(targetPath, buffer, (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to write file' }));
            return;
          }
          const relativeSrc = `./assets/showcase/${cleanFileName}`;
          const cleanTitle = cleanFileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, src: relativeSrc, desc: cleanTitle }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
      }
    });
    return;
  }

  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '/admin' || reqPath === '/admin/') {
    reqPath = '/index.html';
  } else if (reqPath.startsWith('/admin/')) {
    reqPath = reqPath.substring(6); // Strip '/admin' prefix
  }

  const filePath = path.join(PUBLIC_DIR, reqPath);

  // Security check: ensure path is within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`  AURA / VIBECURB SERVER RUNNING AT:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
