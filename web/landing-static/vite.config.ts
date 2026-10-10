import fs from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Static build of the landing page only, for Firebase Hosting (no server: `npm run build:landing`, output in
// landing-static/dist). It renders the same components as the Next app (src/components/landing/LandingPage.tsx).
// The two Next modules the landing touches are swapped for plain shims, and STATIC_SITE (components/landing/site.ts)
// points the ways in to the source code, since there is no dashboard or rules engine behind this page.

const web = path.resolve(__dirname, '..')

/** The icon and share image live in src/app (Next file conventions); copy them next to index.html. */
function appIcons(): Plugin {
  const files = ['icon.svg', 'apple-icon.png', 'opengraph-image.png']
  return {
    name: 'seamoney-app-icons',
    generateBundle() {
      for (const fileName of files) this.emitFile({ type: 'asset', fileName, source: fs.readFileSync(path.join(web, 'src/app', fileName)) })
    },
  }
}

export default defineConfig({
  root: __dirname,
  publicDir: path.join(web, 'public'),
  plugins: [react(), tailwindcss(), appIcons()],
  resolve: {
    alias: [
      { find: 'next/link', replacement: path.join(__dirname, 'shims/link.tsx') },
      { find: 'next/navigation', replacement: path.join(__dirname, 'shims/navigation.ts') },
      { find: '@', replacement: path.join(web, 'src') },
    ],
  },
  define: {
    'process.env.NEXT_PUBLIC_STATIC_LANDING': JSON.stringify('1'),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true,
    // three.js is split into its own chunk by the dynamic import in useVoyage; it is large on purpose
    chunkSizeWarningLimit: 900,
  },
})
