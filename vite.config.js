import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const packageInfo = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

const pwaVersion = () => ({
  name: 'pwa-version',
  closeBundle() {
    const worker = resolve(process.cwd(), 'dist', 'sw.js')
    const source = readFileSync(worker, 'utf8')
    writeFileSync(worker, source.replaceAll('__APP_VERSION__', packageInfo.version))
  },
})

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(packageInfo.version) },
  plugins: [react(), pwaVersion()],
})
