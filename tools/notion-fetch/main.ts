import 'dotenv/config';

import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { NotionDatabase } from './notion';
import { LocalPostFactory } from './posts/factory';
import { ImagesRepository, LocalPostsRepository } from './posts/repository';

if (process.env.NOTION_AUTH_TOKEN == null) {
  console.error('Please set NOTION_AUTH_TOKEN');
  process.exit(1);
}

const postsDir = path.resolve(__dirname, '../../articles');
const imagesDir = path.resolve(__dirname, '../../images');

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
  },
});
const { force = false, 'dry-run': dryRun = false } = values;

async function main() {
  const db = new NotionDatabase();
  const localPostsRepo = new LocalPostsRepository(postsDir, { dryRun });
  const imagesRepo = new ImagesRepository(imagesDir, { dryRun });
  const postFactory = new LocalPostFactory(localPostsRepo, imagesRepo, { forceUpdate: force });

  // collect posts from notion
  const pages = await db.queryBlogPages();
  if (pages.length > 0) {
    await postFactory.create(pages);
  }
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
