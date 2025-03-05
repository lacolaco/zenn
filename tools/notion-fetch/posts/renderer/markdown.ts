import { BlockObject, PageProperty } from '../../notion';
import { RendererContext } from '../types';
import { isNotNull } from '../utils';

export function renderTitle(block: PageProperty<'title'>): string {
  return plainText(block.title);
}

export function renderBlock(block: BlockObject, context: RendererContext): string | null {
  const stringify = (node: BlockObject, contents: string[]): string | null => {
    switch (node.type) {
      case 'heading_1':
        return heading(node.heading_1.rich_text, 1);
      case 'heading_2':
        return heading(node.heading_2.rich_text, 2);
      case 'heading_3':
        return heading(node.heading_3.rich_text, 3);
      case 'paragraph':
        return paragraph(node.paragraph.rich_text);
      case 'code':
        return codeBlock(node.code.rich_text, node.code.language);
      case 'bulleted_list_item':
        return bulletedListItem(node.bulleted_list_item.rich_text, contents);
      case 'numbered_list_item':
        return numberedListItem(node.numbered_list_item.rich_text, contents);
      case 'quote':
        return quote(node.quote.rich_text);
      case 'divider':
        return divider();
      case 'bookmark':
        return linkPreview(node.bookmark.url);
      case 'link_preview':
        return linkPreview(node.link_preview.url);
      case 'callout':
        const emojiIcon = node.callout.icon?.type === 'emoji' ? node.callout.icon.emoji : undefined;
        return callout(node.callout.rich_text, emojiIcon);
      case 'image':
        switch (node.image.type) {
          case 'external':
            return image(node.image.external.url, node.image.caption);
          case 'file':
            const url = node.image.file.url;
            const [fileId, ext] = new URL(url).pathname.match(/^(.+)\/.+\.(.+)$/)?.slice(1) ?? [];
            if (fileId == null) {
              throw new Error(`Invalid image url: ${url}`);
            }
            const localPath = `${context.slug}${fileId}.${ext}`;
            context.fetchExternalImage({ url, localPath: localPath });
            return image(`/images/${localPath}`, node.image.caption);
        }
      case 'equation':
        return equation(node.equation.expression);
      case 'toggle':
        return details(node.toggle.rich_text, contents);
      case 'embed':
        return embed(node.embed.url);
      case 'video':
        switch (node.video.type) {
          case 'external':
            return video(node.video.external.url);
          default:
            return null;
        }
      case 'table':
        return table(node);
      case 'table_row':
        return tableRow(node);
    }
    return null;
  };

  const visit = (node: BlockObject) => {
    const contents: string[] = node.children?.map((child) => visit(child)).filter(isNotNull) ?? [];
    return stringify(node, contents) ?? `<!--${node.type}-->\n<!--${JSON.stringify(node)}-->\n\n`;
  };
  return visit(block);
}

type TextAnnotations = {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
};

type TextNode = {
  type: 'text';
  plain_text: string;
  href: string | null;
  annotations: TextAnnotations;
};

type MentionNode = {
  type: 'mention';
  plain_text: string;
  href: string | null;
  annotations: TextAnnotations;
};

type EquationNode = {
  type: 'equation';
  plain_text: string;
  href: string | null;
  annotations: TextAnnotations;
};

type RichTextNode = TextNode | MentionNode | EquationNode;

export type RichText = Array<RichTextNode>;

const heading = (text: RichText, level: 1 | 2 | 3) => `${'#'.repeat(level)} ${richText(text)}\n\n`;
const paragraph = (text: RichText) => `\n${richText(text)}\n\n`;

const codeBlock = (text: RichText, language?: string) => {
  const delimiter = '```';
  return `${delimiter}${language ?? ''}\n${plainText(text)}\n${delimiter}\n\n`;
};

const bulletedListItem = (text: RichText, contents: string[]) => {
  return `- ${richText(text)}\n${contents.map(indent).join('')}`;
};

const numberedListItem = (text: RichText, contents: string[]) => {
  return `1. ${richText(text)}\n${contents.map(indent).join('')}`;
};

const quote = (text: RichText) => `> ${richText(text)}\n\n`;

