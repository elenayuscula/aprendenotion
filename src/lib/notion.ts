import { Client } from '@notionhq/client';
import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Client (lazy init — env vars may not be available at import time)
// ---------------------------------------------------------------------------

let _notion: Client | null = null;

function getClient(): Client {
  if (!_notion) {
    const token = (import.meta as any).env?.NOTION_TOKEN ?? process.env.NOTION_TOKEN;
    if (!token) throw new Error('NOTION_TOKEN is not set in .env');
    _notion = new Client({ auth: token });
  }
  return _notion;
}

// ---------------------------------------------------------------------------
// Cache helpers  (file-system cache so builds don't re-fetch everything)
// ---------------------------------------------------------------------------

const CACHE_DIR = path.join(process.cwd(), '.notion-cache');
const CACHE_TTL = 1000 * 60 * 5; // 5 min in dev, ignored in build

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function cacheGet<T>(key: string): T | null {
  ensureCacheDir();
  const file = path.join(CACHE_DIR, `${key}.json`);
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  const isDev = (import.meta as any).env?.DEV ?? process.env.NODE_ENV !== 'production';
  if (isDev && Date.now() - stat.mtimeMs > CACHE_TTL) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

function cacheSet(key: string, data: unknown) {
  ensureCacheDir();
  fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Rich text → plain string
// ---------------------------------------------------------------------------

export function richTextToPlain(rt: RichTextItemResponse[]): string {
  return rt.map((t) => t.plain_text).join('');
}

// ---------------------------------------------------------------------------
// Page property helpers
// ---------------------------------------------------------------------------

type PageProps = PageObjectResponse['properties'];

function prop(page: PageObjectResponse, name: string) {
  return page.properties[name];
}

export function getTitle(page: PageObjectResponse, name = 'Name'): string {
  const p = prop(page, name);
  if (p?.type === 'title') return richTextToPlain(p.title);
  return '';
}

export function getRichText(page: PageObjectResponse, name: string): string {
  const p = prop(page, name);
  if (p?.type === 'rich_text') return richTextToPlain(p.rich_text);
  return '';
}

export function getSelect(page: PageObjectResponse, name: string): string {
  const p = prop(page, name);
  if (p?.type === 'select') return p.select?.name ?? '';
  return '';
}

export function getMultiSelect(page: PageObjectResponse, name: string): string[] {
  const p = prop(page, name);
  if (p?.type === 'multi_select') return p.multi_select.map((s) => s.name);
  return [];
}

export function getDate(page: PageObjectResponse, name: string): string {
  const p = prop(page, name);
  if (p?.type === 'date') return p.date?.start ?? '';
  return '';
}

export function getNumber(page: PageObjectResponse, name: string): number {
  const p = prop(page, name);
  if (p?.type === 'number') return p.number ?? 0;
  return 0;
}

export function getCheckbox(page: PageObjectResponse, name: string): boolean {
  const p = prop(page, name);
  if (p?.type === 'checkbox') return p.checkbox;
  return false;
}

export function getUrl(page: PageObjectResponse, name: string): string {
  const p = prop(page, name);
  if (p?.type === 'url') return p.url ?? '';
  return '';
}

export function getCover(page: PageObjectResponse): string {
  if (!page.cover) return '';
  if (page.cover.type === 'external') return page.cover.external.url;
  if (page.cover.type === 'file') return page.cover.file.url;
  return '';
}

export function getIcon(page: PageObjectResponse): string {
  if (!page.icon) return '';
  if (page.icon.type === 'emoji') return page.icon.emoji;
  if (page.icon.type === 'external') return page.icon.external.url;
  if (page.icon.type === 'file') return page.icon.file.url;
  return '';
}

// ---------------------------------------------------------------------------
// Slug helper — from a page's "Slug" property or the title
// ---------------------------------------------------------------------------

export function getSlug(page: PageObjectResponse): string {
  // Try explicit Slug property first
  const slugProp = getRichText(page, 'Slug');
  if (slugProp) return slugProp;

  // Fall back to title-based slug
  const title = getTitle(page) || getTitle(page, 'Título') || getTitle(page, 'Title');
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---------------------------------------------------------------------------
// Query a database (with cache)
// ---------------------------------------------------------------------------

export interface QueryOptions {
  /** data_source_id — in v5 of @notionhq/client, query moved from databases to dataSources */
  dataSourceId: string;
  filter?: any;
  sorts?: any[];
}

export async function queryDatabase(opts: QueryOptions): Promise<PageObjectResponse[]> {
  const cacheKey = `db-${opts.dataSourceId}`;
  const cached = cacheGet<PageObjectResponse[]>(cacheKey);
  if (cached) return cached;

  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await getClient().dataSources.query({
      data_source_id: opts.dataSourceId,
      filter: opts.filter,
      sorts: opts.sorts,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const result of response.results) {
      if ('properties' in result) pages.push(result as PageObjectResponse);
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  cacheSet(cacheKey, pages);
  return pages;
}

// ---------------------------------------------------------------------------
// Get all blocks for a page (recursive, with cache)
// ---------------------------------------------------------------------------

export async function getBlocks(blockId: string): Promise<BlockObjectResponse[]> {
  const cacheKey = `blocks-${blockId}`;
  const cached = cacheGet<BlockObjectResponse[]>(cacheKey);
  if (cached) return cached;

  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await getClient().blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of response.results) {
      if ('type' in block) {
        const b = block as BlockObjectResponse;
        blocks.push(b);
        // Recursively get children
        if (b.has_children) {
          const children = await getBlocks(b.id);
          (b as any).children = children;
        }
      }
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  cacheSet(cacheKey, blocks);
  return blocks;
}

// ---------------------------------------------------------------------------
// Image downloading (Notion file URLs expire after 1h)
// ---------------------------------------------------------------------------

const IMG_DIR = path.join(process.cwd(), 'public', 'images', 'notion');

export async function downloadImage(url: string, filename: string): Promise<string> {
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

  const ext = url.includes('.png') ? '.png' : url.includes('.gif') ? '.gif' : '.jpg';
  const safeName = filename.replace(/[^a-z0-9-]/gi, '-') + ext;
  const filePath = path.join(IMG_DIR, safeName);
  const publicPath = `/images/notion/${safeName}`;

  // Skip if already downloaded
  if (fs.existsSync(filePath)) return publicPath;

  const res = await fetch(url);
  if (!res.ok) return url; // fallback to original URL
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return publicPath;
}

// ---------------------------------------------------------------------------
// Convenience: fetch published blog posts
// ---------------------------------------------------------------------------

export async function getBlogPosts() {
  const dbId = (import.meta as any).env?.NOTION_BLOG_DB ?? process.env.NOTION_BLOG_DB;
  if (!dbId) return [];

  return queryDatabase({
    dataSourceId: dbId,
    filter: {
      property: 'Estado',
      select: { equals: 'Publicado' },
    },
    sorts: [{ property: 'Fecha', direction: 'descending' }],
  });
}

// ---------------------------------------------------------------------------
// Convenience: fetch published lessons
// ---------------------------------------------------------------------------

export async function getLessons() {
  const dbId = (import.meta as any).env?.NOTION_LESSONS_DB ?? process.env.NOTION_LESSONS_DB;
  if (!dbId) return [];

  return queryDatabase({
    dataSourceId: dbId,
    filter: {
      property: 'Estado',
      select: { equals: 'Publicado' },
    },
    sorts: [{ property: 'Orden', direction: 'ascending' }],
  });
}

// ---------------------------------------------------------------------------
// Re-export types for convenience
// ---------------------------------------------------------------------------

export type { BlockObjectResponse, PageObjectResponse, RichTextItemResponse };
