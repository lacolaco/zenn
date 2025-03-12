---
title: 'Weekly Commits on Angular 2025-03-12'
published_at: '2025-03-12 17:10'
topics:
  - 'angular'
published: true
source: 'https://www.notion.so/Weekly-Commits-on-Angular-2025-03-12-1ad3521b014a80e5bde2e61a84634c57'
type: 'tech'
emoji: '✨'
---

一週間の間にAngular関連レポジトリへ取り込まれたコミットについて見ていきます。フレームワーク・ツールの利用者にあまり関係のないものは省略しています。

## angular/angular

Commits: [https://github.com/angular/angular/commits/main/?since=2025-03-06&until=2025-03-12](https://github.com/angular/angular/commits/main/?since=2025-03-06&until=2025-03-12)

### release: cut the v20.0.0-next.1

https://github.com/angular/angular/commit/c492db4ac93f142d7dcedc9809138060e8311691

Angular v20.0.0-next.1がリリースされました。

### fix(common): support equality function in httpResource

https://github.com/angular/angular/commit/92250493ffc2201e118f399f2ae46d792390fb47

`httpResource` APIが他のSignals APIと同じように `equal` オプションを受け取れるようになりました。HTTPレスポンスから解決された値がSignalの値を変更させるかどうかの等値判定をカスタマイズできるようになります。

## angular/angular-cli

Commits: [https://github.com/angular/angular-cli/commits/main/?since=2025-03-06&until=2025-03-12](https://github.com/angular/angular-cli/commits/main/?since=2025-03-06&until=2025-03-12)

### feat(@angular/build): integrate Chrome automatic workspace folders ·

https://github.com/angular/angular-cli/commit/3c9172159c72f3c8ea116557ba5bf917a15d2f07

Angular CLIの `ng serve` コマンドで実行される開発者サーバーがChrome DevToolsの試験的機能 “**Automatic Workspace Folders**” を利用できるようにする変更です。Chrome DevTools側でソースコードに加えた変更が自動的にAngular CLIで管理されるファイルにも反映されます。これまで手動でWorkspaceとローカルフォルダの紐づけ設定が必要でしたが、紐づけが自動化できるようになります。現在はChrome Canaryバージョンでのみ対応しています。

https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/ecosystem/automatic_workspace_folders.md

### feat(@schematics/angular): use TypeScript module preserve option for new projects

https://github.com/angular/angular-cli/commit/03180fe0358662f8fd3255ad546994da3e3bda9c

`ng new` コマンドで作成されるプロジェクトの`tsconfig`設定が変更されました。`module` プロパティの値がデフォルトで`preserve` となります。esbuildベースの新しいビルダーにおけるモジュール解決と一致しており、既存プロジェクトにおいても同じように変更することが推奨されそうです。また、この設定により`"esModuleInterop": true` や `"moduleResolution": "bundler”` 、`”resolveJsonModule”: true` などの明示的な指定も不要になります。

### fix(@schematics/angular): generate component templates with a .ng.html file extension

https://github.com/angular/angular-cli/commit/dc2f65999a64453a26b61c96080b732fdc4147c8

`ng generate` コマンドで作成されるコンポーネントのHTMLファイル名末尾が `foo.component.html` から `foo.component.ng.html` に変更されます。この振る舞いは `ngHtml` オプションで無効化できます。この変更は1月に公開されたAngular Style Guideの改訂提案での決定事項に則ったものです。

https://github.com/angular/angular/discussions/59522

## angular/components

Commits: [https://github.com/angular/components/commits/main/?since=2025-03-06&until=2025-03-12](https://github.com/angular/components/commits/main/?since=2025-03-06&until=2025-03-12)

### v20.0に向けた非推奨APIの削除

https://github.com/angular/components/commit/1167d063882d8f85f30c682244f92804f59afc2b

https://github.com/angular/components/commit/79e887219316c5d606d687c7a31fc387507da40e

https://github.com/angular/components/commit/b3e516f2d1d0cb09b6e1c150d094717f8e68dee3

https://github.com/angular/components/commit/8078efc21403d5fc83a0cb40a17df43b64a28c67

https://github.com/angular/components/commit/c6ad44c68d478833ddfa5d55a14922921f858771

https://github.com/angular/components/commit/77d6b69e7789d97220afac64144e8025c5960353

https://github.com/angular/components/commit/227e83d242a83d680d8cd39b36f6385c9f653102

https://github.com/angular/components/commit/db090cac310118915c91cec6187ef9c1cfa7ced5

過去のバージョンで非推奨APIとしてマークされていたものがv20.0での破壊的変更として削除されています。
