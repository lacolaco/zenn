---
title: 'Weekly Commits on Angular 2025-02-26'
published_at: '2025-02-26 18:58'
topics:
  - 'angular'
published: true
source: 'https://www.notion.so/Weekly-Commits-on-Angular-2025-02-26-1a63521b014a808f9266e92dc6f86dfc'
type: 'tech'
emoji: '✨'
---

一週間の間にAngular関連レポジトリへ取り込まれたコミットについて見ていきます。フレームワーク・ツールの利用者にあまり関係のないものは省略しています。

## angular/angular

Commits: [https://github.com/angular/angular/commits/main/?since=2025-02-20&until=2025-02-26](https://github.com/angular/angular/commits/main/?since=2025-02-20&until=2025-02-26)

### Service Worker連携のドキュメント拡充

https://github.com/angular/angular/commit/5283c2b080cfb156c011ee2b2edde9bca5d7b5e5

Service Workerを使うアプリケーションのローカル開発についてのガイドが追記されました。

### v19.1.7, v19.2.0-rc.0リリース

https://github.com/angular/angular/commit/497028cc52c59e5ae8dd4066c35b14a28002f2e2

https://github.com/angular/angular/commit/8c1b196ecda5b5cc9716b2c04a531823f56c7b2d

v19.1系のパッチバージョンがリリースされました。また、v19.2.0のRCバージョンが開始しています。

### チュートリアルの新ビルダー移行

https://github.com/angular/angular/commit/17c84e5a0345a1e36d75f1399fd6c15d165c250d

Angularのチュートリアルガイド用のサンプルプロジェクトで使うビルダーを `@angular/builde:application` に移行しています。webpack依存の残る `@angular-devkit/build-angular` を終了させていく動きです。

### mainブランチのターゲットをv20に移行

https://github.com/angular/angular/commit/c14df6dff4c89691767c8476f0ac0caf0af5b7d3

mainブランチのターゲットがv19系からv20系に移行されました。今後の機能追加はv19.3ではなく5月ごろに予定されるv20.0でリリースされることになります。

### Dateフォーマットの誤ったパターンを検知

https://github.com/angular/angular/commit/74cceba5871e83e77a23536d8b64ff8888862dd3

`date` パイプや `formatDate` 関数などで日付を文字列フォーマットする際、週番号ベースでの年表記（`YYYY`など）が週番号表記（`w`など）と併用されていない場合、標準的な年表記（`yyyy`など）との取り違えであると判定されるようになります。週番号を使わないなら週番号ベースの年表記を使うこともないだろうということです。破壊的変更なので、これはv20.0でリリースされます。

### カスタムビルドパイプラインについてのガイドを追加

https://github.com/angular/angular/commit/8df2c9652651057aefca2d28416a34aa517e47b6

Angular CLIに組み込みのビルドパイプラインではなく、RspackやViteといったサードパーティのツールを使ってビルドパイプラインを構築する方法についてのガイドが追加されました。すでにAngular.devで読めます。

https://angular.dev/ecosystem/custom-build-pipeline

### テンプレート式の構文拡張

https://github.com/angular/angular/commit/0361c2d81f5d2c56597002f465c00e9b1c4003e4

https://github.com/angular/angular/commit/f2d5cf7eddb1ca2d946076d7622778fb12273d31

テンプレート内の式でJavaScriptの `void` 演算子と べき乗演算子 `**` がサポートされました。void演算子はイベントハンドラ関数の戻り値によって意図せずイベントバブリングを中断してしまう可能性を排除できる用途があります。

### RouterのResolverの機能拡張

https://github.com/angular/angular/commit/7c12cb1df980734c64a4d127c2b9a7094e0fe9fb

RouterのResolverが階層的に複数ある場合、上位の階層で解決されたデータが下位の階層のResolverで読み取りできるようになりました。Routeの階層に従ってルートから末端に向かって直列的に実行されるのはもともとの挙動なので、これによりRouterの挙動が変わることはありません。

## angular/angular-cli

Commits: [https://github.com/angular/angular-cli/commits/main/?since=2025-02-20&until=2025-02-26](https://github.com/angular/angular-cli/commits/main/?since=2025-02-20&until=2025-02-26)

### v19.1.8, v19.2.0-rc.0のリリース

https://github.com/angular/angular-cli/commit/fbef9a4923a2cbcb108bc32cfbf5fb1bee561ef2

https://github.com/angular/angular-cli/commit/12aa5207f373ec600f3ffa7c11c163395444e438

v19.1系パッチバージョンのリリースと、v19.2.0のRCバージョン開始です。

### mainブランチのターゲットをv20に移行

https://github.com/angular/angular-cli/commit/4255779fa3cac8d9cef7cf1272cc5dfeebe8bf37

こちらのレポジトリでもv19.3系には進まず、次のv20.0に向けた開発に移行しています。

### Node.js v18系のサポート終了

https://github.com/angular/angular-cli/commit/5e90c1b4ec3f1d05ad00f2f854347a5bf8cb0860

v20.0でリリースされる予定の破壊的変更です。Node.jsのサポートバージョンがv20系以上に引き上げられます。

## angular/components

Commits: [https://github.com/angular/components/commits/main/?since=2025-02-20&until=2025-02-26](https://github.com/angular/components/commits/main/?since=2025-02-20&until=2025-02-26)

### v19.1.5, v19.2.0-rc.0のリリース

https://github.com/angular/components/commit/98d6e25badc0495f6f90dfb370ad5ee930e01410

https://github.com/angular/components/commit/abcbf516aef1b4640fc5f8bbeebdf1e51e17bcc1

Angular CDKやAngular Materialもパッチバージョンのリリースとv19.2のRCバージョンが開始しています。

### mainブランチのターゲットをv20に移行

https://github.com/angular/components/commit/d7150a4494c44d960dc26d010e21791e8ff4b9f2

angular/components のパッケージ群のmainブランチもv19.3には進まず、v20.0に向かうようです。

### イベントオブジェクトの型付け

https://github.com/angular/components/commit/29e67e63d02cd113e8724b24f1682d7390f2b751

https://github.com/angular/components/commit/dc8f98e9e34f9af6572a6cf08f9c263f7e42a118

これまで any 型のフィールドを持っていた一部のイベントオブジェクトに厳密な型付けができるようジェネリクスを追加し、破壊的変更にならないようデフォルト型として`any`を指定しています。

### MatButtonとMatAnchorの統合

https://github.com/angular/components/commit/6a5943d8b0fe6042c885e608d7d2a071e27dd802

これまでは2つ別々のディレクティブだった`MatButton`と`MatAnchor`がひとつのディレクティブとして統合されました。ディレクティブの使用方法については基本的に互換性が保たれているので特に移行作業は必要ありません。
