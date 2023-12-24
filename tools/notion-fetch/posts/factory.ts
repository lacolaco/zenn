import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import tz from 'dayjs/plugin/timezone';
import { defer, forkJoin, lastValueFrom } from 'rxjs';
import { BlockObject, PageObjectWithContent } from '../notion';
import { renderTitle } from './renderer/markdown';
import { renderPage } from './renderer/renderer';
import { ImagesRepository, LocalPostsRepository } from './repository';
import { PostAttributes, TaskFactory } from './types';

dayjs.extend(utc);
dayjs.extend(tz);

export class LocalPostFactory {
  constructor(
    private readonly localPostsRepositiry: LocalPostsRepository,
    private readonly imagesRepository: ImagesRepository,
    private readonly options: { forceUpdate?: boolean },
  ) {}

  async create(pages: PageObjectWithContent[]) {
    await Promise.all(pages.map((page) => this.createPost(page)));
  }

  private async createPost(page: PageObjectWithContent) {
    const { icon, properties } = page;
    const title = renderTitle(properties.title);
    const slug = properties.slug.rich_text[0]?.plain_text ?? null;
    const tags = properties.tags.multi_select.map((node) => node.name.toLowerCase()) ?? [];
    const publishable = properties.published.checkbox ?? false;
    const createdAtOverride = properties.created_at_override?.date?.start ?? null;
    const publishedAt = new Date(createdAtOverride ?? page.created_time).toISOString();
    if (title == null || slug == null) {
      console.warn(`title or slug is null: ${JSON.stringify(page, null, 2)}`);
      return;
    }
    const emoji = icon?.type === 'emoji' ? icon.emoji : '✨';

    const props: PostAttributes = {
      title,
      published_at: dayjs(publishedAt).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm'),
      topics: tags,
      published: publishable,
      source: page.url,
      type: 'tech',
      emoji,
    };
    // render post content
    const deferredTasks: Array<TaskFactory> = [];
    const rendered = await this.renderPost(slug, props, page.content, (task) => deferredTasks.push(task));

    // skip if the content is not changed
    const existing = await this.localPostsRepositiry.loadPost(slug);
    if (existing != null && existing === rendered && !this.options.forceUpdate) {
      console.log(`skip ${slug} (local is up to date)`);
      return;
    }
    console.log(`update ${slug}`);

    // clear post assets
    await this.imagesRepository.clearPostImages(slug);
    // consume deferred tasks
    if (deferredTasks.length > 0) {
      await lastValueFrom(forkJoin(deferredTasks.map(defer)));
    }
    await this.localPostsRepositiry.savePost(slug, rendered);
  }

  private renderPost(
    slug: string,
    properties: { [key: string]: unknown },
    content: BlockObject[],
    addAsyncTask: (factory: TaskFactory) => void,
  ): Promise<string> {
    return renderPage(properties, content, {
      slug,
      fetchExternalImage: (req) => addAsyncTask(async () => this.imagesRepository.download(req.url, req.localPath)),
    });
  }
}
