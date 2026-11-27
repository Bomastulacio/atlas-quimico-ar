import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  integrations: [react(), mdx()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('node_modules/three')) return 'three-vendor';
            if (id.includes('node_modules/@xyflow')) return 'xyflow-vendor';
            if (id.includes('node_modules/d3-')) return 'd3-vendor';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
              return 'motion-vendor';
            }
            return undefined;
          },
        },
      },
    },
  },
});
