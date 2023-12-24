import { parseArgs } from 'node:util';
import { NotionDatabase } from './notion';
import { LocalPostFactory } from './posts/factory';
import { ImagesRepository, LocalPostsRepository } from './posts/repository';

if (process.env.NOTION_AUTH_TOKEN == null) {
  console.error('Please set NOTION_AUTH_TOKEN');
  process.exit(1);
}

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
  const db = new NotionDatabase();
  const localPostsRepo = new LocalPostsRepository(postsDir, { dryRun });
  const imagesRepo = new ImagesRepository(imagesDir, { dryRun });
  const postFactory = new LocalPostFactory(localPostsRepo, imagesRepo, { forceUpdate: force });

  // collect posts from notion
  console.log('Fetching pages...');
  const pages = await db.queryBlogPages();
  console.log(`Fetched ${pages.length} pages`);
  if (pages.length > 0) {
    console.log('Creating posts...');
    if (verbose) {
      console.log(JSON.stringify(pages, null, 2));
    }
    await postFactory.create(pages);
  }
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
