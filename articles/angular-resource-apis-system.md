---
title: 'Angular: Resource APIファミリーの体系図'
published_at: '2026-07-12 09:57'
topics:
  - 'angular'
  - 'signals'
published: true
source: 'https://app.notion.com/p/Angular-Resource-API-39a3521b014a80debcf4cc76adf1cce6'
type: 'tech'
emoji: '✨'
---

この記事では、Angular v22で安定版となったResource APIファミリーについて、その関係を概観する。

## Resource APIファミリー

v22時点で Resource API に含まれる主要な公開APIは次のものである。

- `Resource<T>` インターフェース
- `WritableResource<T>` インターフェース
- `ResourceSnapshot<T>` インターフェース
- `resourceFromSnapshots` 関数
- `resource` 関数
- `httpResource` 関数

![image](/images/angular-resource-apis-system/CleanShot_2026-07-11_at_11.51.182x.fdf21ad17d3f63fd.png)

これらのAPIをひとつずつ解説しながら、APIファミリー内での位置づけを確認していこう。

## `Resource<T>` インターフェース

このインターフェースはAPIファミリーの中心にある。Resource APIファミリーは大きく分けて、Resourceオブジェクトを表すAPI群と、Resourceオブジェクトを作成するためのファクトリーAPI群とに分けられる。`Resource<T>` インターフェースはResourceオブジェクトすべてに共通する基底型であり、ファクトリーAPIの戻り値になる型でもある。

https://angular.jp/api/core/Resource

```typescript
export interface Resource<T> {
  readonly value: Signal<T>;
  readonly status: Signal<ResourceStatus>;
  readonly error: Signal<Error | undefined>;
  readonly isLoading: Signal<boolean>;
  readonly snapshot: Signal<ResourceSnapshot<T>>;

  hasValue(this: T extends undefined ? this : never): this is Resource<Exclude<T, undefined>>;
  hasValue(): boolean;
}
```

見てわかるように、`Resource<T>`は読み取り専用であり、そのResourceが持っている値、状態をSignal型で返すのが責務である。このインターフェースに準拠していれば、そのオブジェクトはResourceオブジェクトであると言える。もし、Resourceオブジェクトを引数にとって何かを行うコードを書くのであれば、その引数は`Resource<T>`型を要求する。

## `WritableResource<T>` インターフェース

`WritableResource<T>` インターフェースは、`Resource<T>`を拡張したインターフェースであり、その違いは書き込みをサポートしていることだ。`value`フィールドは`WritableSignal<T>`型であり、`set`メソッドと`update`メソッドも提供している。`asReadonly`メソッドで読み取り専用の`Resource<T>`に変換することもできる。また、`reload`メソッドは、最後に実行されたリソース解決を再実行するもので、これも内部的に`value`を更新する。つまるところ、`WritableResource<T>` は利用者側で値の更新をトリガーできるものだ。

```typescript
export interface WritableResource<T> extends Resource<T> {
  readonly value: WritableSignal<T>;

  set(value: T): void;
  update(updater: (value: T) => T): void;
  asReadonly(): Resource<T>;
  reload(): boolean;
}
```

https://angular.jp/api/core/ResourceRef

![image](/images/angular-resource-apis-system/image.ff98702a7dff205e.png)

## `ResourceSnapshot<T>` インターフェース

`ResourceSnapshot<T>` インターフェースは、Resourceオブジェクトが内包する状態をある瞬間で切り取った不変のオブジェクトを表現する。具体的には、Resourceによる値の解決状態を示す`status`フィールドと、それぞれのステータスに対応した追加のフィールドだ。Resourceは非同期的に状態が変化するオブジェクトだが、その状態は常に、これらのスナップショット型のいずれかに該当するいわゆる**Discriminated Union**型となっている。

```typescript
export type ResourceSnapshot<T> =
  | {readonly status: 'idle'; readonly value: T}
  | {readonly status: 'loading' | 'reloading'; readonly value: T}
  | {readonly status: 'resolved' | 'local'; readonly value: T}
  | {readonly status: 'error'; readonly error: Error};
```

https://angular.jp/api/core/ResourceSnapshot

`Resource<T>`の`snapshot`フィールドは、その呼び出し時点での状態を`ResourceSnapshot<T>`型のオブジェクトとして返す関係にある。

![image](/images/angular-resource-apis-system/image.7f6a2e84c7c8d5a2.png)

## `resourceFromSnapshots` 関数

`Resource<T>`が取りうる状態が`ResourceSnapshot<T>`として常に切り出し可能ということは、`ResourceSnapshot<T>`の連続的な変化こそが`Resource<T>`そのものだと言える。つまり、`Resource<T>`とは、`Signal<ResourceSnapshot<T>>`なのである。

それをそのまま表しているのが `resourceFromSnapshots`関数だ。引数には`ResourceSnapshot<T>`を返す関数を取る。引数が`Signal<ResourceSnapshot<T>>`であれば、内部的に購読されて自動的に`Resource<T>`の状態に反映される。ソースが状態の情報源だから、返されるのは読み取り専用のResourceオブジェクトだ。

```typescript
function resourceFromSnapshots<T>(
  source: () => ResourceSnapshot<T>,
): Resource<T>;
```

https://angular.jp/api/core/resourceFromSnapshots

