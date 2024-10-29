---
title: 'Angular v19: resource() の解説'
published_at: '2024-10-29 22:38'
topics:
  - 'angular'
  - 'signals'
published: true
source: 'https://www.notion.so/Angular-v19-resource-12e3521b014a80daa5a9ed157e6bc9b1'
type: 'tech'
emoji: '✨'
---

この記事ではAngular v19で新たに追加されるSignal関連の実験的API `resource()` について解説する。なお、書いている時点で最新の `v19.0.0-next.11` をベースにしているため、正式リリースまでに変更される可能性はある。また、そもそも実験的APIなのでリリース後にも変更されている可能性はあることに注意してほしい。

Angular v19についての他の記事

https://zenn.dev/lacolaco/articles/angular-v19-linked-signal

https://zenn.dev/lacolaco/articles/angular-v19-effect-changes

https://zenn.dev/lacolaco/articles/angular-v19-prerendering

## `resource()` とは何か？

`resource()` は、非同期的に読み込まれるデータをシグナルとして扱えるようにするAPIである。

https://twitter.com/Jean__Meche/status/1847074532689170437

具体的なコードを見ればわかりやすい。次のコードは、`resource()`を使ってHTTP通信を行い、サーバーAPIから製品情報を取得している。リクエストのパラメータには親コンポーネントから受け取った`productId`が使われている。`productId`の値が変更されたらデータの再取得を行う。非同期データの値と取得状態がカプセル化されているのが`ResourceRef`型の`productResource`フィールドである。

```typescript
@Component({
  selector: 'app-product-viewer',
  template: `
    @if (productResource.value(); as product) {
      <p>Title: {{ product.title }}</p>
    } @else if (productResource.error()) {
      <p>load failed</p>
    } @else if (productResource.isLoading()) {
      <p>loading...</p>
    }
  `,
})
export class ProductViewer {
  productId = input.required<number>();

  productResource: ResourceRef<Product> = resource({
    request: () => this.productId(), // load on productId change
    loader: async ({ request: productId, abortSignal }) => {
      const resp = await fetch(`https://dummyjson.com/products/${productId}`, {
        signal: abortSignal,
      });
      return resp.json() as Promise<Product>;
    },
  });
}
```

`resource()`が引数に取るオブジェクトの中身を詳しく見てみよう。

`request`プロパティは、非同期データの取得をトリガーするリクエストパラメータを返す関数である。この関数は`computed()`と同等に、他のシグナルのgetterを呼び出すことで派生値を生み出し、依存したシグナルの更新により再計算される。つまり、上述の例では、`this.productId()`の値が更新されるたびにリクエストも更新され、データ取得がトリガーされる。

`loader`プロパティはデータの取得手続きを記述する関数である。`request`プロパティの関数が返した値を引数から取り出して、実際のデータ読み込みに利用できる。最終的にこの関数が返したオブジェクトは`ResourceRef.value()`シグナルに格納されることになる。返り値がPromiseであれば解決後の中身だけがシグナルに格納されるため、`Signal<Promise<T>>` にはならない。

`loader`関数の引数には`abortSignal`も含まれており、Angular側のスケジューリングやライフサイクル管理によってコンポーネントが破棄されるときには進行中のリクエストも中断できるように、データ取得ロジックの中で利用できる。

これが`resource()`の基本的なインターフェースと使い方である。ここで例に挙げたのはFetch APIを使ったHTTP通信によるデータ取得だが、パラメータを引数にとって`T`または`Promise<T>`で値を返すインターフェースに合致するならば、どのようなデータソースでもいいし、どのような取得方法でもよい。Local StorageやIndexedDBへのアクセスをラップしてもよいし、Web Workerを使って別スレッドで計算した結果を取得するというのもありえるだろう。

従来はこのようなユースケースは`signal()`と`effect()`によって解決されていたが、副作用として何でもできてしまう`effect()`を使わずに済み、なおかつ意図が明確な`resource()`ひとつで完結するのは嬉しい改善だ。上述の例を`resource()`なしでやろうとすると次のようになるが、やることに対してコードが多く複雑すぎる。

```typescript
// resource() がない場合
export class ProductViewer {
  productId = input.required<number>();
  productData = signal<Product | null>(null);
  isProductLoading = signal<boolean>(false);

