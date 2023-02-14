---
title: 'Angular: Inputs Stream パターン'
published_at: '2023-02-14 09:40'
topics:
  - 'angular'
  - 'rxjs'
  - 'rx-angular'
published: true
source: 'https://www.notion.so/Angular-Inputs-Stream-02ff5a3536af4d6996091ea3f818ad95'
type: 'tech'
emoji: '✨'
---

Angular コンポーネントへのインプット `@Input()` に渡される値の変化を、 `Observable` で扱いたいことは少なくない。今回は最近試していて手触りがよい `@rx-angular/state` を使ったインプットの Observable 化を紹介する。このパターンを “Inputs Stream” パターンと名付けたい。

@[stackblitz](https://stackblitz.com/edit/angular-ivy-3cvcwd?ctl=1&embed=1&file=src/app/app.component.html)

## 基本方針

このパターンは次の基本方針から構成される。

- コンポーネントのインプットを setter メソッドで実装する
- setter メソッドは渡された値をコンポーネント内部の**インプットストア**に格納する
- コンポーネントのロジックやテンプレートに使う値は、インプットストアを購読することでリアクティブに取り出す

## `inputs: RxState<Inputs>`

今回は例として `@rx-angular/state` を使ったインプットストアの実装を示している。単に `new RxState()` しているだけなので特筆することはない。

```typescript
private readonly inputs = new RxState<{ name: string }>();
```

## Input setter

こちらもインプットストアの値を更新しているだけで特別なことはしていない。

```typescript
@Input()
set name(value: string) {
  this.inputs.set({ name: value });
}
```

## Use inputs

このパターンの利点はインプットの変更を `Observable` で購読できることにあるから、そのように使わないともったいない。同期的に扱うならそもそもこのパターンが不要である。

今回の例はぶっちゃけ同期的でもいい例だが、たとえば `message` の構築に非同期 API の呼び出しが必要なケースなどをイメージするとよい。

```typescript
ngOnInit() {
  // initial state
  this.state.set({ message: '' });
  // bind inputs stream to component state stream
  this.state.connect(
    'message',
    this.inputs.select('name').pipe(
      map((name) => `Hello ${name}!`),
    ),
  );
}
```

## Pros / Cons

Inputs Stream パターンの利点はざっくり以下の点が思いつく。

- コンポーネントが同期的に直接持つフィールドを減らせる
  - つまり、なんらかの入力を受けてリアクティブに連動しない状態値を減らせる
  - 結果、同じ情報のアプリケーション内での多重管理が起きにくくなる
- 他の RxJS ベースのライブラリとのやりとりに変換作業が不要になる

一方で、欠点として以下の点も思いつく。

- 当然だが、 `Observable` が苦手なら難しい
- 自前で `BehaviorSubject` など使ってインプットストアを実装してもいいが、汎用性をもたせようとすると結構大変なので現実的には何らかのライブラリに頼ることになる
  - 今回は `@rx-angular/state` を使ったが、当然他のものでもなんでもよい

とはいえ慣れるとコンポーネントの `this.xxx` に直接保持する状態がなくなることで振る舞いの予測可能性があがり、テストもしやすいように感じているので、ぜひおすすめしたい。

今回のサンプルもそうだが、コンポーネントが状態値を単一のストリームでテンプレートに渡す Single State Stream パターンとの相性もよいので、こちらも改めて紹介しておきたい。

https://blog.lacolaco.net/2019/07/angular-single-state-stream-pattern/
