import * as yaml from 'js-yaml';

export function renderFrontmatter(params: Record<string, unknown>): string {
  const frontmatter = yaml.dump(params, { forceQuotes: true });
  return [`---`, frontmatter, `---`].join('\n');
}

export function parseFrontmatter(content: string): Record<string, unknown> {
  const [, frontmatter] = content.split('---\n');
  return yaml.load(frontmatter) as Record<string, unknown>;
}