  constructor() {
    effect(async (onCleanup) => {
      const productId = this.productId();
      this.isProductLoading.set(true);
      const abortCtrl = new AbortController();
      onCleanup(() => abortCtrl.abort());

      const resp = await fetch(`https://dummyjson.com/products/${productId}`, {
        signal: abortCtrl.signal,
      });
      const data = (await resp.json()) as Promise<Product>;
      this.productData.set(data);
      this.isProductLoading.set(false);
    });
  }
}
```

## `HttpClient`と`rxResource`

ところで、Angularで非同期データの取得といえば`HttpClient` APIが代表的な機能だが、ここまでの例に登場していない。上述のサンプルコードでは意図的にWeb標準のFetch APIを使っている。

なぜかというと、`resource()`の`loader`関数はPromiseからシグナルへの変換を行うが、`Obervable`型の値からシグナルへの変換をしないからだ。HttpClientのメソッドが返す値は`Observable`なので、リターンする前に自前で変換する必要がある。RxJSが提供している`firstValueFrom`関数を使えば変換はできるが、`resource()`というAngularのコアAPI（候補）の中で、`Observable`は第一級サポートされないインターフェースである。

```typescript
export class ProductViewer {
  productId = input.required<number>();
  http = inject(HttpClient);

  productResource: ResourceRef<Product> = resource({
    request: () => this.productId(), // load on productId change
    loader: ({ request: productId, abortSignal }) => {
      const destroy$ = fromEvent(abortSignal, 'abort');
      return firstValueFrom(
        this.http
          .get<Product>(`https://dummyjson.com/products/${productId}`)
          .pipe(takeUntil(destroy$)),
      );
    },
  });
}
```

とはいえ実際には多くのアプリケーションで`HttpClient`が使われており、`resource()`との併用が望まれるのも当然わかりきっているので、RxJSとの相互運用性のためのサブパッケージ `@angular/core/rxjs-interop` から`rxResource()`というAPIも提供される。これは`resource()`とほぼ同じインターフェースを持っているが、`loader`関数が`Observable`型にも対応している。次のサンプルコードのように、`HttpClient`のメソッドの戻り値を返すだけで、コンポーネントの破棄によるリクエストの中断も含めてすべてやってくれる。

```typescript
export class ProductViewer {
  productId = input.required<number>();
  http = inject(HttpClient);

  productResource: ResourceRef<Product> = rxResource({
    request: () => this.productId(), // load on productId change
    loader: ({ request: productId }) => {
      return this.http.get<Product>(
        `https://dummyjson.com/products/${productId}`,
      );
    },
  });
}
```

Angularのフレームワークコアからだんだんと`Observable`の第一級サポートが消えていっているが、一方でHTTPクライアントやフォームAPIなどにはまだまだ`Observable`ベースのAPIが残っている。それらがまだ必要な間は無理に`resource()`のようなコアAPIにこだわらなくても、`rxResource()`などの相互運用性パッケージを利用して何も問題ないだろう。待っていれば公式に`Observable`非依存のHTTPクライアントも来るだろうから、そのときに乗り換えればいい。

## まとめ

- `resource()`は、Angular v19で導入される新しいSignal関連の実験的APIである。
- 非同期データの取得と管理を簡潔に行うことができ、従来の`signal()`と`effect()`の組み合わせよりも意図が明確になる。
- `request`と`loader`関数を指定することで、データの取得条件とロジックを定義できる。
- Promiseベースのインターフェースで、Fetch API、IndexedDB、Web Workerなど、様々なデータソースに対応可能。
- `HttpClient`との併用には`rxResource()`が提供され、`Observable`との相互運用性を確保している。
- 将来的に`Observable`非依存のHTTPクライアントが登場する可能性があるが、それまでは相互運用性パッケージを利用することで問題なく開発を進められる。

今回のサンプルコードもStackblitzに置いているので好きに使ってほしい。

@[stackblitz](https://stackblitz.com/edit/stackblitz-starters-fb3yue?ctl=1&embed=1&file=src%2Fmain.ts)
