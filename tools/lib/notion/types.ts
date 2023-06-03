import type { Client } from '@notionhq/client';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';

export type PageObject = MatchType<
  ElementType<Awaited<ReturnType<Client['databases']['query']>>['results']>,
  {
    properties: unknown;
  }
>;

export type PageProperties = PageObject['properties'];

export type PageProperty<T extends string> = PageProperties[string] & { type: T };

export type BlogPageProperties = PageProperties & {
  title: PageProperty<'title'>;
  slug: PageProperty<'rich_text'>;
  tags: PageProperty<'multi_select'>;
  published: PageProperty<'checkbox'>;
  canonical_url: PageProperty<'url'>;
  created_at_override: PageProperty<'date'>;
  updated_at: PageProperty<'date'>;
};

export type BlockObjectType = BlockObjectResponse['type'] | unknown;

export type BlockObject<T extends BlockObjectType = unknown> = BlockObjectResponse & {
  type: T;
  children?: BlockObject[];
};

export type PageObjectWithContent = PageObject & {
  properties: BlogPageProperties;
  slug: string;
  content: BlockObject[];
};
