---
title: 第2章 Effective RxJS - Observableのライフサイクル
---

第2章では、AngularアプリケーションにおけるRxJSの良い使い方、良くない使い方について解説します。 
いくつかの例を通して、どのような場面でどのようにRxJSを使うとよいのかを学び、最後にはそれを自分で判断できるようになることを目指します。

## RxJSについて

本書ではRxJSそのものについての解説はおこないません。RxJSやObservableに関する基本的な解説は、Angular公式ドキュメンテーションの翻訳版がありますので、そちらを参照してください。

* Observables: [https://angular.jp/guide/observables](https://angular.jp/guide/observables)
* RxJS ライブラリ: [https://angular.jp/guide/rx-library](https://angular.jp/guide/rx-library)
* Angular での Observable: [https://angular.jp/guide/observables-in-angular](https://angular.jp/guide/observables-in-angular) 

また、RxJSそのものについての詳しい学習には、[learn-rxjs](https://www.learnrxjs.io/)というWebサイトがおすすめです。多くの機能について網羅的に解説されています。[公式ドキュメンテーションサイト](https://rxjs.dev/)も整備されてきています。こちらもリファレンスとして参考にするとよいでしょう。

このページでは、RxJSのユースケースへ進む前にまず理解しておかなくてはならない前提知識を学びます。

## 2種類のObservable

Observableはいくつかの基準で、いくつかの種類に分類されることが多くあります。もっともよく分類される基準は、Hot / Cold[^1]でしょう。Hot Observableは、購読前から存在するストリームを購読しますが、Cold Observableは購読を始めることで新しいストリームを初期化します。このように、Observableという単純な型だけでは表現できない**振る舞いの違い**は、Observableを扱うときには常に意識する必要があります。

[^1]: RxJSのHot / Coldについての詳細は、RxJS開発チームの [Ben Lesh 氏によるブログ](https://medium.com/@benlesh/hot-vs-cold-observables-f8094ed53339)を参照してください。

このページでは、Hot / Coldではないもうひとつの視点、**有限 / 無限** の違いについて、その特徴と注意点を解説します。

## 有限のObservable

Angularアプリケーションでもっともよく目にするObservableといえば、HttpClientのメソッドから返されるHTTPレスポンスを表現したObservableでしょう。次の例は、Tour of Heroesに登場する `HttpClient#get` メソッドのサンプルコードです。

```typescript
getHeroes (): Observable<Hero[]> {
  return this.http.get<Hero[]>(this.heroesUrl);
}
```

ここで `HttpClient#get` メソッドが返し、 `getHeroes` メソッドが返しているObservableは、 **有限のObservable**です。有限なObservableは、内包した非同期処理の終了とともに自動的に完了するObservableです。Observableが完了すると、 `subscribe` メソッドの第3引数、あるいは `complete` フィールドに渡したコールバック関数が呼び出され、そのObservableを購読しているすべてのリスナー関数は解放されます。

つまり、有限のObservableは、開始と終了がある非同期処理と1:1で対応します。つまり、 **非同期タスクを抽象化する**ためのObservableです。この特徴は **Promise** と同じものです。また、多くの場合、有限のObservableはColdなObservableでもあります。購読に合わせてタスクを開始し、必要な値をストリームに流したあと、タスクの終了をもってObservableが完了するのです。

有限のObservableとPromiseは本質的に似ていますが、機能的な面で次のような違いがあります。

* Promiseは作成した時点で処理が開始するが、**Observableは購読まで実行が遅延される**
* Promiseは（現状の仕様では）キャンセルできないが、**Observableは `unsubscribe` によって中断できる**
* Promiseは完了時に一回だけ値を流せるが、**Observableは何回でも値を流せる**

ある処理が非同期タスクであると定義したときに、PromiseとObservableのどちらを返すようにするか迷うかもしれません。依存ライブラリとしてRxJSを前提とできるならば、Observableで実装しておくことが推奨されます。なぜなら有限のObservableは `Observable#toPromise` メソッドで簡単にPromiseへ変換できるからです。さきほどの `getHeroes` メソッドの例は、次のように書き換えることもできます。`toPromise` メソッドによって、ObservableをPromiseに変換しています。

```typescript
getHeroes (): Promise<Hero[]> {
  return this.http.get<Hero[]>(this.heroesUrl).toPromise();
}
```

:::message
`toPromise` メソッドはObservableが完了した時点での、最後に流れた値をもとに値を解決します。複数の値を流すObservableでは、途中の値は無視されることに注意しましょう。
:::

Angularのライブラリでは多くの場面でObservableを使って機能を提供していますが、これはアプリケーションも同じようにObservableを多用することを強制しているわけでは決してありません。あくまでもライブラリ間の共通インターフェースとして、Promiseよりも多機能なObservableを利用しているだけです。あなたがアプリケーションの開発で利点を感じなければ、Promiseに変換しasync/await構文などの組み合わせることで、TypeScriptとしてシンプルなソースコードを実現してよいのです。これがRxJSに振り回されずにAngularアプリケーションを開発する上でもっとも大切な考え方です。

## 無限のObservable

一方で、完了せず無限に生きるObservableもあります。Angularアプリケーションのなかでは、Routerの `Router#events` Observableが、もっとも典型的なものです。次の例は、ルーティングの完了イベントを購読して、ナビゲーション後のURLを取得するサンプルコードです。

```typescript
export class AppComponent {
  constructor(private router: Router) { }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
    ).subscribe((event: NavigationEnd) => {
      console.log(event.url);
    });
  }
}
```

ここで `Router#events` プロパティが返しているObservableは、 **無限のObservable**です。無限なObservableは、自動的に完了することのないObservableです。購読者の有無にかかわらず発生するイベントを流し続けます。つまり、 **イベントストリームを抽象化する**ためのObservableです。HTMLElementの `addEventListener`メソッドは無限のObservableととてもよく似たものです。また、完了することがないため、 `toPromise` メソッドが返すPromiseの `then` コールバックは実行されません。

無限のObservableはDOMのイベントリスナーと同じように、**購読を終えるための購読解除**が必要になります。購読者よりもイベントストリームのほうが長く存在するため、購読したままにしておくと不要なリスナー関数がメモリリークの原因となるうえに、予期せぬリスナー関数の呼び出しがバグを引き起こす可能性もあります。

## それぞれの注意点

非同期タスクを抽象化した有限のObservableと、イベントストリームを抽象化した無限のObservableがあることを学びました。ここからはそれぞれの注意点を整理しておきましょう。

### toPromiseメソッド

どちらのObservableであっても `toPromise` メソッドはPromiseを返しますが、そのPromiseの `then` コールバックは Observableが完了するまで呼び出されません。つまり、無限のObservableから作られたPromiseの `then` コールバックは呼び出されません。

### 購読解除の必要性

Observableに紐づくSubscriptionは、Observableが完了すると自動的に購読解除されます。つまり、有限のObservableが完了するまでの期間が十分に短い場合、リスナー関数を参照し続けることによるメモリリークは発生しません。そのため、明示的に購読解除をする必要性はありません。

一方で、無限のObservableに紐づくSubscriptionは自動的に購読解除されることがありません。そのため先述のとおり明示的に購読を解除する必要があります。

### 使用できるオペレーターの違い

RxJSが提供するビルトインオペレーターの中には、Observableの完了を必要とするものがあります。つまり、無限のObservableには使えないオペレーターがあるということです。例えば、次のようなオペレーターです。

* `last` , `takeLast` , `skipLast` などの、ストリームの末尾を扱うオペレーターは、無限のObservableで値を返しません
* `max` , `min` , `count` , `toArray` , `reduce` などの、ストリーム全体を計算するオペレーターは、無限のObservableで値を返しません

:::message
[`scan` オペレーター](https://rxjs.dev/api/operators/scan)は `reduce` オペレーターと似ていますが、値が更新されるたびに再計算します。
そのため、ほとんど同じ目的で 無限のObservableに対して使用できます。
:::

このように、多くの場合で注意が必要なのは無限のObservableだけです。そのため、無限のObservableをライブラリから提供する際には、それが無限であることをわかりやすくしておくことが重要です。実は、 **Angularの公式APIにおいて、getterから返されるObservableは原則的に無限のObservableです。** Routerの`events` プロパティや、FormControlの `valueChanges` プロパティはその一例です。一方で、有限のObservableを返す HttpClientの `get` や `post` はメソッドとして実装されています。getterによるObservableの取得はすでに存在するストリームであるという印象を与え、メソッド呼び出しは非同期タスクを開始する印象を与えます。サードパーティのライブラリを作る際や、アプリケーションの実装の中でも、Observableを提供するAPIはこの慣習に従っておくことをおすすめします。

