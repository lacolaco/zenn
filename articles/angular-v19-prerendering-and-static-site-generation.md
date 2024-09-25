---
title: 'Angular v19のプリレンダリングと静的サイト構築'
published_at: '2024-09-25 12:01'
topics:
  - 'angular'
  - 'ssg'
published: true
source: 'https://www.notion.so/Angular-v19-d98c0b65806e4a10a239b329958ab674'
type: 'tech'
emoji: '✨'
---

11月にリリース予定のAngular v19ではサーバーサイドレンダリングの強化がてんこ盛りだが、関連してプリレンダリング機能も強化されている。シングルページアプリケーションのパフォーマンス最適化の域を超えて、静的サイトの構築にも十分使えるほどに拡張されたので、その要点をまとめておく。なお、今回はプリレンダリングに焦点を当て、サーバーサイドレンダリングについてはあらためて書くつもりなのであまり触れない。

この記事はAngular v19の最新ビルド（next.7相当）を前提としており、正式バージョンでは変更されている部分があるかもしれないことには留意されたし。

## `outputMode` : ビルド出力のモード切り替え

Angular v19で大きく変わる点は、Angular CLIのビルドに`outputMode`という設定が導入され、`static` ビルドと`server` ビルドが選べるようになることだ。

https://github.com/angular/angular-cli/commit/3b00fc908d4f07282e89677928e00665c8578ab5

`@angular/build:application` ビルダーに追加されたこの設定は、ビルド出力を静的なHTML/JS/CSSだけで構成するWebサイトにするか、サーバーサイドレンダリングを組み込んだWebアプリケーションとするかを選べるようにする。`static`モードでビルドした場合はデプロイ先はWebサイトのホスティングサービスやCDNなどになり、`server` モードでビルドした場合のデプロイ先はNode.js環境やエッジワーカー環境などになるだろう。

静的サイト構築を考えた場合はもちろん`static`ビルドを使うことになる。

## サーバーサイドルート

`outputMode` がどちらであっても、ビルド時にプリレンダリングを行うかどうかを決定するのはこのサーバーサイドルートの設定である。これまでAngularのルーティングはクライアントサイドだけのものだったが、Angular v19ではサーバーサイドレンダリングやプリレンダリングのためのルーティング設定を与えられるようになった。

サーバーサイドレンダリング用のアプリケーション設定に、あらたに`provideServerSideRoutesConfig(routes)` を加えるようになる。このプロバイダー関数の引数にサーバーサイドルートの設定を渡している。

```typescript
import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRoutesConfig } from '@angular/ssr';
import { appConfig } from './app.config';
import { routes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(), provideServerRoutesConfig(routes)],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

`provideServerRoutesConfig` 関数の引数の型は`ServerRoute[]`で、クライアントサイドで`provideRouter`関数に渡す`Route`型とは異なる。このオブジェクトはサーバーサイドレンダリングにおいてURLパスとそのパスのレンダリング戦略をマッピングするためのものである。

次の例のアプリケーションでプリレンダリングするのは、空文字列のルートパスと、`users/:id`で指定されたユーザー詳細ページのパスの2種類である。サーバーサイドルートでは、この`:id`のようなパスパラメータに具体的な値を指定してプリレンダリングするように指示できる。そのためのプロパティが`getPrerenderParams`である。バックエンドAPIに問い合わせて取得したユーザーのリストをもとに`id`として使う文字列を返せば、ビルド時に実際の値が入って個別のページがプリレンダリングされる。

```typescript
import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { UserApi } from './user-api.service';

export const routes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'users/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const userApi = inject(UserApi);
      const users = await userApi.getUsers();
      return users.map((user) => ({ id: String(user.id) }));
    },
  },
];
```

たとえばブログサイトであればCMSから取得した記事一覧データをもとにすべての記事をあらかじめビルドしておける。コンテンツに更新があれば再ビルドしてデプロイするだけでいいため、いわゆるJamstack的な運用が可能になる。長らくAngularの弱点であったSEOの観点でも、プリレンダリング時にページのメタデータを書き込んでおけばJavaScriptの実行なしにクローラに情報を提供できるため、克服したといっていいだろう。

開発者がやることはこれだけである。あとはいつもどおり `ng build` コマンドでビルドをすれば、生成物のディレクトリにはルートの`index.html`と、`users/:id`に対応した個別IDごとの`index.html`が出力されている。

```json
  "build": {
    "builder": "@angular/build:application",
    "options": {
      "outputPath": "dist/ng19-ssr-playground",
      "index": "src/index.html",
      "browser": "src/main.ts",
      "polyfills": ["zone.js"],
      "tsConfig": "tsconfig.app.json",
      "assets": [{ "glob": "**/*", "input": "public" }],
      "styles": ["src/styles.css"],
      "server": "src/main.server.ts",
      "outputMode": "static"
    },
```

![](/images/angular-v19-prerendering-and-static-site-generation/3c6255ea-b6c7-4055-8126-638d2819f0c3/35d626a0-d116-4044-91e5-ad59848b0325.png)
_ng buildの結果。プリレンダリングされたHTMLファイルが確認できる。_

これまでのAngularはクライアントサイドのリッチなシングルページアプリケーションの構築に重心が置かれたフレームワークだったが、v18、v19とサーバーサイドレンダリング方面の強化を強めることでより幅広いWebサイト構築に使えるようになってきた。v19の正式リリースが楽しみだ。ぜひ今まではAngularが向いていないと思われていたユースケースでもいろいろ試してみて欲しい。
