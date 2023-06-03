import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { defer, forkJoin, lastValueFrom } from 'rxjs';
import { BlockObject, BlogPageProperties } from '../notion';
import { renderPage } from './renderer/renderer';
import { ImagesRepository, LocalPostsRepository } from './repository';
import { NotionPostPage, PostAttributes, TaskFactory } from './types';
import { renderTitle } from './renderer/markdown';

export class LocalPostFactory {
  constructor(
    private readonly localPostsRepositiry: LocalPostsRepository,
    private readonly imagesRepository: ImagesRepository,
    private readonly options: { forceUpdate?: boolean },
  ) {}

  async create(pages: NotionPostPage[]) {
    await Promise.all(pages.map((page) => this.createPost(page)));
  }

  private async createPost(page: NotionPostPage) {
    const { icon } = page;
    const properties = page.properties as BlogPageProperties;
    const title = renderTitle(properties.title);
    const slug = properties.slug.rich_text[0]?.plain_text ?? null;
    const tags = properties.tags.multi_select.map((node) => node.name) ?? [];
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
      published_at: format(utcToZonedTime(publishedAt, 'Asia/Tokyo'), 'yyyy-MM-dd HH:mm'),
      topics: tags,
      published: publishable,
      source: page.url,
      type: 'tech',
      emoji,
    };
    // render post content
    const deferredTasks: Array<TaskFactory> = [];
    const rendered = this.renderPost(slug, props, page.content, (task) => deferredTasks.push(task));

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
  ): string {
    return renderPage(properties, content, {
      slug,
      fetchExternalImage: (req) => addAsyncTask(async () => this.imagesRepository.download(req.url, req.localPath)),
    });
  }
}
