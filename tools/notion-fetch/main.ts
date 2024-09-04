import { BlogRepository } from '@lacolaco/notion-fetch';
import { readFile, writeFile } from 'node:fs/promises';
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
  const db = new BlogRepository(NOTION_AUTH_TOKEN);
  const { lastNotionFetch } = await readManifest();
  const pages = await db.fetchPages('zenn', { newerThan: new Date(lastNotionFetch) });
  console.log(`Fetched ${pages.length} pages`);

  if (pages.length > 0) {
    console.log(`Updating markdown files...`);
    await Promise.all(
      pages.map(async (page) => {
        return { ...page, slug: page.properties.slug.rich_text[0].plain_text };
      }),
    ).then((pages) => postFactory.create(pages));
  }

  if (!dryRun) {
    // update manifest
    await writeManifest({ lastNotionFetch: new Date().toISOString() });
  }
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function readManifest() {
  const file = await readFile(new URL('../../notion-fetch-manifest.json', import.meta.url), 'utf-8');
  return JSON.parse(file) as { lastNotionFetch: string };
}

async function writeManifest(manifest: { lastNotionFetch: string }) {
  await writeFile(new URL('../../notion-fetch-manifest.json', import.meta.url), JSON.stringify(manifest, null, 2));
}
