// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://aprendenotion.com',
  integrations: [sitemap()],
  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },
});
