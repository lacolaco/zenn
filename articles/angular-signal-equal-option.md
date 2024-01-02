---
title: 'Angular Signalの等値判定をカスタマイズする '
published_at: '2023-08-09 13:05'
topics:
  - 'angular'
  - 'signals'
published: true
source: 'https://www.notion.so/Angular-Signal-e6e80b9f4a394d25905f4b4711f09f37'
type: 'tech'
emoji: '✨'
---

AngularのSignalには `equal` オプションがあり、Signalの等値判定をカスタマイズできる。プリミティブ値ではないオブジェクトや配列などをSignalで管理する場合には、このオプションを設定する場面が増える。

## Signalはいつ変更を通知するか

Signalが保持するオブジェクトの変更を通知するタイミングは、以下のものが挙げられる。

- `Signal#set` メソッドでセットされた値が、保存されている値と**等値でない**とき
- `Signal#update` メソッドでセットされた値が、保存されている値と**等値でない**とき
- `Signal#mutate` メソッドが呼び出されたあと
- `computed` 関数の算出関数が返す値が、保存されている値と**等値でない**とき

```typescript
const name = signal('Alice');

name.set('Alice'); // 新しくセットされた値が、保存されている値と等値である
name.set('Bob'); // 新しくセットされた値が、保存されている値と等値でない

name.update((value) => 'Alice'); // 新しくセットされた値が、保存されている値と等値である
name.update((value) => 'Bob'); // 新しくセットされた値が、保存されている値と等値でない

const message = computed(() => {
  return `Hello, ${name()}`; // nameが更新されたときに算出結果が変わる
});
```

`Signal#mutate` メソッドはミュータブルなオブジェクトを操作するためのAPIであり、メソッドを呼び出すと必ず派生するSignalへ通知が行われる。「オブジェクトの参照は同じだけど、内包する値が変わったようだから、各自再チェックをしてください」ということだ。あまり多用したいメソッドではない。

## Signalの等値判定

さて上記にまとめたように、変更が通知されるかどうかを決定しているのは、新しい値が保存されている値と等値であるかという判定に基づいている。Angular Signal のデフォルトの等値判定は以下のロジックで計算される。

```typescript
/**
 * The default equality function used for `signal` and `computed`, which treats objects and arrays
 * as never equal, and all other primitive values using identity semantics.
 *
 * This allows signals to hold non-primitive values (arrays, objects, other collections) and still
 * propagate change notification upon explicit mutation without identity change.
 *
 * @developerPreview
 */
export function defaultEquals<T>(a: T, b: T) {
  // `Object.is` compares two values using identity semantics which is desired behavior for
  // primitive values. If `Object.is` determines two values to be equal we need to make sure that
  // those don't represent objects (we want to make sure that 2 objects are always considered
  // "unequal"). The null check is needed for the special case of JavaScript reporting null values
  // as objects (`typeof null === 'object'`).
  return (a === null || typeof a !== 'object') && Object.is(a, b);
}
```

https://github.com/angular/angular/blob/16.1.8/packages/core/src/signals/src/api.ts#L77-L93

基本的には `Object.is` 関数で等値だと判定される値は等値だとされるが、例外がある。 `typeof` 演算子が `object` を返すような値は、それが `null` でない場合には常に非等値であると判定されようになっている。つまり、Signal でプリミティブではない値を保持させた場合には、 `set` や `update` メソッドであっても内部の等値判定は常にfalseであり、そのSignalに依存する派生Signalに変更が通知される。

https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/is

JavaScriptではオブジェクト自身が等値判定のロジックを提供してくれない以上、フレームワーク側はあらゆるオブジェクトに通用するジェネリックな等値判定を持つしかない。（Javaの `equals` メソッドのようなものがあれば違っただろうが）

参照が同じであっても内部の値が変わっている可能性を考慮すれば、変更しているはずなのに必要な通知がなされないことよりも、不要な通知がなされる可能性があるほうが、デフォルトの挙動としては安全である。この戦略はAngularコンポーネントの変更検知と同じである。

```typescript
const user = signal({ name: 'Alice' });

user.set(user()); // 同じオブジェクトだが、非等値であるとされる
user.update((value) => value); // 同じオブジェクトだが、非等値であるとされる
user.mutate((value) => value); // 同じオブジェクトだが、非等値であるとされる
```

ただしこれはフレームワーク側の戦略であって、それぞれのオブジェクトの詳細を知っている開発者は、デフォルトではなくそれぞれのオブジェクト固有の等値判定ロジックをSignalに設定することができる。

たとえば次の例では、 `posX` と `posY` の座標値を持つ `Point` 型の値をSignalで管理するにあたって、オブジェクトの参照にかかわらず座標が同じなら等値であるというロジックを `equal` オプションで定義している。等値関数だけでエクスポートしてもよいが、Signalオブジェクトの作成自体を `createXXXSignal` という形でラップしてしまうのが使いやすいだろう。

```typescript
import { signal } from '@angular/core';

export type Point = {
  posX: number;
  posY: number;
};

export function createPointSignal(initialValue?: Point) {
  return signal<Point>(initialValue ?? { posX: 0, posY: 0 }, {
    equal: (a, b) => a.posX === b.posX && a.posY === b.posY,
  });
}
```

こうすることで、オブジェクトの参照が変わっていても座標が同じなら変更通知を行わないようにできる。派生するSignalで再計算される回数が減るため、パフォーマンスに負荷をかけにくくなる。

Signalで保持されている座標に応じてCanvasに点を打つサンプルアプリを作ってみたが、この例では同じ座標が繰り返し入力されることが少ないので、あまり効果の実感は得られない。雰囲気だけ感じてほしい。

@[stackblitz](https://stackblitz.com/edit/angular-jatgsy?ctl=1&embed=1&file=src/main.ts)
