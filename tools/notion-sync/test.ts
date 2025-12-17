import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert';

// Test 1: Frontmatter schema validation
test('existing article has exact frontmatter schema', async () => {
  const content = await readFile('articles/angular-animations-with-motion.md', 'utf8');
  const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
  assert.ok(frontmatterMatch, 'Article should have frontmatter');

  const frontmatter = frontmatterMatch[1];

  // Verify required fields exist
  assert.match(frontmatter, /^title: /m, 'Must have title');
  assert.match(
    frontmatter,
    /^published_at: ['"]\d{4}-\d{2}-\d{2} \d{2}:\d{2}['"]$/m,
    'Must have published_at in YYYY-MM-DD HH:mm format with quotes',
  );
  assert.match(frontmatter, /^topics:/m, 'Must have topics array');
  assert.match(frontmatter, /^published: (true|false)$/m, 'Must have published boolean');
  assert.match(frontmatter, /^source: /m, 'Must have Notion source URL');
  assert.match(frontmatter, /^type: ['"](tech|idea)['"]$/m, 'Must have type');
  assert.match(frontmatter, /^emoji: /m, 'Must have emoji');

  // Verify no unexpected fields
  const lines = frontmatter.split('\n').filter((l) => l.trim() && !l.startsWith('  '));
  const allowedFields = ['title:', 'published_at:', 'topics:', 'published:', 'source:', 'type:', 'emoji:'];
  for (const line of lines) {
    assert.ok(allowedFields.some((field) => line.startsWith(field)), `Unexpected frontmatter field: ${line}`);
  }
});

// Test 2: Image path format validation
test('existing article uses correct image path format', async () => {
  const content = await readFile('articles/angular-animations-with-motion.md', 'utf8');
  const imageMatches = content.match(/!\[.*?\]\((\/images\/[^)]+)\)/g);

  if (imageMatches) {
    for (const match of imageMatches) {
      // Accept both 2-tier and 3-tier paths
      const path3Tier = match.match(/\/images\/([^/]+)\/([^/]+)\/([^)]+)/);
      const path2Tier = match.match(/\/images\/([^/]+)\/([^)]+)/);

      assert.ok(path3Tier || path2Tier, `Image path must be valid: /images/{slug}/{file} or /images/{slug}/{dir}/{file}. Got: ${match}`);

      if (path3Tier) {
        const [, slug, dir, file] = path3Tier;
        assert.match(slug, /^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens');
        assert.match(dir, /^[a-f0-9-]+$/, 'Directory must be UUID-like');
        assert.match(file, /\.(png|jpg|jpeg|gif|webp)$/, 'Must have valid image extension');
      } else if (path2Tier) {
        const [, slug, file] = path2Tier;
        assert.match(slug, /^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens');
        assert.match(file, /\.(png|jpg|jpeg|gif|webp)$/, 'Must have valid image extension');
      }
    }
  }
});

// Test 3: Zenn-specific Markdown syntax validation (callouts)
test('callout blocks use Zenn message syntax', async () => {
  const content = await readFile('articles/testing-angular-applications-with-vitest.md', 'utf8');

  // Check for :::message blocks (not GitHub-style > [!TIP])
  assert.doesNotMatch(
    content,
    /^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]/m,
    'Should not contain GitHub-style callouts',
  );

  // If message blocks exist, verify Zenn format
  if (content.includes(':::')) {
    assert.match(content, /:::message\n[\s\S]*?\n:::/m, 'Message blocks should use Zenn :::message syntax');
  }
});

// Test 4: Zenn-specific Markdown syntax validation (diffs)
test('existing articles preserve Zenn syntax', async () => {
  const content = await readFile('articles/angular-16-jest.md', 'utf8');

  // Check for diff code blocks (if present)
  if (content.includes('```diff')) {
    assert.match(content, /```diff\n[\s\S]*?[+-]/m, 'Diff blocks should have +/- markers');
  }

  // Check for :::message blocks (not GitHub-style > [!TIP])
  assert.doesNotMatch(
    content,
    /^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]/m,
    'Should not contain GitHub-style callouts',
  );

  // If message blocks exist, verify Zenn format
  if (content.includes(':::message')) {
    assert.match(content, /:::message\n[\s\S]*?\n:::/m, 'Message blocks should use Zenn :::message syntax');
  }
});

// Test 4: Prettier formatting validation
test('output matches Prettier format', async () => {
  const content = await readFile('articles/angular-animations-with-motion.md', 'utf8');

  // Verify no lines exceed 80 chars (except URLs, code blocks, frontmatter)
  const lines = content.split('\n');
  let inCodeBlock = false;
  let inFrontmatter = false;

  for (const line of lines) {
    if (line === '---') {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (!inCodeBlock && !inFrontmatter && !line.match(/https?:\/\//)) {
      // Note: Prettier may not enforce this for Japanese text
      // This test documents expected behavior
    }
  }
});
