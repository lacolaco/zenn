---
title: "第4章 依存性の注入 - サードパーティSDKの抽象化"
---

## サードパーティSDKとの連携

Webアプリケーションにおいて、外部サービスから提供されるSDKを導入して連携することはよくあることです。代表的な例は Google Analytics でしょう。他にもFacebookやTwitterなど、さまざまなプラットフォームが提供するJavaScript SDKがあります。通常これらはscriptタグ経由でインストールされ、なんらかのグローバル変数を宣言します。そしてアプリケーションはグローバル変数を参照して何らかのAPIを呼び出します。

ここでの問題は、サードパーティSDKとアプリケーションがグローバル変数（すなわち `window` ）を介して直接的に結合していることです。

### windowへの参照を避けるべき理由

Angularアプリケーションから `window` を直接参照してしまうと大きく2つの悪影響があります。ひとつは **プラットフォーム非依存性** を損ねること。もうひとつは **メンテナンス性** を損ねることです。

当然ながら、グローバル変数の `window` オブジェクトはWebブラウザで実行されるJavaScriptにしか存在しません。つまり、 **`window` に依存したソースコードはWebブラウザ上でしか実行できなくなります** 。AngularアプリケーションはWebブラウザ以外にもNode.js環境（Angular Universal）で実行される可能性もありますし、同じWebブラウザでも Worker上でアプリケーションを部分的に実行することがあるかもしれません。将来的なソースコードの再利用性を守るためにも、 `window` のようなプラットフォーム固有のAPIに依存した実装は最小限にすべきです。

もうひとつのメンテナンス性の問題は、アプリケーション内外の境界があいまいとなり、ソースコード間の依存関係が複雑になることが原因です。もしもサードパーティSDKが宣言するグローバル変数の名前が変わったら、そのグローバル変数に依存しているソースコードをすべて修正することになるでしょう。根本的にサードパーティSDKはアプリケーションとは隔離された存在です。アプリケーションコンフィグのページでも述べた通り、 **アプリケーションの内と外の境界** を明確にし、接点を最小限にしておくことが重要です。そうすることでアプリケーション内の秩序を維持し、外部要因に振り回されずにメンテナンスできます。

## サードパーティSDKを抽象化する

サードパーティSDKを **ラップ（wrap）** するサービスを作成することで、アプリケーションから直接サードパーティSDKを参照しないように抽象化できます。ここからは架空のサードパーティSDKを題材にして具体的な実装方法を学んでいきましょう。

架空のSDKは、 `window` に `eventTracker` 変数を宣言します。次のような簡単なスクリプトをHTMLファイルに記述します。

```html
<script>
  window.eventTracker = {
    sendEvent: function (event) {
      console.log(`[eventTracker] event: ${event}`);
    } 
  };
</script>
```

### アダプタークラスの作成

まず最初に、サードパーティSDKをラップするためのアダプター（Adapter）クラスを作成します。このアダプターだけがSDKの具体的なAPIを知っていて、アプリケーションはアダプターを経由してAPIを呼び出します。つまり、アダプターにサードパーティSDKに関する責務を委譲します。

次のように、 `EventTrackerAdapter` クラスを作成します。ここでのポイントは、 **アダプタークラスは `window` に依存していない** ということです。このクラスはコンストラクタ引数で EventTracker 型のオブジェクトを受け取る予定になっています。ただしサードパーティSDKは必ずしもアプリケーションより先に読み込まれているとは限らないため、非同期的に読み込まれることを考慮して、 Promiseでラップしています。

```typescript:event-tracker.ts
// `eventTracker` の型
export type EventTracker = {
  sendEvent: (event: any) => void;
}

export class EventTrackerAdapter {
  constructor(private eventTrackerResolver: Promise<EventTracker>) { }

  sendEvent(event: any) {
    return this.eventTrackerResolver.then(eventTracker => {
      eventTracker.sendEvent(event)
    });
  }
}
```

`eventTracker` オブジェクトがもっと多くのAPIを持っているなら、それぞれのAPIに対応するクラスメンバーを `EventTrackerAdapter` クラスに追加します。 **アプリケーション外のAPIをアプリケーション内から完全に隠蔽する** のがアダプターの責務です。

