import { syncNotionDatasource, type PostMetadata } from '@lacolaco/notion-sync';
import { parseArgs } from 'node:util';
import { readdir, stat, rename, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import tz from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(tz);

// Custom metadata type for Zenn articles
interface ZennMetadata {
  icon: string;
  createdAtOverride: string | null;
  type: 'tech' | 'idea';
  channels: string[];
}

if (process.env.NOTION_AUTH_TOKEN == null) {
  console.error('Please set NOTION_AUTH_TOKEN');
  process.exit(1);
}

const NOTION_AUTH_TOKEN = process.env.NOTION_AUTH_TOKEN;
// Shared Notion database ID (same as blog.lacolaco.net)
const DATASOURCE_ID = 'a902ee6d-dc94-4301-b772-fa5fb8decc0c';

const rootDir = new URL('../..', import.meta.url).pathname;

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
    mode: {
      type: 'string',
      default: 'incremental',
    },
  },
});

const { force = false, 'dry-run': dryRun = false, verbose = false, mode = 'incremental' } = values;

async function resizeOversizedImages() {
  const MAX_SIZE_MB = 2;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  async function* walkFiles(dir: string): AsyncGenerator<string> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        yield* walkFiles(path);
      } else if (entry.isFile() && /\.(png|jpg|jpeg|gif|webp)$/i.test(entry.name)) {
        yield path;
      }
    }
  }

  async function resizeIfNeeded(filePath: string): Promise<void> {
    const stats = await stat(filePath);
    if (stats.size <= MAX_SIZE_BYTES) {
      return;
    }

    if (verbose) {
      console.log(`Resizing ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    }

    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Calculate new dimensions to target ~1.8MB (leaving headroom)
    const targetSize = MAX_SIZE_BYTES * 0.9;
    const scaleFactor = Math.sqrt(targetSize / stats.size);
    const newWidth = Math.round((metadata.width || 1920) * scaleFactor);

    await image.resize(newWidth, null, { withoutEnlargement: true }).toFile(filePath + '.tmp');

    // Check if resized file is still too large
    const resizedStats = await stat(filePath + '.tmp');
    if (resizedStats.size > MAX_SIZE_BYTES) {
      // Try with more aggressive compression
      await sharp(filePath)
        .resize(Math.round(newWidth * 0.8), null, { withoutEnlargement: true })
        .png({ quality: 80, compressionLevel: 9 })
        .toFile(filePath + '.tmp2');

      await unlink(filePath + '.tmp');
      await rename(filePath + '.tmp2', filePath);
    } else {
      await rename(filePath + '.tmp', filePath);
    }

    if (verbose) {
      const finalStats = await stat(filePath);
      console.log(`  → ${(finalStats.size / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  const imagesDir = `${rootDir}/images`;
  let count = 0;
  for await (const file of walkFiles(imagesDir)) {
    await resizeIfNeeded(file);
    count++;
  }

  if (verbose && count > 0) {
    console.log(`Processed ${count} images for size optimization.`);
  }
}

async function main() {
  const result = await syncNotionDatasource<PostMetadata & ZennMetadata>({
    notion: {
      token: NOTION_AUTH_TOKEN,
      datasourceId: DATASOURCE_ID,
    },
    queryFilter: {
      and: [
        { property: 'distribution', multi_select: { contains: 'zenn' } },
        { property: 'published', checkbox: { equals: true } },
      ],
    },
    manifestPath: `${rootDir}/notion-sync.manifest.json`,
    metadataFilePath: resolve(rootDir, 'articles', 'metadata.json'),
    verbose,
    mode: mode as 'incremental' | 'all',
    force,
    dryRun,

    // Custom metadata extraction
    extractMetadata: (page, defaultExtractor) => {
      const metadata = defaultExtractor(page);
      const icon = page.icon && page.icon.type === 'emoji' ? page.icon.emoji : '✨';
      const createdAtOverride =
        'created_at_override' in page.properties &&
        page.properties.created_at_override.type === 'date' &&
        page.properties.created_at_override.date?.start
          ? page.properties.created_at_override.date.start
          : null;

      // Type: default to 'tech' (Zenn requirement)
      const type: 'tech' | 'idea' = 'tech';

      // Extract channels (formerly categories)
      const channels: string[] =
        'channels' in page.properties && page.properties.channels.type === 'multi_select'
          ? page.properties.channels.multi_select.map((opt: { name: string }) => opt.name)
          : [];

      return {
        ...metadata,
        icon,
        createdAtOverride,
        type,
        channels,
      };
    },

    // Markdown rendering options
    renderMarkdown: {
      getPageOutput: (metadata) => ({
        filePath: resolve(rootDir, 'articles', `${metadata.slug}.md`),
      }),
      getImageOutput: (image, metadata) => {
        const urlFilename = image.url.split('?')[0].split('#')[0].split('/').pop() ?? '';
        const dotIndex = urlFilename.lastIndexOf('.');
        const name = dotIndex > 0 ? urlFilename.substring(0, dotIndex) : urlFilename;
        const ext = dotIndex > 0 ? urlFilename.substring(dotIndex + 1).toLowerCase() : 'png';
        const hash = createHash('sha256').update(image.blockId).digest('hex').substring(0, 16);
        const filename = `${name}.${hash}.${ext}`;
        return {
          src: `/images/${metadata.slug}/${filename}`,
          filePath: resolve(rootDir, 'images', metadata.slug, filename),
        };
      },

      // Custom frontmatter generation for Zenn
      generateFrontmatter: (baseFields, metadata, renderContext) => {
        const { source_url, created_time } = baseFields;

        const publishedAt = new Date(metadata.createdAtOverride || created_time).toISOString();

        // Merge 'angular' channel into topics for Zenn
        const tags: string[] = (baseFields.tags || []).map((tag: string) => tag.toLowerCase());
        const angularChannel = metadata.channels.find((ch) => ch.toLowerCase() === 'angular');
        const topics = angularChannel ? [angularChannel.toLowerCase(), ...tags] : tags;

        return {
          title: baseFields.title,
          published_at: dayjs(publishedAt).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm'),
          topics,
          published: baseFields.published ?? false,
          source: source_url,
          type: metadata.type,
          emoji: metadata.icon,
        };
      },

      // Custom block renderers for Zenn syntax
      blockRenderers: {
        // Callout: Convert > [!TIP] to :::message
        callout: (block, context, defaultRenderer) => {
          const html = defaultRenderer(block);

          // Parse GitHub-style callout: > [!TIP]\n> content
          const match = html.match(/^> \[!(\w+)\]\s*\n((?:> .*\n?)*)/m);
          if (!match) return html; // fallback

          const [, , content] = match;
          // Remove "> " prefix from each line
          const messageContent = content.replace(/^> /gm, '').trim();

          return `:::message\n${messageContent}\n:::`;
        },

        // Image: Convert <figure> to ![](path) + _caption_
        image: (block, context, defaultRenderer) => {
          const html = defaultRenderer(block);

          // Parse <figure><img src="..." alt="..."><figcaption>...</figcaption></figure>
          const imgMatch = html.match(/<img src="([^"]+)" alt="([^"]*)">/);
          const captionMatch = html.match(/<figcaption>([^<]+)<\/figcaption>/);

          if (!imgMatch) return html; // fallback

          const [, src] = imgMatch;
          let markdown = `![](${src})`;

          if (captionMatch) {
            const [, caption] = captionMatch;
            markdown += `\n_${caption}_`;
          }

          return markdown;
        },

        embed: (block, context, defaultRenderer) => {
          const url = block.embed.url;

          // Stackblitz
          if (url.includes('stackblitz.com')) {
            return `@[stackblitz](${url})`;
          }

          // Twitter/X - pass through as URL
          if (url.includes('twitter.com') || url.includes('x.com')) {
            return url;
          }

          // Google Slides - transform /pub to /embed
          if (url.includes('docs.google.com/presentation')) {
            const embedUrl = url.replace('/pub', '/embed');
            return embedUrl;
          }

          // Default
          return defaultRenderer(block);
        },
      },
    },
  });

  console.log('Sync result:', result);

  // Resize oversized images (>2MB) for Zenn compatibility
  if (!dryRun) {
    await resizeOversizedImages();
  }

  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
