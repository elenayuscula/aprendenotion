import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import type { Loader } from 'astro/loaders';
import { loadEnv } from 'vite';
import {
  getBlogPosts,
  getLessons,
  getTitle,
  getRichText,
  getSelect,
  getDate,
  getNumber,
  getCover,
  getIcon,
  getSlug,
} from './lib/notion';

// Load .env vars into process.env so our Notion client can read them
const env = loadEnv('', process.cwd(), '');
Object.assign(process.env, env);

// ---------------------------------------------------------------------------
// Custom Notion loader for blog posts
// ---------------------------------------------------------------------------

function notionBlogLoader(): Loader {
  return {
    name: 'notion-blog-loader',
    async load({ store, logger }) {
      logger.info('Fetching blog posts from Notion...');

      const pages = await getBlogPosts();
      logger.info(`Found ${pages.length} published blog posts`);

      store.clear();

      for (const page of pages) {
        const slug = getSlug(page);
        const title = getTitle(page) || getTitle(page, 'Título');
        const description = getRichText(page, 'Descripción');
        const fecha = getDate(page, 'Fecha');
        const categoria = getSelect(page, 'Categoría') || 'Tutorial';
        const emoji = getRichText(page, 'Emoji') || getIcon(page) || '📝';
        const coverImage = getCover(page);

        store.set({
          id: slug,
          data: {
            title,
            description,
            publishDate: fecha || new Date().toISOString().split('T')[0],
            category: categoria,
            emoji,
            coverImage: coverImage || undefined,
            notionId: page.id,
          },
        });
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Custom Notion loader for lessons
// ---------------------------------------------------------------------------

function notionLessonsLoader(): Loader {
  return {
    name: 'notion-lessons-loader',
    async load({ store, logger }) {
      logger.info('Fetching lessons from Notion...');

      const pages = await getLessons();
      logger.info(`Found ${pages.length} published lessons`);

      store.clear();

      for (const page of pages) {
        const slug = getSlug(page);
        const title = getTitle(page) || getTitle(page, 'Título');
        const description = getRichText(page, 'Descripción');
        const orden = getNumber(page, 'Orden');
        const modulo = getSelect(page, 'Módulo') || 'Fundamentos';
        const emoji = getRichText(page, 'Emoji') || getIcon(page) || '📖';
        const coverImage = getCover(page);

        store.set({
          id: slug,
          data: {
            title,
            description,
            order: orden,
            module: modulo,
            emoji,
            coverImage: coverImage || undefined,
            notionId: page.id,
          },
        });
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

const blog = defineCollection({
  loader: notionBlogLoader(),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.string(),
    category: z.string(),
    emoji: z.string(),
    coverImage: z.string().optional(),
    notionId: z.string(),
  }),
});

const lessons = defineCollection({
  loader: notionLessonsLoader(),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    module: z.string(),
    emoji: z.string(),
    coverImage: z.string().optional(),
    notionId: z.string(),
  }),
});

const herramientas = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/herramientas' }),
  schema: z.object({
    // --- Básicos (obligatorios para todos) ---
    title: z.string(),
    description: z.string(),
    subtitle: z.string().optional(),
    price: z.string(),
    priceNumeric: z.number(),
    image: z.string(),
    purchaseUrl: z.string(),

    // --- Categoría: para organizar en secciones en /herramientas ---
    category: z.enum(['companion', 'herramienta', 'tiny-system', 'producto-principal']),

    // --- Producto externo: si true, no genera página propia, solo card con enlace ---
    external: z.boolean().default(false),

    // --- Orden dentro de su categoría ---
    order: z.number().default(0),

    // --- Badge de la card (texto + color) ---
    tag: z.string().optional(),
    tagColor: z.enum(['green', 'orange', 'blue', 'purple', 'gray']).default('blue'),

    // --- Secciones de la landing (todas opcionales) ---
    valueProps: z.array(z.object({
      icon: z.string(),
      title: z.string(),
      description: z.string(),
    })).optional(),

    body: z.string().optional(),

    modules: z.array(z.object({
      emoji: z.string(),
      title: z.string(),
      desc: z.string(),
    })).optional(),

    features: z.array(z.string()).optional(),

    testimonials: z.array(z.object({
      quote: z.string(),
      author: z.string(),
    })).optional(),

    pricing: z.object({
      headline: z.string(),
      subtitle: z.string(),
      cards: z.array(z.object({
        label: z.string(),
        price: z.string(),
        features: z.array(z.string()),
        url: z.string(),
        featured: z.boolean().default(false),
        internal: z.boolean().default(false),
      })),
    }).optional(),

    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),

    // --- Navegación entre productos ---
    prevProduct: z.object({
      slug: z.string(),
      label: z.string(),
    }).optional(),
    nextProduct: z.object({
      slug: z.string(),
      label: z.string(),
    }).optional(),
  }),
});

export const collections = { blog, lessons, herramientas };
