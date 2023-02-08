import { format } from 'prettier';
import { BlockObject } from '../../notion';
import { RendererContext } from '../types';
import { isNotNull } from '../utils';
import { renderFrontmatter } from './frontmatter';
import * as md from './markdown';

export function renderPage(
  properties: Record<string, unknown>,
  content: BlockObject[],
  context: RendererContext,
): string {
  const frontmatter = renderFrontmatter(properties);
  const body = content.map((block) => renderBlock(block, context)).join('');
  return format([frontmatter, body].join('\n\n'), {
    parser: 'markdown',
    printWidth: 80,
    singleQuote: true,
    trailingComma: 'all',
  });
}

export function renderRichText(text: md.RichText): string {
  return md.decorateText(text);
}

export function renderBlock(block: BlockObject, context: RendererContext): string | null {
  const stringify = (node: BlockObject, contents: string[]): string | null => {
    switch (node.type) {
      case 'heading_1':
        return md.heading(node.heading_1.rich_text, 1);
      case 'heading_2':
        return md.heading(node.heading_2.rich_text, 2);
      case 'heading_3':
        return md.heading(node.heading_3.rich_text, 3);
      case 'paragraph':
        return md.paragraph(node.paragraph.rich_text);
      case 'code':
        return md.codeBlock(node.code.rich_text, node.code.language);
      case 'bulleted_list_item':
        return md.bulletedListItem(node.bulleted_list_item.rich_text, contents);
      case 'numbered_list_item':
        return md.numberedListItem(node.numbered_list_item.rich_text, contents);
      case 'quote':
        return md.quote(node.quote.rich_text);
      case 'divider':
        return md.divider();
      case 'bookmark':
        return md.linkPreview(node.bookmark.url);
      case 'link_preview':
        return md.linkPreview(node.link_preview.url);
      case 'callout':
        const emojiIcon = node.callout.icon?.type === 'emoji' ? node.callout.icon.emoji : undefined;
        return md.callout(node.callout.rich_text, emojiIcon);
      case 'image':
        switch (node.image.type) {
          case 'external':
            return md.image(node.image.external.url, node.image.caption);
          case 'file':
            const url = node.image.file.url;
            const name = decodeURIComponent(new URL(url).pathname).replace(/^\/secure\.notion-static\.com\//, '');
            const localPath = `${context.slug}/${name}`;
            context.fetchExternalImage({ url, localPath: localPath });
            return md.image(`/images/${localPath}`, node.image.caption);
        }
      case 'equation':
        return md.equation(node.equation.expression);
      case 'toggle':
        return md.details(node.toggle.rich_text, contents);
      case 'embed':
        return md.embed(node.embed.url);
      case 'video':
        switch (node.video.type) {
          case 'external':
            return md.video(node.video.external.url);
        }
      case 'table':
      case 'table_row':
    }
    return null;
  };

  const visit = (node: BlockObject) => {
    const contents: string[] = node.children?.map((child) => visit(child)).filter(isNotNull) ?? [];
    return stringify(node, contents) ?? `<!--${node.type}-->\n<!--${JSON.stringify(node)}-->\n\n`;
  };
  return visit(block);
}
