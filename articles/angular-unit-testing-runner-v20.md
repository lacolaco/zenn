---
title: 'Angular CLIの新しいUnit Testing Runnerを試す'
published_at: '2025-06-25 18:56'
topics:
  - 'angular'
  - 'angular cli'
  - 'testing'
published: true
source: 'https://www.notion.so/Angular-CLI-Unit-Testing-Runner-21d3521b014a80e0a40bcb6943377b34'
type: 'tech'
emoji: '✨'
---

Angular v20ではAngular CLIに新しいユニットテスト実行機能が実装されている。esbuildベースの新しい安定版機能と、それとは別の実験的機能も提供されはじめた。現在の状況を確認しておこう。

## Karma Runner (`@angular/build:karma`)

現在の安定したユニットテストランナー機能としてデフォルトで提供されているのは、 `@angular/build:karma` ビルダーを使ったesbuildベースのKarmaランナーだ。従来のデフォルトだったWebpackベースの `@angular-devkit/build-angular:karma` と基本的に互換性が保たれていて、`builder`を書き換えるだけでesbuildベースへ切り替わり、ビルドが安定かつ高速になる。

```shell
  "test": {
    "builder": "@angular/build:karma",
    "options": {
      "polyfills": ["zone.js", "zone.js/testing"],
      "tsConfig": "tsconfig.spec.json",
      "assets": ["src/favicon.ico", "src/assets"],
      "styles": ["src/styles.css"],
      "browsers": "ChromeHeadless"
    }
  }
```

テストランナーの振る舞いは `@angular-devkit/builder-angular:karma` ビルダーで `builderMode: “application”` に設定したときと変わらないが、`@angular-devkit/builder-angular` パッケージへの依存を捨てることでnode_modulesの中からwebpack関連の推移的依存関係がなくなることが利点だ。

ここを現在地として、Karmaからモダンなテスト実行ツールセットへ移行していくのが今のAngular CLIのロードマップであり、そのための新しいビルダーが `@angular/build:unit-test` だ。

## Karma Runner (`@angular/build:unit-test`)

Angular v20から提供が始まった実験的機能が `@angular/build:unit-test` ビルダーだ。このビルダーはこれまでのユニットテスト用ビルダーとは別に作り直されたもので、特定のテストフレームワークやテストランナーに依存しないAPIになっているのが特徴だ。

https://angular.dev/guide/testing/unit-tests

現在`unit-test`ビルダーが対応しているのはKarmaとVitestの2つだが、今後もおそらく増えるだろう。まずはKarmaを動かすのにどのように設定するのかを確認しよう。

次の設定は上述のものと意味的には同じになる新しい書き方だ。オプションの`runner`フィールドではどのツールを使うかを表し、今回は`karma`を指定する。`buildTarget`はテストのためのビルド設定を`ng build` の設定から参照するための文字列で、`::development` は `<projectName>:build:development` を意味する短縮表現だ。つまり複数プロジェクトであれば別のプロジェクトを指定することもできる。ほかはお馴染みの設定項目だ。

```shell
  "test": {
    "builder": "@angular/build:unit-test",
    "options": {
      "runner": "karma",
      "buildTarget": "::development",
      "tsConfig": "tsconfig.spec.json",
      "browsers": ["ChromeHeadless"]
    }
  }
```

これだけの指定で、基本的にはこれまでどおりKarma/Jasmineで書かれたテストなら実行できる。`karma.conf.js` や`test.ts` でのカスタマイズが多い場合はまだ対応しきれないかもしれないが、実験的機能なので大目に見てほしい。おそらく今後対応されると思われる。

ちなみに、記事を書いている2025-06-25時点（v20.0.3）では、テスト実行時に `zone.js/testing` を自動的に読み込む処理が動いておらず、`fakeAsync`に依存したテストが失敗する。この問題のイシューとPRを提出してレビューが通ったので、近いうちに解決するはず。

https://github.com/angular/angular-cli/pull/30596

## Vitest Runner

さて、この`unit-test`ビルダーの注目ポイントはメンテナンスモードに入った非推奨状態のKarmaではなく、モダンなテストランナー Vitest を選択できることだ。

Vitestを使うために以下のように `runner`オプションに`vitest`を指定する。それ以外の設定項目はKarmaを使うときとほとんど変わらない。

```json
  "test": {
    "builder": "@angular/build:unit-test",
    "options": {
      "runner": "vitest",
      "tsConfig": "tsconfig.spec.json",
      "buildTarget": "::development"
    }
  },
```

この状態で`ng test`コマンドを実行すると、不足しているパッケージのインストールを促される。

```shell
> ng test

NOTE: The "unit-test" builder is currently EXPERIMENTAL and not ready for production use.
The `vitest` package was not found. Please install the package and rerun the test command.
```

まずは`vitest`パッケージをインストールしよう。

```shell
pnpm i -D vitest
```

インストール後にもう一度実行すると、次はDOMテストのためにJSDOMをインストールするように促される。デフォルトではVitestはNode.js上でDOMエミュレーションによるテストを行う。

```shell
 MISSING DEPENDENCY  Cannot find dependency 'jsdom'

✔ Do you want to install jsdom? … yes
```

`unit-test`ビルダーに`browsers`オプションを与えると、Node.jsでのエミュレーションではなく実際のブラウザでテストを実行する。これはVitestのBrowser Modeを利用するためJSDOMは不要だ。

https://vitest.dev/guide/browser/

```json
  "test": {
    "builder": "@angular/build:unit-test",
    "options": {
      "runner": "vitest",
      "tsConfig": "tsconfig.spec.json",
      "buildTarget": "::development",
      "browsers": ["chromium"]
    }
  }
```

設定を変更してテストを実行すると、追加のパッケージインストールを求められる。VitestのプラグインとPlaywrightのnpmパッケージをインストールし、PlaywrightのセットアップをすればOKだ。

```shell
pnpm i -D @vitest/browser playwright
npx playwright install
```

![](/images/angular-unit-testing-runner-v20/CleanShot_2025-06-25_at_18.26.222x.39a2ac851d0220db.png)
_ng testの実行中画面（Vitest）_

デフォルトではVitestのWeb UIが立ち上がりwatchモードに入る。 `--no-watch` フラグを付けるか、ビルダーの設定に`watch: false`を加えれば一回限りの実行で結果を返すようになる。

```shell
ng test --no-watch
```

実際に試したサンプルプロジェクトはGitHubで公開している。つまづいたら手元で動かしてみてほしい。

https://github.com/lacolaco/angular-experimental-vitest

## まとめ

Angular v20では、これまでの`@angular-devkit/build-angular:karma` に置き換わる新しいesbuildベースの`@angular/build:karma`ビルダーがデフォルトになった。まだ従来のビルダーに依存しているプロジェクトは、まずこの移行を済ませることが重要だ。

また、実験的機能 `@angular/build:unit-test` ビルダーにより、KarmaからVitestへの移行が段階的に進められるようになりつつある。第一段階ではKarma/Jasmine構成のままでビルダーだけを切り替える。第二段階では設定をほとんど変えないままにテストランナーを切り替えることができる。

ユニットテスト実行環境がプロジェクト作成直後からデフォルトで整うのがAngular CLIの大きな利点のひとつだ。今後のアップデートの恩恵を受けるため、サードパーティに依存してJestやVitestを利用しているプロジェクトでも、様子を見ながら本家に帰ってくる準備を始めてもいいだろう。

