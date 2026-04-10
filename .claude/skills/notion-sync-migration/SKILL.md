---
name: notion-sync-migration
description: "@lacolaco/notion-syncのメジャーバージョンアップを実行する。notion-syncのアップグレード、マイグレーション、バージョンアップと言われた時に使用する。新バージョンが未公開の場合はポーリングで待機する。"
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash(pnpm add:*)
  - Bash(pnpm format:*)
  - Bash(pnpm notion-sync:*)
  - Bash(npx tsc:*)
  - Bash(npm view:*)
  - Bash(git:*)
  - Bash(gh:*)
  - Bash(sleep:*)
---

# notion-sync Migration

`@lacolaco/notion-sync`のメジャーバージョンアップを安全に実行する。

## 原則

**旧バージョンの知識を全て捨てろ。** 新バージョンのCHANGELOGとREADMEを全文読むまで、コード変更を一切行うな。

## 手順

### 1. 現状確認

```bash
grep "notion-sync" package.json
```

現在のバージョンと、対象バージョンを特定する。

### 2. 新バージョンの取得

対象バージョンがnpmに公開済みか確認する。

```bash
npm view @lacolaco/notion-sync version
```

未公開の場合、バックグラウンドで30秒間隔でポーリングする。

```bash
while true; do
  version=$(npm view @lacolaco/notion-sync version 2>/dev/null)
  if [[ "$version" == <target-major>.* ]]; then
    echo "published: $version"
    break
  fi
  sleep 30
done
```

### 3. インストール

```bash
pnpm add -D @lacolaco/notion-sync@<version>
```

### 4. ドキュメント精読（省略禁止）

インストール後、以下を**全文Read**する。grepでの部分検索は精読の代替にならない。

1. `node_modules/@lacolaco/notion-sync/CHANGELOG.md` — Breaking Changesを全て把握
2. `node_modules/@lacolaco/notion-sync/README.md` — 新APIの仕様とMigration Guideを把握

Breaking Changesの一覧を列挙し、現在のコード（`tools/notion-sync/main.ts`）への影響を対応付けてからコード変更に着手する。

### 5. コード変更

`tools/notion-sync/main.ts`を修正する。

変更時の注意:
- Migration Guideの Before/After に従う
- 型パラメータの追加など、Breaking Change以外の改善も適用する
- 不要になった型アサーション（`as`キャスト）は削除する
- 消費者コードが明示的に抽出しているフィールドは、ライブラリ内部が同じ値を返す場合でも削除しない。消費者の意図的な依存境界を尊重する

### 6. 検証

以下を全て通過させる。

```bash
npx tsc --noEmit -p tools/tsconfig.json
pnpm notion-sync -- --dry-run
pnpm format
```

dry-runの出力を確認し、queryFilterやmetadata生成が正しく動作していることを検証する。

### 7. コミット・PR

通常のpr-lifecycleスキルに従う。
