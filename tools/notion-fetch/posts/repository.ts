import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

type WriteFileData = Parameters<typeof writeFile>[1];

export class LocalPostsRepository {
  constructor(
    private readonly postsDir: string,
    private readonly options: { dryRun?: boolean } = {},
  ) {}

  async savePost(slug: string, content: string) {
    if (this.options.dryRun) {
      return;
    }
    const filePath = path.resolve(this.postsDir, `${slug}.md`);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, { encoding: 'utf8' });
  }

  async loadPost(slug: string): Promise<string | null> {
    const filePath = path.resolve(this.postsDir, `${slug}.md`);
    try {
      return await readFile(filePath, { encoding: 'utf8' });
    } catch (e) {
      return null;
    }
  }
}

export class ImagesRepository {
  constructor(
    private readonly imagesDir: string,
    private readonly options: { dryRun?: boolean } = {},
  ) {}

  async clearPostImages(slug: string) {
    if (this.options.dryRun) {
      return;
    }
    const dir = path.resolve(this.imagesDir, slug);
    try {
      await rm(dir, { recursive: true });
    } catch {}
  }

  async saveImage(localPath: string, data: WriteFileData): Promise<void> {
    const absPath = path.resolve(this.imagesDir, localPath);
    if (this.options.dryRun) {
      return;
    }
    await mkdir(path.dirname(absPath), { recursive: true });
    await writeFile(absPath, data);
  }

  async download(imageUrl: string, localPath: string): Promise<void> {
    console.log(`[ImagesRepository] downloading ${localPath}`);
    const resp = await fetch(new URL(imageUrl));
    if (!resp.ok) {
      throw new Error(`Failed to fetch image: ${imageUrl}`);
    }
    const data = await resp.arrayBuffer();
    await this.saveImage(localPath, Buffer.from(data));
  }
}
