---
title: 'AngularアプリケーションをVitestでテストする'
published_at: '2023-08-05 22:19'
topics:
  - 'angular'
  - 'testing'
  - 'vitest'
published: true
source: 'https://www.notion.so/Angular-Vitest-7b14ed47693347978ef0c29e83922a49'
type: 'tech'
emoji: '✨'
---

[2024-06-15] Angular v18時点での内容に更新

---

Angular v18系現在、Angular CLIの `ng new` コマンドで生成されたプロジェクトのユニットテストは テスティングライブラリとしてJasmineを、テストランナーとしてKarmaを使用する。この構成を[Vitest](https://vitest.dev/)に置き換えてみた。

実際に動作するサンプルコードはGitHubで公開している。気になった人は手元にクローンしてテスト実行してもらいたい。

https://github.com/lacolaco/angular-vitest-sandbox

`ng new` 以後に加えた主な変更について以下で簡単にまとめるが、Vitestの機能については説明せず、VitestをAngularアプリケーションに適用するための重要な部分だけにフォーカスする。

## 関連パッケージのインストール

Karma, Jasmine関連のパッケージをすべてアンインストールし、Vitestをインストールする。また、AngularアプリケーションをViteで扱えるようにするプラグイン [@analogjs/vite-plugin-angular](https://github.com/analogjs/analog/blob/main/packages/vite-plugin-angular/README.md) もインストールする。

```shell
npm i -D vitest @analogjs/vite-plugin-angular
```

まだこれでは不足しているパッケージがいくつかあるが、Vitestは賢いのでテスト実行しようとすれば不足パッケージを教えてくれる。その指示に従ってインストールすればやがて全部揃うはずだ。

## 設定ファイルの作成

いろいろと試行錯誤した結果、設定は以下のようになった。

また、今回は Karma からの乗り換えを前提としているため、[VitestのBrowser Mode](https://vitest.dev/guide/browser.html)を有効化している。これによって、JSDOMによるエミュレーションではなく、Karmaと同じように実際のブラウザ上でDOMのテストができる。

```typescript
/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

const isCI = !!process.env['CI'];

export default defineConfig({
  plugins: [angular({ tsconfig: 'tsconfig.spec.json' })],
  test: {
    globals: true,
    setupFiles: ['src/setup-vitest.ts'],
    include: ['src/**/*.spec.ts'],
    browser: {
      enabled: true,
      name: 'chrome',
      headless: isCI,
    },
  },
});
```

## `setup-vitest.ts` ファイル

最後に、テスト実行環境を初期化するためのセットアップコードを記述する。最初に`vite-plugin-angular`のセットアップモジュールを読み込む以外は、普通のAngularのTestBed初期化と変わらない。

```typescript
// Patch vitest APIs with Zone
import '@analogjs/vite-plugin-angular/setup-vitest';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);
```

これでAngularアプリケーションのテストをVitestで実行する準備が整った。

## テストの実行

`package.json` の `test` スクリプトを `vitest` を実行するように編集する。`ng test` を実行するための設定は不要なため、`angular.json` 内の`archtect.test` 設定は消してしまってよい。

:::message
テストを実行して`@analogjs/vite-plugin-angular`のESM読み込みに失敗するようなエラーが出る場合は、VitestのコンフィグファイルがESMとして読み込まれていない。  
これを解決するには、`package.json`で`type: “module”`を指定するか、Vitestの設定ファイル名を`vitest.config.mts`に変更してESMであることを示すとよい。
:::

## 所感

- ブラウザテストなので、Vitestとはいえやはり起動の時間はかかる。
- `@analogjs/vite-plugin-angular` はv1.xになり以前よりは安定したが、未知のトラブルを踏む覚悟は必要
- とはいえ、Karma → Jest の置き換えよりは躓くポイントが少ないように思える。特にES Module周りや、JSDOM周り
- まだ単純なテストケースしか試していないので、今の時点でどこまで機能するかは未知数。ぜひこれを読んで気になった人も試してみてほしい。
