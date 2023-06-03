import { Client } from '@notionhq/client';
import { BlockObject, PageObject } from './types';

export class NotionAPI {
  constructor(private readonly client: Client) {}

  async queryAllPages(databaseId: string): Promise<PageObject[]> {
    const pages: PageObject[] = [];
    let cursor = null;
    do {
      const { results, next_cursor, has_more } = await this.client.databases.query({
        database_id: databaseId,
        start_cursor: cursor ?? undefined,
        filter: {
          and: [
            { property: 'published', checkbox: { equals: true } },
            { property: 'slug', rich_text: { is_not_empty: true } },
            { property: 'title', title: { is_not_empty: true } },
            {
              property: 'distribution',
              multi_select: { contains: 'zenn' },
            },
          ],
        },
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        archived: false,
      });
      for (const page of results) {
        if ('properties' in page) {
          pages.push(page);
        }
      }
      cursor = has_more ? next_cursor : null;
    } while (cursor !== null);
    return pages;
  }

  async fetchChildBlocks(parentId: string): Promise<BlockObject[]> {
    const blocks: BlockObject[] = [];
    let cursor = null;
    do {
      const { results, next_cursor, has_more } = await this.client.blocks.children.list({
        block_id: parentId,
        start_cursor: cursor ?? undefined,
      });
      for (const block of results) {
        if ('type' in block) {
          if (block.has_children) {
            const children = await this.fetchChildBlocks(block.id);
            blocks.push({ ...block, children });
          } else {
            blocks.push({ ...block });
          }
        }
      }
      cursor = has_more ? next_cursor : null;
    } while (cursor !== null);
    return blocks;
  }
}
