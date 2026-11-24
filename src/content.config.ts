import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const productos = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/productos' }),
});

export const collections = { productos };