`window` のようなグローバル変数に依存していないため、テストコードもシンプルになります。たとえば `sendEvent` メソッドが正しくSDKの `sendEvent` APIを呼び出すかどうかは、Jasmineの `spyOn` を使って簡単にテストできます。

```typescript:event-tracker.spec.ts
import { EventTrackerAdapter, EventTracker } from './event-tracker';

describe('EventTrackerAdapter', () => {
  let adapter: EventTrackerAdapter;

  const mockEventTracker: EventTracker = {
    sendEvent: () => { }
  };

  beforeEach(() => {
    adapter = new EventTrackerAdapter(Promise.resolve(mockEventTracker));
  });

  it('should call `sendEvent`', async () => {
    spyOn(mockEventTracker, 'sendEvent');
    await adapter.sendEvent('foo');
    expect(mockEventTracker.sendEvent).toHaveBeenCalled();
  });
});
```

### プロバイダーの定義

`EventTrackerAdapter` クラスを提供するためのプロバイダーを定義しましょう。次のように、引数として渡された Windowオブジェクトから `eventTracker` 変数を取り出してインスタンス生成に使用します。今回はすでに `eventTracker` 変数が宣言済みであるという前提で `Promise.resolve` 関数を使いますが、非同期読み込みの場合はそれに応じて適切なPromiseを渡しましょう。

```typescript:event-tracker.ts
export function provideEventTrackerAdapterInBrowser(_window: Window) {
  const resolver = Promise.resolve((_window as any)['eventTracker'])
  return [
    {
      provide: EventTrackerAdapter,
      useValue: new EventTrackerAdapter(resolver),
    }
  ];
}
```

`window` のモックオブジェクトを利用すれば、このプロバイダーが期待通りに振る舞うかどうかを簡単にテストできます。

```typescript:event-tracker.spec.ts
describe('provideEventTrackerAdapterInBrowser', () => {
  const mockWindow: any = {
    eventTracker: {
      sendEvent: () => { }
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideEventTrackerAdapterInBrowser(mockWindow)
      ]
    });
  });

  it('should provide EventTrackerAdapter', () => {
    const injected = TestBed.get(EventTrackerAdapter);
    expect(injected).toBeDefined();
  });
});
```

### プラットフォームプロバイダー

さて、`provideEventTrackerAdapterInBrowser` プロバイダーを定義しましたが、このプロバイダーはどこに追加すべきでしょうか。言いかえれば、Angularのアプリケーションの中で `window` を参照しても問題ない場所はどこでしょうか？

答えは、アプリケーションの**エントリポイント**である `main.ts` です。 エントリポイントは各プラットフォームごとに用意されます。つまり、このファイルはAngularアプリケーションの中で **プラットフォームに依存する責務を集約できる** 場所だということです。

```typescript:main.ts
import './polyfills';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

// Webブラウザー用のブートストラッピング
platformBrowserDynamic().bootstrapModule(AppModule);
```

`platformBrowserDynamic` や `platformBrowser` 関数は、オプショナル引数としてプロバイダー配列を受け取ります。ここで渡されたプロバイダーは、各プラットフォームがデフォルトで持つ **プラットフォームプロバイダー** と結合されます**。**プラットフォームプロバイダーはさらに AppModule の `providers` と結合され、ブートストラッピングに利用されます。

プラットフォームに依存するサービスはプラットフォームプロバイダーを利用することで、アプリケーション内部をプラットフォーム非依存の状態に保つことができます。次のように、 `platformBroserDynamic` 関数に引数を渡しましょう。

```typescript:main.ts
import './polyfills';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { provideEventTrackerAdapterInBrowser } from './app/adapters/event-tracker';

platformBrowserDynamic([
  provideEventTrackerAdapterInBrowser(window)
]).bootstrapModule(AppModule);
```

回りくどい実装に見えるかもしれませんが、グローバル変数に依存するコードを最小限に抑えることで、ユニットテストが可能な範囲を広げています。そして将来的にAngular Universalを導入することになっても `platformServer` にサーバー用のプロバイダーを追加するだけで、アプリケーション側には一切変更を加える必要がありません。次の図のように、プラットフォームごとの差異をアプリケーション内外の境界で吸収するような設計が、アプリケーション内のメンテナンス性を高めるポイントです。

![](https://storage.googleapis.com/zenn-user-upload/v8zeqy6atsaet5lxvc74vqte8noe)

