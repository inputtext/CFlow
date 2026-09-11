const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const distDir = path.resolve('dist');
const indexFile = path.join(distDir, 'index.html');
const port = Number(process.env.PORT || 3000);
const cflowApiUrl = (process.env.CFLOW_API_URL || 'https://cflow-landing-api.onrender.com').replace(/\/$/, '');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const injectApiBridge = (html) => {
  const productionAnalyzeUrl = `${cflowApiUrl}/api/analyze`;
  const bridge = `<script>
(() => {
  const localAnalyzeUrl = 'http://localhost:5000/api/analyze';
  const productionAnalyzeUrl = ${JSON.stringify(productionAnalyzeUrl)};
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url;

    if (url === localAnalyzeUrl) {
      return nativeFetch(productionAnalyzeUrl, init);
    }

    return nativeFetch(input, init);
  };
})();
</script>`;

  return html.includes('</head>')
    ? html.replace('</head>', `${bridge}</head>`)
    : `${bridge}${html}`;
};

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const relativePath = requestPath === '/' ? '/index.html' : requestPath;
  const safePath = path.normalize(path.join(distDir, relativePath));

  if (!safePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let filePath = safePath;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = indexFile;
  }

  try {
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes[extension] || 'application/octet-stream',
      'Cache-Control': path.basename(filePath) === 'index.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });

    if (path.basename(filePath) === 'index.html') {
      const html = fs.readFileSync(filePath, 'utf8');
      res.end(injectApiBridge(html));
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(500);
    res.end('Internal server error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`C·FLOW web server running on 0.0.0.0:${port}`);
});
