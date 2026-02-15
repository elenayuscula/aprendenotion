import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.string(),
    readingTime: z.string(),
    category: z.enum(['Productividad', 'Tutorial', 'Comparativa', 'Recursos']),
    emoji: z.string(),
  }),
});

const herramientas = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/herramientas' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    subtitle: z.string(),
    price: z.string(),
    priceNumeric: z.number(),
    tag: z.enum(['Tiny System', 'Herramienta']),
    tagColor: z.enum(['orange', 'blue']),
    image: z.string(),
    purchaseUrl: z.string(),
    valueProps: z.array(z.object({
      icon: z.string(),
      title: z.string(),
      description: z.string(),
    })),
    features: z.array(z.string()).optional(),
    modules: z.array(z.object({
      emoji: z.string(),
      title: z.string(),
      desc: z.string(),
    })).optional(),
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
    }),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })),
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

export const collections = { blog, herramientas };
