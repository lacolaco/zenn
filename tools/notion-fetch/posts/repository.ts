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
    let buffer = Buffer.from(data);

    // Check if image size exceeds 2MB and resize if necessary
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (buffer.length > maxSize) {
      console.log(`[ImagesRepository] resizing ${localPath} (${Math.round(buffer.length / 1024 / 1024 * 100) / 100}MB)`);
      buffer = await this.resizeToTargetSize(buffer, maxSize);
    }

    await this.saveImage(localPath, buffer as WriteFileData);
  }

  private async resizeToTargetSize(buffer: Buffer, maxSize: number): Promise<Buffer> {
    const sharp = await import('sharp');
    let currentBuffer = buffer;

    while (currentBuffer.length > maxSize) {
      const image = sharp.default(currentBuffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to get image dimensions');
      }

      // Calculate scale to achieve 50% file size (≈ 50% area = √0.5 ≈ 0.707 scale)
      const scale = Math.sqrt(0.5);
      const newWidth = Math.round(metadata.width * scale);
      const newHeight = Math.round(metadata.height * scale);

      currentBuffer = await image.resize(newWidth, newHeight).toBuffer();

      console.log(`[ImagesRepository] compressed to ${Math.round(currentBuffer.length / 1024 / 1024 * 100) / 100}MB`);
    }

    return currentBuffer;
  }
}
