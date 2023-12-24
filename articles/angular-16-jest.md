---
title: 'Angular: Angular CLI の Jest サポートを試す'
published_at: '2023-05-06 10:37'
topics:
  - 'angular'
  - 'testing'
  - 'jest'
published: true
source: 'https://www.notion.so/Angular-Angular-CLI-Jest-aa5b128387fb4b2fbc916ec77c9f5d2a'
type: 'tech'
emoji: '🃏'
---

Angular v16から、実験的機能として Jest によるユニットテスト実行がサポートされた。この記事では新規に作成した Angular プロジェクトでさっそく Jest を有効化してみた。Angular が Jest サポートを検討している背景などは公式ブログを参照してほしい。

https://blog.angular.io/moving-angular-cli-to-jest-and-web-test-runner-ef85ef69ceca

## Jest サポートを試す

### プロジェクト作成

まずはいつもどおり、 `ng new` コマンドで新しくプロジェクトを作成する。

```shell
$ ng new ng16-jest --standalone
```

### Jestビルダーに切り替える

次に `ng test` コマンドで実行されるユニットテスト実行のビルダーをKarmaからJestに切り替える。 `@angular-devkit/build-angular:karma` に指定されている部分を `@angular-devkit/build-angular:jest` に変更する。

Jest によるテストはブラウザテストではなくNode.jsによる擬似的なDOMを使ったテストなので、 `assets` や `styles` といったオプションは現状サポートされていない。次のように非対応のオプションを削除する。

```diff
         "test": {
-          "builder": "@angular-devkit/build-angular:karma",
+          "builder": "@angular-devkit/build-angular:jest",
           "options": {
             "polyfills": [
               "zone.js",
               "zone.js/testing"
             ],
-            "tsConfig": "tsconfig.spec.json",
-            "assets": [
-              "src/favicon.ico",
-              "src/assets"
-            ],
-            "styles": [
-              "src/styles.css"
-            ],
-            "scripts": []
+            "tsConfig": "tsconfig.spec.json"
           }
         }
       }
```

このように変更して `ng test` コマンドを実行すると、Jest関連のnpmパッケージが不足していることがエラーで示される。指示に従い、 `jest` と `jest-environment-jsdom` を追加でインストールする。

```shell
$ npm i -D jest jest-environment-jsdom
```

### テストを実行する

依存パッケージが揃ったらあらためて `ng test` コマンドを実行する。自動生成される `AppComponent` には簡易なユニットテストがはじめから `app.component.spec.ts` に書かれているので、うまくセットアップできていればテストが通るはずだ。

![](/images/angular-16-jest/3c6255ea-b6c7-4055-8126-638d2819f0c3/2841ccc5-5f5b-48ec-aa66-bbc200023f4a.png)
_ng testの実行結果_

## Jest ビルダーの設定

まだAngular CLI公式のJestビルダーは実験段なのでカスタマイズできる設定は少ないが、現状では次のオプションが使えるようだ。 `ng test --help` コマンドで確認できる。

```shell
$ ng test --help
ng test [project]

Runs unit tests in a project.

Arguments:
  project  The name of the project to build. Can be an application or a library.  [string] [choices: "ng16-jest"]

Options:
      --help           Shows a help message for this command in the console.  [boolean]
  -c, --configuration  One or more named builder configurations as a comma-separated list as specified in the "configurations" section in angular.json.
                       The builder uses the named configurations to run the given target.
                       For more information, see https://angular.io/guide/workspace-config#alternate-build-configurations.  [string]
      --exclude        Globs of files to exclude, relative to the project root.  [array]
      --include        Globs of files to include, relative to project root.  [array]
      --polyfills      Polyfills to be included in the build.  [string]
      --ts-config      The name of the TypeScript configuration file.  [string]
```

- `--configuration` : Jestの設定ではなく、 `ng build` などと同じく `angular.json` で定義される `configurations` の話である。テストの環境を使い分けることはあまりないので使うことはなさそうだ。
- `--exclude` / `--include` : テストを実行するファイルをGlobパターンで絞り込める。多用するはず
- `--polyfills` : 主に `zone.js` を読み込むためのオプション。基本的に `angular.json` の中で記述するだろう。
- `--ts-config` : テスト用のtsconfigファイル。これも基本的に `angular.json` の中で記述するだろう。

注意すべき点は、まだ `watch` 相当のオプションや機能は存在していないことだ。単発のテスト実行しかサポートされていない。今後のアップデートで間違いなくサポートされるのは間違いないと思うが、まだ本格的に導入するには早いかもしれない。試験的に導入するに留めよう。

また、 Jestの設定ファイルは露出されていないため、プラグインもまだ導入できない。実用レベルのものが必要であればまだしばらくサードパーティの jest-preset-angular の世話になるしかなさそうだ。

https://github.com/thymikee/jest-preset-angular

Jest サポートのモチベーションは Karma を標準ツールセットから外すことだから、しばらくはこれまでKarmaだけでテストを実行してきたプロジェクトの脱Karmaを主眼としてサポートを拡張するだろう。よって、すでにJest化しているプロジェクトはそのままでいいはずだ。

v16のうちは、もし Karma に強く依存したテストがあれば依存を弱め、できるだけブラウザ環境が不要なテストをJestに移行しやすく書き直していく準備をするのがよいだろう。どうしてもブラウザ環境が必要なテストは、冒頭に紹介したブログ記事で書かれているように、Web Test Runner への移行サポートも計画されているからそれまで待とう。
