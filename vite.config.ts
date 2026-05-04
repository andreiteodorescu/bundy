import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

/**
 * Mount the Vercel-style /api/fx serverless function as Vite dev middleware so
 * EUR/USD → RON conversion via BNR works in `npm run dev` without needing
 * `vercel dev`. Same handler is used in production by Vercel.
 */
function apiDevMiddleware(): Plugin {
  return {
    name: 'bundy-api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/fx', async (req, res) => {
        try {
          const { default: handler } = await server.ssrLoadModule('/api/fx.ts');
          const url = `http://localhost${req.url ?? '/'}`;
          const request = new Request(url, { method: req.method });
          const response: Response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          const body = await response.text();
          res.end(body);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[bundy] /api/fx middleware error', err);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: (err as Error).message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expose .env.local secrets (SUPABASE_SERVICE_ROLE_KEY) to the dev API middleware
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of ['SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_URL', 'SUPABASE_URL']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }
  return {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    apiDevMiddleware(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.ico',
        'favicon-96x96.png',
        'apple-touch-icon.png',
        'robots.txt',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-512-maskable.png',
        'brands/*.svg',
        'brands/*.png',
        'brands/*.jpeg',
        'brands/*.jpg',
      ],
      manifest: {
        name: 'Bundy',
        short_name: 'Bundy',
        description: 'Personal expense & budget tracker',
        theme_color: '#0b0b0f',
        background_color: '#0b0b0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'ro-RO',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') && url.pathname.includes('/rest/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
            },
          },
          {
            urlPattern: /\.(?:woff2?|ttf|otf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173, host: true },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'mantine-core': ['@mantine/core', '@mantine/hooks', '@mantine/notifications'],
          'mantine-dates': ['@mantine/dates', 'dayjs'],
          'mantine-charts': ['@mantine/charts', 'recharts'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  };
});
