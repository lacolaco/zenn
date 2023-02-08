import { Client } from '@notionhq/client';

export type PageObject = MatchType<
  ElementType<Awaited<ReturnType<Client['databases']['query']>>['results']>,
  {
    properties: unknown;
  }
>;

export type BlockObject = MatchType<
  ElementType<Awaited<ReturnType<Client['blocks']['children']['list']>>['results']>,
  { type: unknown }
> & {
  children?: BlockObject[];
};
