import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'github-pages-helper',
        closeBundle() {
          const distDir = path.resolve(__dirname, 'dist');
          const indexPath = path.join(distDir, 'index.html');
          const notFoundPath = path.join(distDir, '404.html');
          const nojekyllDist = path.join(distDir, '.nojekyll');

          // 1. Create 404.html fallback for direct links / SPAs
          if (fs.existsSync(indexPath)) {
            fs.copyFileSync(indexPath, notFoundPath);
          }

          // 2. Create .nojekyll to prevent GitHub Pages Jekyll processing
          fs.writeFileSync(nojekyllDist, '');

          // 3. Keep docs/ updated as fallback so GitHub never fails with "No such file or directory: docs"
          const docsDir = path.resolve(__dirname, 'docs');
          try {
            if (fs.existsSync(docsDir)) {
              fs.rmSync(docsDir, { recursive: true, force: true });
            }
            fs.cpSync(distDir, docsDir, { recursive: true });
            fs.writeFileSync(path.join(docsDir, '.nojekyll'), '');
          } catch (e) {
            console.error('Error syncing to docs fallback:', e);
          }
        },
      },
    ],
    build: {
      outDir: 'dist',
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'firebase-vendor': ['firebase/app', 'firebase/firestore'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
