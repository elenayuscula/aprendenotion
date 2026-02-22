// ---------------------------------------------------------------------------
// Table of Contents — extracción desde bloques de Notion
// ---------------------------------------------------------------------------
// Genera el mismo ID de anchor que HeadingBlock.astro para que los links
// del TOC apunten a los headings reales del contenido renderizado.
// ---------------------------------------------------------------------------

import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { richTextToPlain } from './notion';

export interface TocEntry {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

/** Convierte texto en slug URL-safe (idéntico a HeadingBlock.astro). */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Extrae entradas de TOC de un array de bloques de Notion.
 * Solo incluye heading_1 (→ h2) y heading_2 (→ h3) para mantener
 * el TOC manejable. heading_3 (→ h4) se omite.
 */
export function extractToc(blocks: BlockObjectResponse[]): TocEntry[] {
  const entries: TocEntry[] = [];

  for (const block of blocks) {
    const type = (block as any).type;

    if (type === 'heading_1' || type === 'heading_2') {
      const heading = (block as any)[type];
      if (!heading?.rich_text) continue;

      const text = richTextToPlain(heading.rich_text);
      if (!text.trim()) continue;

      entries.push({
        id: slugify(text),
        text,
        level: type === 'heading_1' ? 1 : 2,
      });
    }
  }

  return entries;
}
