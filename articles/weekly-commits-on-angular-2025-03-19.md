---
title: 'Weekly Commits on Angular 2025-03-19'
published_at: '2025-03-19 15:08'
topics:
  - 'angular'
published: true
source: 'https://www.notion.so/Weekly-Commits-on-Angular-2025-03-19-1bb3521b014a80deaa71c45e578737b9'
type: 'tech'
emoji: '✨'
---

一週間の間にAngular関連レポジトリへ取り込まれたコミットについて見ていきます。フレームワーク・ツールの利用者にあまり関係のないものは省略しています。

## angular/angular

Commits: [https://github.com/angular/angular/commits/main/?since=2025-03-13&until=2025-03-19](https://github.com/angular/angular/commits/main/?since=2025-03-13&until=2025-03-19)

### docs: added short explanation about event reply (#60349)

https://github.com/angular/angular/commit/55ba1ededdbd0799830ae37048ac4402bc0dc2b2

ハイドレーションのガイドドキュメントにEvent Replayについてのセクションが追加されました。

https://angular.dev/guide/hydration#event-replay

### feat(compiler-cli): support type checking of host bindings (#60267)

コンパイラーが、コンポーネントやディレクティブのホストバインディングに対する型チェックをサポートするようになりました。これにより、ホストバインディング内の型エラーが早期に発見されるため、安全に利用できます。この改善により Language Serviceで型エラーを検出できている様子がプルリクエストの説明文で確認できます。

https://github.com/angular/angular/pull/60267

### feat(core): add support for two-way bindings on dynamically-created components (#60342)

https://github.com/angular/angular/commit/1971e57a457ff9fd4dc8a353b59b51364e08b443

動的に生成されたコンポーネントで双方向バインディングがサポートされるようになりました。先週実装された動的コンポーネントへの宣言的バインディング機能の拡張です。次のような書き方でSignalを介した双方向バインディングを宣言できます。

```typescript
import { createComponent, signal, twoWayBinding } from '@angular/core';

const value = signal('');

createComponent(MyCheckbox, {
  bindings: [twoWayBinding('value', value)],
});
```

### fix(core): remove rejectErrors option encourages uncaught exceptions (#60397)

https://github.com/angular/angular/commit/48974c3cf88ab1a70411bea4950823f975994087

`toSignal()` ユーティリティ関数から`rejectErrors`オプションが削除されます。詳しい背景はコミットメッセージに書いてありますが、現在このフラグに依存しているコードは`toSignal(myStream.pipe(catchError(() => EMPTY)))` のような形で、`toSignal`関数に渡すObservableの段階でエラーハンドリングについての振る舞いを制御するように変更する必要があります。

破壊的変更ではありますが、`toSignal`関数はまだ開発者プレビューであるため、非推奨段階を踏まずにv20でリリースされます。

## angular/angular-cli

Commits: [https://github.com/angular/angular-cli/commits/main/?since=2025-03-13&until=2025-03-19](https://github.com/angular/angular-cli/commits/main/?since=2025-03-13&until=2025-03-19)

### @angular/ssr APIの安定化

https://github.com/angular/angular-cli/commit/cdfc50c29a2aa6f32d172b505a0ef09e563dfc59

https://github.com/angular/angular-cli/commit/33b9de3eb1fa596a4d5a975d05275739f2f7b8ae

サーバーサイドレンダリングのための新しいAPIが開発者プレビューから安定APIに昇格しました。`provideServerRouting` は一時的に安定版となりましたが、すぐ後に`provideServerRendering` という包括的なAPIに置き換わる形で消えています。開発者プレビュー版で利用していた場合は移行が必要です。（ng updateでの自動マイグレーションがあります）

https://github.com/angular/angular-cli/commit/26fd4ea73ad2a0148ae587d582134c68a0bf4b86

### feat(@angular/build): Support Sass package importers

https://github.com/angular/angular-cli/commit/f4be831197010a17394264bc74b1eb385ba95028

Sassに新たに実装されたパッケージインポート機能に対応しました。Sassファイルから`node_modules`で管理されたパッケージを参照する時、`pkg:library` というフォーマットを使うことができます。これまでは`load_paths`に`node_modules`を含めたり、`~` プレフィックスをつけたりと使うバンドラーやビルドツールによってバラバラでしたが、統一された仕組みが提供されることでSassコードのポータビリティが改善されます。

https://sass-lang.com/blog/announcing-pkg-importers/

### fix(@schematics/angular): generate components without a .component extension/type

https://github.com/angular/angular-cli/commit/23fc8e1e176f23442876b086bff52dd5f35abbc0

`ng generate` コマンドなどで生成されるコンポーネントがデフォルトで`Component`サフィックスを持たなくなります。またファイル名からも`.component`という部分がなくなります。この変更は先週の`.ng.html` への変更と同じく、Angular Style Guideの改訂に対応するものです。これまでと同じようにサフィックスをつけたい場合は、明示的な`—type=Component` というオプションが利用できます。

https://github.com/angular/angular/discussions/59522

同様の変更がServiceファイルについても行われています。

https://github.com/angular/angular-cli/commit/bc0f07b484300848ee81c5719c58909b40f99deb

## angular/components

Commits: [https://github.com/angular/components/commits/main/?since=2025-03-13&until=2025-03-19](https://github.com/angular/components/commits/main/?since=2025-03-13&until=2025-03-19)

### feat(material/button): allow appearance to be set dynamically

https://github.com/angular/components/commit/e79f60558fec6055c78dddc9d6e291a600778bc5

`MatButton`コンポーネントの表示種別をバインディングにより動的に変更できるようになりました。これまでは`<button mat-flat-button>` や `<button mat-outlined-button>` のように属性セレクターと一体となっており、動的に変更することはできませんでした。今回新たに `<button matButton=”outlined”>` のような指定が可能となり、右辺にセットされる値によって動的に表示を変えられるようになりました。

既存の属性セレクターはv20時点では互換性があり、破壊的変更にはなっていませんが、いずれ非推奨となることは予想されるため移行推奨と言えるでしょう。今後ng updateによる自動マイグレーションが用意されるかもしれません。

### feat(material/button): add support for tonal button (#30638)

https://github.com/angular/components/commit/fb81ab4f234498acd5b9925087bb712a7db039f6

`MatButton`にもう一つの機能追加があり、こちらは新たな表示種別の追加です。Material Design v3 (Material 3) で定義されている “Filled Tonal Button” の表示に対応しました。OutlinedとFilledの中間にあたる強調レベルのボタンです。上述の新しいAPIにのみ対応しており、`<button matButton=”tonal”>` という指定で利用可能です。

https://m3.material.io/components/buttons/guidelines#07a1577b-aaf5-4824-a698-03526421058b

### fix(material/autocomplete): allow overlay backdrop by setting hasBackdrop option (#30631)

https://github.com/angular/components/commit/097f49d90f5fe079a0399fd499202a8bdd1542cf

`MatAutocomplete`ディレクティブがバックドロップを持てるようになりました。

https://material.angular.io/components/autocomplete/overview

これまではインラインでオートコンプリート用のドロップダウンリストが表示されるだけでしたが、バックドロップを使うことでどれかの候補を選択するまで他の操作を防ぐようなモーダル表示ができるようになります。
