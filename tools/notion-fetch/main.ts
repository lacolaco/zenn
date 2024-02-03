import { fetchZennPostPages } from '@lacolaco/notion-fetch';
import { parseArgs } from 'node:util';
import { LocalPostFactory } from './posts/factory';
import { ImagesRepository, LocalPostsRepository } from './posts/repository';

if (process.env.NOTION_AUTH_TOKEN == null) {
  console.error('Please set NOTION_AUTH_TOKEN');
  process.exit(1);
}

const { NOTION_AUTH_TOKEN } = process.env;

const postsDir = new URL('../../articles', import.meta.url).pathname;
const imagesDir = new URL('../../images', import.meta.url).pathname;

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    force: {
      type: 'boolean',
      short: 'f',
    },
    'dry-run': {
      type: 'boolean',
      short: 'D',
    },
    verbose: {
      type: 'boolean',
    },
  },
});
const { force = false, 'dry-run': dryRun = false, verbose = false } = values;

async function main() {
  const localPostsRepo = new LocalPostsRepository(postsDir, { dryRun });
  const imagesRepo = new ImagesRepository(imagesDir, { dryRun });
  const postFactory = new LocalPostFactory(localPostsRepo, imagesRepo, { forceUpdate: force });

  // collect posts from notion
  console.log('Fetching pages...');
  const pages = await fetchZennPostPages(NOTION_AUTH_TOKEN, dryRun);
  console.log(`Fetched ${pages.length} pages`);
  const pagesToUpdate = pages.filter((page) => force || page.changed);

  if (pagesToUpdate.length === 0) {
    console.log('No pages to update');
  } else {
    console.log(`Updating ${pagesToUpdate.length} pages...`);
    await Promise.all(
      pagesToUpdate.map(async (page) => {
        return { ...page, slug: page.properties.slug.rich_text[0].plain_text };
      }),
    ).then((pages) => postFactory.create(pages));
  }
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
