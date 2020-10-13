---
title: 第2章 Effective RxJS - カスタムOperatorを作る
---

RxJSを使っているとついつい複雑なコードになりがちです。そのようなときには、カスタムOperatorを使ってメンテナンスしやすくリファクタリングする方法を学びましょう。

## pipe 関数を使った独自Operator

`map` や `filter` のようなOperatorの実体は、Observableを引数に取りObservableを返す関数です。 そのインターフェースに従っていれば、RxJSがビルトインで提供する以外のOperatorを自由に作ることができます。

たとえば次の例は、 渡された数値をN倍にするという独自の `multiplyNumber` Operatorを実装しています。 `pipe` 関数は、すでに存在するOperatorを組み合わせて新しいOperatorを作るためのユーティリティです。 RxJSビルトインの `map` Operatorに、数値を5倍にする関数を渡しています。

```typescript
function multiplyNumber(N: number) {
  return pipe(
    map((value: number) => value * N)
  );
}

const obs = new Subject();

obs.pipe(
  // 与えられた数値を5倍にする
  multiplyNumber(5)
).subscribe(value => {
  console.log(value);
});

obs.next(10); // 50 が出力される
```

### 複数のOperatorをまとめる

`pipe` 関数は複数のOperatorによる一連の連続的な処理をひとつのOperatorとして束ねることができます。これは通常のオブジェクト指向プログラミングにおけるメソッドのように捉えられます。つまり、手続き的なひとかたまりの 処理に名前をつけて、新しいひとつのサブルーチンとして再利用可能にするのです。カスタムOperatorによるリファクタリングは、煩雑な処理をモジュール化し、Operatorの意図を明確にし、テストを容易にします。

次の例は、 `input` 要素の `keyup` イベントを監視し、ユーザーの入力に合わせて処理をおこなう例です。この例では4つのOperatorを使ってイベントを処理しています。

```typescript
const input = document.getElementById('input');

const keyup$: Observable<KeyboardEvent> = fromEvent<KeyboardEvent>(input, 'keyup');

keyup$.pipe(
  // KeyboardEventから値を取り出す
  map((e: KeyboardEvent) => (e.target as HTMLInputElement).value),
  // テキストが2文字以上である場合のみ処理する
  filter(text => text.length > 2),
  // 10ms以内の変更をdebounceする
  debounceTime(10),
  // 前回の値から変更があるときのみ処理する
  distinctUntilChanged(),
).subscribe(value => {
  console.log(value);
});

```

このようなケースでは、4つのOperatorが協調することが期待されており、その順番にも重要性があります。ただし単に `pipe` メソッドの中で並べただけではその意図は十分に伝わりませんし、最終的にどのような値が購読可能になるのか想像することも困難です。

上の例をカスタムOperatorでリファクタリングすると次のようになります。 `typeahead` Operatorとして名前をつけることでその内容をカプセル化し、意図が明確になります。またモジュールとしてexportすれば、他の場所で利用することもできます。

```typescript
export const typeahead = pipe(
  // KeyboardEventから値を取り出す
  map((e: KeyboardEvent) => (e.target as HTMLInputElement).value),
  // テキストが2文字以上である場合のみ処理する
  filter(text => text.length > 2),
  // 10ms以内の変更をdebounceする
  debounceTime(10),
  // 前回の値から変更があるときのみ処理する
  distinctUntilChanged(),
);

const input = document.getElementById('input');

const keyup$: Observable<KeyboardEvent> = fromEvent<KeyboardEvent>(input, 'keyup');

keyup$.pipe(
  typeahead
).subscribe(value => {
  console.log(value);
});
```

