const fs = require('node:fs');
const path = require('node:path');

const viteConfig = path.resolve('vite.config.render.js');
const viteConfigSource = `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport tailwindcss from '@tailwindcss/vite';\n\nexport default defineConfig({\n  plugins: [react(), tailwindcss()],\n});\n`;

fs.writeFileSync(viteConfig, viteConfigSource, 'utf8');
console.log(`Prepared Render Vite config at ${viteConfig}`);
