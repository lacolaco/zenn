import pLimit from 'p-limit';
import { readFile, writeFile } from 'node:fs/promises';
import { SingleBar } from 'cli-progress';
import { Client } from '@notionhq/client';
import type { BlogPageProperties, PageObjectWithContent } from './types';
import { fetchChildBlocks, queryAllPages } from './utils';

const { NOTION_AUTH_TOKEN, NOTION_DATABASE_ID, NODE_ENV } = process.env;
const isDevMode = NODE_ENV === 'development';
const notion = new Client({ auth: NOTION_AUTH_TOKEN });
const manifestFilePath = new URL('../manifest.json', import.meta.url);

export class NotionDatabase {
  async queryBlogPages(): Promise<PageObjectWithContent[]> {
    // collect pages
    console.log('Fetching pages...');
    const pages = await queryAllPages(notion, NOTION_DATABASE_ID, {
      and: [
        ...(isDevMode ? [] : [{ property: 'published', checkbox: { equals: true } }]),
        { property: 'slug', rich_text: { is_not_empty: true } },
        { property: 'title', title: { is_not_empty: true } },
        {
          property: 'distribution',
          multi_select: { contains: 'zenn' },
        },
      ],
    });
    console.log(`Fetched ${pages.length} pages`);
    // filter pages with last edited time
    const manifest = await readFile(manifestFilePath, 'utf-8').then((s) => JSON.parse(s));
    const editedPages = pages.filter((page) => {
      const lastEditedTime = page.last_edited_time;
      const lastEditedTimeInManifest = manifest[page.id];
      return lastEditedTime !== lastEditedTimeInManifest;
    });
    console.log(`${editedPages.length} pages are edited`);
    // update manifest
    pages.forEach((page) => {
      manifest[page.id] = page.last_edited_time;
    });
    await writeFile(manifestFilePath, JSON.stringify(manifest, null, 2));

    if (editedPages.length === 0) {
      return [];
    }
    console.log('Fetching page content...');
    const progress = new SingleBar({});
    progress.start(editedPages.length, 0);
    const limit = pLimit(2);
    const pagesWithContent = await Promise.all(
      editedPages.map((page) =>
        limit(async () => {
          const properties = page.properties as BlogPageProperties;
          const blocks = await fetchChildBlocks(notion, page.id).catch((e) => {
            console.error(`Failed to fetch content of ${page.url}`, e);
            return [];
          });
          progress.increment();
          return {
            ...page,
            properties,
            slug: properties.slug.rich_text[0].plain_text,
            content: blocks,
          };
        }),
      ),
    );
    progress.stop();
    console.log('Fetched page content');
    return pagesWithContent;
  }
}
