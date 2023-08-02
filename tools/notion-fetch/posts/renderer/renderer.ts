import { format } from 'prettier';
import { BlockObject } from '../../notion';
import { RendererContext } from '../types';
import { renderFrontmatter } from './frontmatter';
import { renderBlock } from './markdown';

export function renderPage(
  properties: Record<string, unknown>,
  content: BlockObject[],
  context: RendererContext,
): Promise<string> {
  const frontmatter = renderFrontmatter(properties);
  const body = content.map((block) => renderBlock(block, context)).join('');
  return format([frontmatter, body].join('\n\n'), {
    parser: 'markdown',
    printWidth: 80,
    singleQuote: true,
    trailingComma: 'all',
  });
}
