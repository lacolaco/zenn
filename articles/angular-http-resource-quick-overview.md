---
title: 'Angular: httpResource Quick Overview '
published_at: '2025-02-12 10:42'
topics:
  - 'angular'
  - 'signals'
published: true
source: 'https://www.notion.so/Angular-httpResource-Quick-Overview-1983521b014a80d08a7cc09020dd3420'
type: 'tech'
emoji: '✨'
---

現在、Angularの新しい実験的API `httpResource` が開発されている。これはv19.0でリリースされた実験的API `resource` と関連する機能で、早ければ2月のv19.2、あるいは3月のv19.3で搭載されるだろう。まだリリース前だが、現時点での要点をかいつまんで紹介する。

https://github.com/angular/angular/pull/59876

## Usage

`httpResource`はひとことで言えば、「`HttpClient` + `resource` の一般的なユースケースを簡略化するヘルパー関数」である。

使い方は次のようになるだろう。すでに`resource`を使っている人からすればそれほど目新しくはない。`httpResource`関数の戻り値は`HttpResponseResource`型であり、これは`Resource`型のサブタイプである。なので`resource`関数の戻り値と同じように、`isLoading`や`value`といったシグナルを返すフィールドを持っている。シグナルなので、状態が変われば自動的にコンポーネントは再描画される。

```typescript
@Component({
  template: `
    @if (data.isLoading()) {
      <p>Loading</p>
    } @else {
      {{ data.value() }}
    }
  `,
})
export class App {
  readonly data = httpResource<Data>('/api/data');
}
```

## Request on Signal changes

第一引数にはHTTPリクエストを生成するための情報を渡す。文字列を渡せばURLとして扱われ、GETメソッドのリクエストが一度だけ送られる。関数を渡せば、その戻り値の文字列をURLとしてGETメソッドのリクエストが送られる。この関数はシグナルに対応しており、内包するシグナルの変更に反応してリクエストを再送信する。

たとえば、コンポーネントが親コンポーネントから受け取ったインプット値に対応したHTTPリクエストを送るなら次のようになる。

```typescript
@Component({
  template: `
    @if (userData.isLoading()) {
      <p>Loading</p>
    } @else {
      {{ userData.value() }}
    }
  `,
})
export class App {
  readonly userId = input.required<number>();
  readonly userData = httpResource<UserData>(
    // this.userId が変わるたびにリクエストが送られて値が更新される
    () => `/api/user/${this.userId()}`,
  );
}
```

`resource`関数の`request`と同じように、この第一引数の関数が`undefined`を返せばリクエストを送らずにキャンセルできる。初期状態ではリクエストせず追加のイベントを待つ場合に使われるだろう。

```typescript
@Component({
  template: `
    @if (userData.isLoading()) {
      <p>Loading</p>
    } @else {
      {{ userData.value() }}
    }
  `,
})
export class App {
  readonly userId = signal<number>(-1);

  readonly userData = httpResource<UserData>(
    // undefinedを返すとリクエストが送信されない
    () => (this.userId() < 0 ? undefiend : `/api/user/${this.userId()}`),
  );
}
```

## HttpResourceRequest

あまり使わないと思われるが、GET以外のメソッドでHTTPリクエストを送ることもできる。文字列ではなく`HttpResourceRequest`型のオブジェクトを第一引数に渡すことでリクエストの内容を細かく制御できる。このオプションは`HttpClient`の`request`メソッドの引数とほとんど同じである。オブジェクトを渡す場合も静的な値と関数の両方をサポートしている。

```typescript
@Component(...)
export class App {
  // POST /data?fast=yes + headers + body + credentials
  readonly data = httpResource(
    () => ({
      url: '/data',
      method: 'POST',
      body: {message: 'Hello, backend!'},
      headers: {
        'X-Special': 'true',
      },
      params: {
        'fast': 'yes',
      },
      withCredentials: true,
    }),
  );
}
```

## Response Value Mapping

第二引数の`map`オプションでは、HTTPレスポンスボディに簡単な加工を加えてから`value`シグナルに格納するよう変換関数を渡すことができる。たとえばJSONオブジェクトからなんらかのクラスインスタンスへの変換をしたり、[zod](https://zod.dev/)のようなバリデーション関数を挟んだりできる。

```typescript
@Component(...)
export class App {
  readonly data = httpResource(`/api/user/${this.userId()}`, {
    map: (data) => User.parse(data),
  });
}
```

## How it works

ソースコードを読めばわかるが、`httpResource`は既存の`HttpClient`と`resource`を組み合わせただけのヘルパーだ。そのため`HttpClient`のインターセプターも変わらず動作するし、逆に言えば `provideHttpClient` で`HttpClient`自体を利用可能にしていないと使えない。

また、`resource`と同様に内部的には`effect`に依存している。つまり、依存性の注入が行えるコンテキストでなければ呼び出せない。コンポーネントのフィールド初期化、コンストラクタであれば普通に使えるが、それ以外の場所では工夫が必要になる。ちなみに、第2引数の`injector`オプションに`Injector`オブジェクトを渡せばそのコンテキストで動作するようになっている。

```typescript
// 任意の注入コンテキストでhttpResourceを呼び出す
const res = httpResource('/data', { injector: TestBed.inject(Injector) });
```

## Use-cases

ここまで見たように、`httpResource`は結局`HttpClient`でデータを解決する`resource`を作成するため、まさにそのようなコードを書いていた部分ではボイラープレートを削減する助けになるだろう。`HttpClient`のメソッドは`Observable`を返すため、これまでは純粋な`resource`ではなく`rxResource`を使うか、いちいち`Promise`に変換する必要があったが、`httpResource`であればそのあたりを気にする必要はなくなる。

一方、これまで`resource`と関係なく`HttpClient`を使っていた処理を`httpResource`に書きける必要があるかといえば、今のところは無いといっていいだろう。多くの場合はサービスクラスのメソッドでリクエストを送っていると思うが、そのような手続き的なコードからシグナルベースのリアクティブなコードに書き換えるのはなかなか骨が折れる大工事になる。

アプリケーション全体をリアクティブに書き換えていくことがあれば、`resource`や`httpResource`を取り入れていくくらいの構えでいいだろう。`resource`の活用には前提としてアプリケーションのシグナルベース化、リアクティブ化が必要である。

## Conclusion

以上見てきたように、`httpResource`は`HttpClient`と`resource`の組み合わせを簡略化する実験的APIだ。アプリケーションのリアクティブ化を進める中で、HTTPリクエストをシグナルベースで扱いたい場合に有用なツールとなるだろう。現時点では実験的な機能であるため、今後のAPIの変更には注意が必要だ。
