---
title: 'Angular: Error Boundary解説'
published_at: '2026-10-18 23:57'
topics:
  - 'angular'
published: true
source: 'https://app.notion.com/p/Angular-Error-Boundary-3fd3521b014a809d9a07c4a1270cadaa'
type: 'tech'
emoji: '✨'
---

Angular v22.2で開発者プレビューとして導入された**Error Boundary（エラーバウンダリ）**機能について、この記事では基本的な使い方を具体的なユースケースを通して解説する。

https://blog.lacolaco.net/posts/angular-v22-2-update

## エラーバウンダリとは何か

**エラーバウンダリ**とは、ある範囲で発生したエラーを捕捉し、その外側へ伝えるか、その場で対処するかを決める境界のことである。もっとも身近な例は、一般的な例外処理の構文である `try/catch` だろう。宣言的なUIコンポーネントの描画は、ライブラリが管理するタイミングで実行されるため、ユーザーコード側では描画や更新で発生する例外を捕捉できない。そこで**コンポーネントツリーの一部をエラー境界として指定する**仕組みが必要になる。

UIにおけるエラーバウンダリは、境界の内側で描画に失敗したとき、その部分を**フォールバックUI**へ置き換え、画面の残りを利用可能に保つための仕組みである。たとえばReactでは、コンポーネントツリーの一部を壊れたUIから切り離し、フォールバックUIへ置き換える仕組みとしてエラーバウンダリがよく使われている。次の例では、`Chart` の描画中に例外が発生すると、境界の内側だけがエラーメッセージに置き換わり、境界の外側にある `Navigation` はそのまま残る。

```javascript
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <main>
      <Navigation />
      <ErrorBoundary fallback={<p>グラフを表示できませんでした。</p>}>
        <Chart />
      </ErrorBoundary>
    </main>
  );
}
```

このように、コンポーネントツリーの一部にエラー境界を作ることがこれまでAngularにはできなかったため、グローバルの`ErrorHandler` APIによってすべてのエラーをハンドリングするしかなかった。この問題が、Angular v22.2で導入された**組み込みのエラーバウンダリ**によって解決される。

https://angular.jp/guide/templates/error-boundaries

## ユースケース

### 描画エラーのフォールバック表示

最初の例として、いくつかのウィジェットを並べたダッシュボードのようなビューを題材にしてみよう。各ウィジェットをそれぞれ `@boundary` で囲むと、次のようなテンプレートになる。`@boundary` 内で初期化や変更検知の途中に例外が発生したときには、そのウィジェットの代わりに `@error` の内容が表示される。

```typescript
// fallback/fallback.ts
import { Component } from '@angular/core';
import { Chart } from '../chart';
import { Navigation } from '../navigation';
import { KpiSummary } from './kpi-summary';
import { RecentOrders } from './recent-orders';

@Component({
  selector: 'app-fallback',
  imports: [Chart, KpiSummary, Navigation, RecentOrders],
  template: `
    <main>
      <app-navigation />
      @boundary {
        <app-chart />
      } @error {
        <p>The sales chart could not be displayed.</p>
      }
      @boundary {
        <app-kpi-summary />
      } @error {
        <p>The KPIs could not be displayed.</p>
      }
      @boundary {
        <app-recent-orders />
      } @error {
        <p>The recent orders could not be displayed.</p>
      }
    </main>
  `,
})
export class Fallback {}
```

売上チャートウィジェットのAPIが不正な形のデータを返しても、エラー表示になるのは売上チャートだけで、KPIと最近の注文はそのまま使える。エラーバウンダリがなければアプリケーション全体がクラッシュし、画面が真っ白になっていた。動的なデータに依存するような、**エラーが発生しやすいコンポーネントを隔離する**ことでユーザー体験を改善できる。

![すべてのウィジェットが描画されている状態](/images/angular-error-boundary/fallback-valid-v2.4b64a167f33f1e83.png)
_すべてのウィジェットが描画されている状態_

![売上チャートだけがフォールバックUIに置き換わった状態](/images/angular-error-boundary/fallback-broken-v2.28c08d30c1631990.png)
_売上チャートだけがフォールバックUIに置き換わった状態_

#### 描画エラーを握りつぶして表示をスキップする

