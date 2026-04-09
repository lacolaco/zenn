---
title: 'Angular v22: debounced Resource の解説'
published_at: '2026-04-08 11:03'
topics:
  - 'signals'
  - '状態管理'
published: true
source: 'https://www.notion.so/Angular-v22-debounced-Resource-3253521b014a8157a3b6d0d63eae2c6e'
type: 'tech'
emoji: '✨'
---

Angular v22ではSignals API ファミリーに `debounced` が新たに追加される見込みだ。このAPIについてユースケースとメカニズムを解説する。

https://github.com/angular/angular/commit/b918beda323eefef17bf1de03fde3d402a3d4af0

## `debounced()`

`debounced`関数は、ソースとなる`Signal`の変更が高頻度であるときに、一定の待機時間を備えた`Resource`オブジェクトを返す。ソースの変更があったあと、待機時間の間に追加の変更がなければその値で確定する。メンタルモデルはjQueryやRxJSの`debounce`と似たようなものだ。

```typescript
export function debounced<T>(
  source: () => T,
  wait: NoInfer<number | ((value: T, lastValue: ResourceSnapshot<T>) => Promise<void> | void)>,
  options?: NoInfer<DebouncedOptions<T>>,
): Resource<T>
```

次の擬似コードは振る舞いを示す。Signalは常に同期的に値を返すデータモデルだが、`debounced`関数が返すのはResourceオブジェクトだ。その`value`プロパティは待機時間の間は変わらないSignalを返す。待機時間の間はResourceの`isLoading`プロパティもTrueとなる。

```typescript
const source = signal('initial');
const res = debounced(source, 200);

source(); // => initial
res.value(); // => initial
res.isLoading(); // => false

source.set('updated');
source(); // => updated
res.value(); // => initial
res.isLoading(); // => true

tick(200);

source(); // => updated
res.value(); // => updated
res.isLoading(); // => false
```

具体的なユースケースはSignal Formsとの連携が主だろう。テキストフィールドにバインドされたSignalをもとにHTTPリクエストが発生するようなケースでは、ユーザーの入力を間引くことになる。たとえば、次のように使えばユーザー名フィールドの入力を200ms間隔で待機した値でAPIを呼び出すHTTP Resourceを作成できる。

```typescript
const usernameForm = form(signal('foobar'));
const res = httpResource(() => `/api/users/${debounced(usernameForm.value, 200)}`);
```

似たユースケースとしてSignal Formsにおける非同期バリデーションがある。これは組み込みの機能として、`validateHttp`関数に`debounce`オプションが追加されており、フォーム値の更新を間引いてHTTP経由のバリデーションを実行するものだ。内部では`debounced`関数が呼び出されている。

```typescript
const usernameForm = form(
  signal('foobar'),
  (p) => {
    validateHttp(p, {
      request: ({value}) => `/api/check?username=${value()}`,
      debounce: 50, // Short debounce
      onSuccess: (available: boolean) => (available ? undefined : {kind: 'username-taken'}),
      onError: () => null,
    });
  },
  {injector},
);
```

https://github.com/angular/angular/commit/24e52d450d201e3da90bb64f84358f9eccd7877d#diff-40702c7e3d12dc92f4ddf6e85452d6359479f4c0fc98ef0bb7c2e086cbeb0bb0

これでdebounced関数がどういうものなのかはだいたい説明できただろう。ここからはそのメカニズムを確認する。

## メカニズム

先日書いたFirestoreをラップした例のように、`Resource`はインターフェースであり、その構築方法は自由だ。組み込みの`resource`関数や`httpResource`関数でなくても、`Resource`インターフェースに従ったオブジェクトを作ることはできる。実際の`debounced`関数はフレームワーク内部の細かいエラーハンドリングなど含めて複雑な実装だが、簡易的に自作のシンプルな`debounced`関数を作りながらメカニズムを理解してみよう。