```typescript
  const source = signal<ResourceSnapshot<string>>({status: 'idle', value: ''});
  const res = resourceFromSnapshots(source);
  expect(res.status()).toEqual('idle');
  expect(res.value()).toEqual('');
  expect(res.isLoading()).toBeFalse();
  expect(res.hasValue()).toBeTrue();

  // スナップショットの更新
  source.set({status: 'loading', value: 'alpha'});
  expect(res.status()).toEqual('loading');
  expect(res.value()).toEqual('alpha');
  expect(res.isLoading()).toBeTrue();
  expect(res.hasValue()).toBeTrue();

```

ソースのSignalをどう作るかも完全に自由であり、`signal`関数でも`input`関数でも、`linkedSignal`関数でも`computed`関数でも構わない。最終的に`Signal<ResourceSnapshot<T>>` でさえあればいい。用途にあわせてResourceオブジェクトを作るのであれば、この方法はかなりお手軽だ。もちろん、後述するビルトインのファクトリーAPIで済むのであればそれでいい。

![image](/images/angular-resource-apis-system/image.fde3b6c4bcd8bb56.png)

## `resource` 関数

`resource` 関数はビルトインのResourceファクトリーAPIだ。`resourceFromSnapshots`関数と違い、宣言的なオプションを元に読み書き可能なResourceオブジェクトを返却する。`ResourceRef<T>`は`WritableResource<T>`とほぼ同じものだ。

```typescript
function resource<T, R>(
  options: ResourceOptions<T, R> & { defaultValue: NoInfer<T> },
): ResourceRef<T>;
```

https://angular.jp/api/core/resource

APIの使い方自体はドキュメントを読めばわかるので割愛するが、大まかには2つの方法でResourceオブジェクトを構成できる。ひとつはPromiseを返すLoaderによる構成、もうひとつはStreamを返すLoaderによる構成だ。ここでいうStreamとは連続する値のことで、具体的には`Signal<ResourceStreamItem<T>>`を意味する。`ResourceStreamItem<T>` は具体的に `{value: T} | {error: Error}` を指す。

```typescript
const userId: Signal<string> = getUserId();

// Promise-based Loader
const userResource = resource({
  params: () => ({id: userId()}),
  loader: ({params}): Promise<User> => fetchUser(params),
});

// Signal-based Streaming Loader
const chunkedMessageResource = resource({
  params: () => ({id: messageId()}),
  stream: ({params}): Signal<ResourceStreamItem<string>> => {
    const message = signal<string>('');
    chunkedMessage(params).subscribe({
      next: (chunk) => {
        message.update(item => ({ value: item.value + chunk }));
      },
      error: (err) => message.set({ error: err }),
    });
  },
});
```

値の解決が一回で完了するPromiseモデルではなく、複数回の値書き込みが必要になる用途であれば、StreamベースのLoaderで構成できる。しかし、このユースケースは基本的に先述の`resourceFromSnapshots`のほうが汎用的で使いやすく、個人的にはいずれ無くなってもおかしくないと思っている。特に理由がなければ `resource`関数を使うのはPromiseベースのLoaderを持っているときに限るのがいいだろう。

![image](/images/angular-resource-apis-system/image.bd16716569684d27.png)

## `httpResource` 関数

最後の`httpResource` 関数は、`resource`関数と同じくビルトインのResourceファクトリーAPIだが、用途が限定されている。その名のとおり、HTTPリクエストによって値を解決するResourceを構成するためのファクトリーだ。`url`を解決する関数を受け取り、内部的にAngularのHttpClientを使って取得されたレスポンスをResourceオブジェクトとして取得できる。用途が明確なので、他のResourceファクトリーとの使い分けには困らないだろう。

```typescript
function httpResource<T>(
  url: (ctx: ResourceParamsContext) => string | undefined, 
  options: HttpResourceOptions<T, unknown> & { defaultValue: NoInfer<T>; }
): HttpResourceRef<T>;

const userId = signal<string>('id');
const user = httpResource(() => `/api/user/${userId()}`);
```

https://angular.jp/api/common/http/httpResource

`HttpResourceRef<T>` インターフェースは`WritableResource<T>`にHTTP特有の状態を加えたものだ。`value`は`WritableResource<T>`に管理されるため読み書き可能だが、レスポンスのヘッダやステータスコードは読み取り専用になる。また、`asReadonly`するとただの`Resource<T>`になってしまいHTTP特有の情報は失われることに注意が必要だ。

```typescript
export interface HttpResourceRef<T> extends WritableResource<T>, ResourceRef<T> {
  readonly headers: Signal<HttpHeaders | undefined>;
  readonly statusCode: Signal<number | undefined>;
  readonly progress: Signal<HttpProgressEvent | undefined>;
}
```

![image](/images/angular-resource-apis-system/image.d794691b3e377a98.png)

## まとめ

![image](/images/angular-resource-apis-system/image.016a63cf56466503.png)

ここまで登場した主要APIの関係像をまとめた。`Resource<T>`を中心として、その派生インターフェースと対応するファクトリー関数がビルトインで提供されている。同時に、インターフェースに対する実装は可換である。ビルトインのファクトリーAPIは特別なものではなく、個別のユースケースに特化した実装を作れるように開かれている。この関係を押さえておくとResource APIをうまく使いこなせるようになるだろう。