フォールバックUIを出すまでもなく、描画できなければ表示しなくてよい場合もある。たとえば動的に配信される設定をもとに描画するキャンペーンバナーがそうだ。設定が壊れていてバナーを描画できなくても、バナーが表示されないだけならユーザーは困らない。このような場合は `@error` ブロックを空にしておけば、エラーを握りつぶして表示をスキップできる。

```typescript
// hide-on-error/hide-on-error.ts
import { Component } from '@angular/core';
import { KpiSummary } from '../fallback/kpi-summary';
import { Navigation } from '../navigation';
import { CampaignBanner } from './campaign-banner';

@Component({
  selector: 'app-hide-on-error',
  imports: [CampaignBanner, KpiSummary, Navigation],
  template: `
    <main>
      <app-navigation />
      @boundary {
        <app-campaign-banner />
      } @error {}
      <app-kpi-summary />
    </main>
  `,
})
export class HideOnError {}
```

表示をスキップしたいときでも、**空の**`@error`**ブロックは省略できない**ことに注意が必要だ。`@error`ブロックを付けなくてもコンパイルできるが、その場合は例外が発生しても描画する `@error`ブロックがないため、エラーはバウンダリの外へ投げられてしまう。

![バナーが表示されている状態](/images/angular-error-boundary/hide-on-error-valid-v2.5422276b2f2ab87d.png)
_バナーが表示されている状態_

![設定が壊れてバナーが表示されなくなった状態](/images/angular-error-boundary/hide-on-error-broken-v2.ffca8c18a29acbed.png)
_設定が壊れてバナーが表示されなくなった状態_

### 描画をリトライする

`@error` 内で利用できる `$reset()` を呼ぶと、エラー状態が解除されて描画が再試行される。ただし、状況が変わっていなければ同じ例外が再び発生して `@error` の表示に戻るだけなので、エラーの原因を取り除いてから呼ぶ必要がある。

次の例では、ユーザーが保存したチャートの表示設定が破損していて、チャートの描画に失敗するケースを考える。エラー表示の中に設定を初期値に戻すボタンを置き、設定を戻してから `$reset()` を呼んでチャートを描き直す。

```typescript
// retry/retry.ts
import { Component, inject } from '@angular/core';
import { Navigation } from '../navigation';
import { ChartSettingsService } from './chart-settings.service';
import { SeriesChart } from './series-chart';

@Component({
  selector: 'app-retry',
  imports: [Navigation, SeriesChart],
  template: `
    <main>
      <app-navigation />
      @boundary {
        <app-series-chart />
      } @error {
        <p>The chart settings are invalid.</p>
        <button type="button" (click)="restoreDefaults($reset)">Restore default settings</button>
      }
    </main>
  `,
})
export class Retry {
  private readonly chartSettings = inject(ChartSettingsService);

  restoreDefaults(reset: () => void): void {
    this.chartSettings.restoreDefaults();
    reset();
  }
}
```

`@error` ブロックの中では `$reset` を関数として参照できるため、このようにコンポーネントのメソッドに引数として渡せる。テンプレートの型チェックでは `$reset` は `() => void` 型として扱われるので、メソッドの引数にもその型を付けられる。

![チャートが描画されている状態](/images/angular-error-boundary/retry-valid-v2.47fc942869a1ad58.png)
_チャートが描画されている状態_

![初期値に戻すボタンが表示された状態](/images/angular-error-boundary/retry-broken-v2.2777146d820e9a21.png)
_初期値に戻すボタンが表示された状態_

### エラーの内容によって表示を変える

たとえば、ログイン中のユーザーのアカウント情報を表示するコンポーネントを考える。ユーザーが別のタブでログアウトするとセッションが終了し、コンポーネントが描画中に参照するユーザー情報が失われる。このときは単なる描画失敗とは違い、再ログインへのリンクを表示したい。

```typescript
// auth.ts (excerpt)
export class UnauthenticatedError extends Error {}

// inside AuthService
requireUser(): User {
  const user = this.user();
  if (user === null) {
    throw new UnauthenticatedError('No user is signed in.');
  }
  return user;
}
```

テンプレート内では`@error` の `when` 条件でエラーを判定できる。コンポーネントには、次のような判定用の関数を用意しておく。

```typescript
// error-types/error-types.ts (inside the component class)
readonly isUnauthenticated = (error: unknown) => error instanceof UnauthenticatedError;
```