まず基本形として、何もしない`Resource`を返す関数を作ってみよう。Angular v21.2以降であれば、`resourceFromSnapshots`関数を使うことで、特定の型を持つSignalを元にResourceへ変換できる。

```typescript
function debounced<T>(source: () => T): Resource<T> {
  const state = signal<ResourceSnapshot>({
    status: 'resolved',
    value: untracked(() => source()),
  });
  return resourceFromSnapshots(state);
}
```

https://angular.dev/api/core/resourceFromSnapshots

これだけでは`source`の変化がResourceに伝播しない。`effect`を使って、`source`が変化したときに`state`を更新する必要がある。

```typescript
function debounced<T>(source: () => T): Resource<T> {
  const state = signal<ResourceSnapshot>({
    status: 'resolved',
    value: untracked(() => source()),
  });
  
  effect(() => {
    const changedValue = source();
    
    state.set({
      status: 'resolved',
      value: changedValue,
    });
  });
  
  return resourceFromSnapshots(state);
}
```

次に、待機時間を設ける。引数で間隔を受け取り、それを`setTimeout`に渡すことで`state`への値の反映を遅延させる。遅延させている間は`state`を`loading`状態にしておく。

```typescript
function debounced<T>(source: () => T, wait: number): Resource<T> {
  const state = signal<ResourceSnapshot>({
    status: 'resolved',
    value: untracked(() => source()),
  });
  
  effect(() => {
    const changedValue = source();
    
    setTimeout(()=> {
      state.set({
        status: 'resolved',
        value: changedValue,
      });
    }, wait);
    
    state.set({
      status: 'loading',
      value: state.value(),
    });
  });
  
  return resourceFromSnapshots(state);
}
```

これではただ遅延させているだけだ。遅延時間中に追加の変更が発火したら、進行中の待機時間は破棄して、新たに値の安定を待つ必要がある。この非同期的な状態を保持するために、`activePromise`と`pendingValue`というローカル変数を導入しよう。`setTimeout`による遅延したコールバックの中で、`active`が一致すれば追加の変更がなかったことになる。

```typescript
function debounced<T>(source: () => T, wait: number): Resource<T> {
  const state = signal<ResourceSnapshot>({
    status: 'resolved',
    value: untracked(() => source()),
  });
  
  effect(() => {
    const changedValue = source();
    
    const waiting = new Promise(resolve => {
      setTimeout(resolve, wait)
    });
    
    const activePromise = waiting;
    const pendingValue = changedValue;
    
    waiting.then(() => {
      // 割り込みの変更があればactivePromiseが不一致になる
      if (waiting === activePromise) {
        state.set({
          status: 'resolved',
          value: pendingValue,
        });
      }
    });
    
    state.set({
      status: 'loading',
      value: state.value(),
    });
  });
  
  return resourceFromSnapshots(state);
}
```

これで簡易的な`debounced`関数の出来上がりだ。実際のフレームワークでの実装とは細かい部分で違うが、基本的な設計はこのようになっている。中身はただPromiseとタイマーで状態管理しているだけのシンプルなものだ。

何が言いたいかと言うと、`Resource`型を返す関数を作るのは簡単だということだ。非同期性を持つ処理をSignalに統合したいとき、組み込みのAPIが上手くフィットしなかったとしても自作するハードルは低い。そのひとつの例が前回のFirestore CollectionのResource化だった。

https://blog.lacolaco.net/posts/angular-firestore-resource-signal

## まとめ

- Angular v22で導入予定の`debounced()` は高頻度に変化する Signal を入力として、一定時間値が落ち着いたタイミングで確定値を出す `Resource` を返す。
- 典型的な用途は、フォーム入力に紐づく HTTP Resource や、Signal Forms の非同期バリデーションなどの「入力の間引き」。
- 実装の要点は、`effect` で入力変化を監視し、タイマーと Promise で最新の待機を管理して確定時に `ResourceSnapshot` を `resolved` に更新する。
- `Resource`型を返す関数を作るのは難しくない。非同期的なデータソースをSignalに統合するために使える便利なインターフェースだ。

