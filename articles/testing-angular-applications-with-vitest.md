---
title: 'AngularアプリケーションをVitestでテストする'
published_at: '2023-08-05 22:19'
topics:
  - 'Angular'
  - 'Testing'
  - 'Vitest'
published: true
source: 'https://www.notion.so/Angular-Vitest-7b14ed47693347978ef0c29e83922a49'
type: 'tech'
emoji: '✨'
---

Angular v16系現在、Angular CLIの `ng new` コマンドで生成されたプロジェクトのユニットテストは テスティングライブラリとしてJasmineを、テストランナーとしてKarmaを使用する。この構成を[Vitest](https://vitest.dev/)に置き換えてみた。

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

いろいろと試行錯誤した結果、設定は以下のようになった。~~vite-plugin-angularの ~~`jit`~~ フラグをfalseにしないと、コンポーネントが ~~`templateUrl`~~ で外部ファイルを読み込んでいる場合にパースに失敗することがあった。~~

:::message
Analog 0.2.0でJITコンパイルに関するエラーは修正されたので、 `jit: false` は不要になった。
:::

また、今回は Karma からの乗り換えを前提としているため、[VitestのBrowser Mode](https://vitest.dev/guide/browser.html)を有効化している。これによって、JSDOMによるエミュレーションではなく、Karmaと同じように実際のブラウザ上でDOMのテストができる。ブラウザ制御のためのプロバイダーはWebDriverIOがデフォルトだったが、GitHub Actions上でうまくヘッドレス実行ができなかったため、playwrightに変更している。

```typescript
/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

const isCI = !!process.env['CI'];

export default defineConfig({
  plugins: [
    angular({
      tsconfig: 'tsconfig.spec.json',
    }),
  ],
  test: {
    globals: true,
    setupFiles: ['src/setup-vitest.ts'],
    include: ['src/**/*.spec.ts'],
    browser: {
      enabled: true,
      name: 'chromium',
      headless: isCI,
      provider: 'playwright',
    },
  },
});
```

## `setup-vitest.ts` ファイル

最後に、テスト実行環境を初期化するためのセットアップコードを記述する。最初にvite-plugin-angularのセットアップモジュールを読み込む以外は、普通のAngularのTestBed初期化と変わらない。

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

## 所感

- ブラウザテストなので、Vitestとはいえやはり起動の時間はかかる。
- @analogjs/vite-plugin-angular はまだまだ安定していないため、覚悟が必要
- とはいえ、Karma → Jest の置き換えよりは躓くポイントが少ないように思える。特にES Module周りや、JSDOM周り
- まだ単純なテストケースしか試していないので、今の時点でどこまで機能するかは未知数。ぜひこれを読んで気になった人も試してみてほしい。
