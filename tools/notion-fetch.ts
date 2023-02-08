import 'dotenv/config';

import { parseArgs } from 'node:util';
import * as path from 'node:path';
import { ImagesRepository, LocalPostsRepository, RemotePostsRepository } from './lib/posts/repository';
import { Client } from '@notionhq/client';
import { NotionAPI } from './lib/notion';
import { LocalPostFactory } from './lib/posts/factory';

if (process.env.NOTION_AUTH_TOKEN == null) {
  console.error('Please set NOTION_AUTH_TOKEN');
  process.exit(1);
}
const notion = new NotionAPI(new Client({ auth: process.env.NOTION_AUTH_TOKEN }));
const postsDir = path.resolve(__dirname, '../articles');
const imagesDir = path.resolve(__dirname, '../images');

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

const remotePostsRepo = new RemotePostsRepository(notion);
const localPostsRepo = new LocalPostsRepository(postsDir, { dryRun });
const imagesRepo = new ImagesRepository(imagesDir, { dryRun });
const postFactory = new LocalPostFactory(localPostsRepo, imagesRepo, { forceUpdate: force });

async function main() {
  // collect posts from notion
  const posts = await remotePostsRepo.query();
  // write posts to file
  await postFactory.create(posts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