const divider = () => '---\n\n';

const linkPreview = (url: string) => {
  return embed(url) ?? `${url}\n\n`;
};

const callout = (text: RichText, emojiIcon?: string) => {
  return `:::message\n${richText(text)}\n:::\n\n`;
};

const image = (url: string, caption: RichText) => {
  const captionText = richText(caption);
  if (captionText) {
    return `![](${url})\n*${captionText}*\n\n`;
  }
  return `![](${url})\n\n`;
};

const equation = (expression: string) => {
  return `$$\n${expression}\n$$\n\n`;
};

const details = (summary: RichText, contents: string[]) => {
  return `:::details ${plainText(summary)}\n\n${contents.join('')}\n\n:::\n\n`;
};

const embed = (url: string) => {
  const parsedUrl = new URL(url);
  // Stackblitz
  if (parsedUrl.host === 'stackblitz.com' && parsedUrl.searchParams.get('embed') === '1') {
    return `@[stackblitz](${url})\n\n`;
  }
  // Twitter status
  if (['twitter.com', 'x.com'].includes(parsedUrl.host) && parsedUrl.pathname.includes('/status/')) {
    return `${parsedUrl}\n\n`;
  }
  // Google slide (pub->embed replace)
  if (parsedUrl.host === 'docs.google.com' && /^\/presentation\/.+\/pub$/.test(parsedUrl.pathname)) {
    const embedUrl = url.replace('/pub', '/embed');
    return `${embedUrl}\n\n`;
  }
  return null;
};

const video = (url: string) => {
  const parsedUrl = new URL(url);
  // YouTube
  if (parsedUrl.host === 'www.youtube.com' && parsedUrl.searchParams.has('v')) {
    return `${parsedUrl}\n\n`;
  }
  return null;
};

const table = (block: BlockObject<'table'>) => {
  const hasHeader = block.table.has_column_header;
  const rows = (block.children ?? []).map((child) => tableRow(child as BlockObject<'table_row'>)).filter(isNotNull);
  const columns = rows[0] ? rows[0].split('|').length - 2 : 0;
  const header = hasHeader ? rows.shift() : `|${'|'.repeat(columns)}\n`;
  const alignment = `|${':--|'.repeat(columns)}`;
  return `${header}${alignment}\n${rows.join('')}\n\n`;
};

const tableRow = (block: BlockObject<'table_row'>) => {
  const cells = (block.table_row.cells ?? []).map((child) => richText(child)).filter(isNotNull);
  return `|${cells.join('|')}|\n`;
};

function indent(text: string): string {
  return `\t${text}`;
}

function richText(text: RichText): string {
  const renderNode = (node: RichTextNode): string => {
    const { type, plain_text, href, annotations } = node;
    if (type === 'mention') {
      // mention is only available in Notion
      return '';
    }
    if (type === 'equation') {
      return `$${plain_text}$`;
    }
    if (annotations.code) {
      return `\`${plain_text}\``;
    }
    if (annotations.bold) {
      return renderNode({ ...node, plain_text: `**${plain_text}**`, annotations: { ...annotations, bold: false } });
    }
    if (annotations.italic) {
      return renderNode({
        ...node,
        plain_text: plain_text.startsWith('*') ? `_${plain_text}_` : `*${plain_text}*`,
        annotations: { ...annotations, italic: false },
      });
    }
    if (annotations.strikethrough) {
      return renderNode({
        ...node,
        plain_text: `~~${plain_text}~~`,
        annotations: { ...annotations, strikethrough: false },
      });
    }
    if (annotations.underline) {
      return renderNode({
        ...node,
        plain_text: `__${plain_text}__`,
        annotations: { ...annotations, underline: false },
      });
    }
    if (href) {
      return renderNode({ ...node, plain_text: `[${plain_text}](${href})`, href: null });
    }
    if (plain_text.includes('\n')) {
      return plain_text.replace(/\n/g, '  \n');
    }
    return plain_text;
  };

  return text.map(renderNode).join('');
}

function plainText(text: RichText): string {
  return text.map((node) => node.plain_text).join('');
}