そしてテンプレートでエラーの分岐条件を宣言すると、`when`条件ごとに異なるUIへフォールバックできる。`UnauthenticatedError` 以外の例外、たとえばユーザー情報が壊れていて描画中に `TypeError` が発生した場合は、条件のない `@error` ブロックが表示される。

```typescript
// error-types/error-types.ts
import { Component } from '@angular/core';
import { UnauthenticatedError } from '../auth';
import { Navigation } from '../navigation';
import { AccountSummary } from './account-summary';

@Component({
  selector: 'app-error-types',
  imports: [AccountSummary, Navigation],
  template: `
    <main>
      <app-navigation />
      @boundary {
        <app-account-summary />
      } @error (let error; when isUnauthenticated(error)) {
        <p>Your session has ended.</p>
        <a href="/sign-in">Sign in again</a>
      } @error {
        <p>Your account could not be displayed.</p>
      }
    </main>
  `,
})
export class ErrorTypes {
  readonly isUnauthenticated = (error: unknown) => error instanceof UnauthenticatedError;
}
```

![ログイン中のユーザーが表示されている状態](/images/angular-error-boundary/error-types-signed-in.30df8f3d728b76bd.png)
_ログイン中のユーザーが表示されている状態_

![セッションが終了した状態](/images/angular-error-boundary/error-types-signed-out.80dd2c50d65e0a0d.png)
_セッションが終了した状態_

### onViewErrorで描画エラーを収集する

エラーバウンダリでアプリケーションのクラッシュは防げるようになったが、ただ握りつぶしてしまっては問題になるケースもある。エラーの発生頻度が高ければバックエンドAPIに何か異常が起きているかもしれない。そのような場合、エラー収集サービスにフォールバックの発生を記録したいこともあるだろう。`ErrorHandler` の `onViewError` メソッドを使うと、**エラーバウンダリで捕捉されたエラーを受け取って処理を実行**できる。次の例は、エラー収集サービスとしてSentryを使うことを想定したものだ。

```typescript
// on-view-error/app-error-handler.ts
import { ErrorHandler, Injectable, reflectComponentType, Type } from '@angular/core';
import type { ErrorDetails } from '@angular/core';
import { Sentry } from './sentry';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    Sentry.captureException(error);
  }

  onViewError(error: Error, details: ErrorDetails): void {
    Sentry.captureException(error, {
      tags: {
        component: selectorOf(details.declarationType),
        boundary: details.boundary ? selectorOf(details.boundary.type) : 'none',
      },
    });
  }
}

// Class names are minified in production builds, so the selector names the component instead.
function selectorOf(type: Type<unknown>): string {
  return reflectComponentType(type)?.selector ?? type.name;
}
```

`ErrorDetails` オブジェクトには、エラーが発生したコンポーネント・ディレクティブのクラス（`declarationType`）とインスタンス（`declarationInstance`）、エラーを捕捉したバウンダリを宣言しているコンポーネントのクラス（`boundary.type`）などが含まれている。この例ではそれらをSentryのタグとして送り、どのコンポーネントの描画がどの画面で失敗したかを集計できるようにしている。ただし本番ビルドではクラス名が圧縮されて `name` プロパティから元の名前を得られないため、`reflectComponentType` でコンポーネントのセレクターを取り出してタグの値にしている。

https://angular.jp/api/core/ErrorDetails

## まとめ

テンプレート構文として組み込みのエラーバウンダリが導入され、簡単にクラッシュしない頑健なアプリケーションを実装するのがかなり簡単になった。Angularが使われがちな、機能が多く複雑な業務システムの管理画面などでは、一部分のエラーでアプリケーション全体が壊れてしまわないよう、防火壁のようにエラーバウンダリを使っていくといいだろう。

特に、LLMが生成したJSONを入力としてUIを表示する[A2UI](https://a2ui.org/)やGenerative UIのような文脈では、どこまでいっても非決定論的で信用ならないデータをクライアントサイドで扱わざるをえない。バリデーションで防御するのも大事だが、最悪の場合でもアプリケーションがクラッシュしないよう、エラーバウンダリを活用するのが今後の定番になるだろう。

個人的にはもっと早くから欲しかった機能だが、ついにv22.2から使えるということで非常に嬉しい。開発者プレビューであることに注意はしつつ、積極的に活用していこう。

今回の記事のサンプルコードはGitHubで公開している。

https://github.com/lacolaco/angular-error-boundary-example

