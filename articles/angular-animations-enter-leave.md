---
title: 'Angular: 新しい Enter/Leave アニメーションAPIの解説'
published_at: '2025-07-26 19:15'
topics:
  - 'angular'
published: true
source: 'https://www.notion.so/Angular-Enter-Leave-API-23c3521b014a80369152cc3d38813adf'
type: 'tech'
emoji: '✨'
---

Angular v20.2 では新しいアニメーションAPIが実験的にリリースされる予定だ。この機能は以前にRFCで提案されていたもので、その実装が形になってきた。

https://github.com/angular/angular/discussions/62524

先日リリースされたバージョン 20.2.0-next.2 から使ってみることができるようになったので、この記事では使い方の概要を解説する。まだ安定版としてリリースされているわけではないので、不具合があるかもしれないし、今のAPIがそのまま正式にリリースされる保証もないことには留意してほしい。

## Live Example

実際に動作するサンプルをStackblitzで作成した。ボタンをクリックするとメッセージが出たり消えたりして、その表示の切り替わりにアニメーションがついている。

@[stackblitz](https://stackblitz.com/edit/stackblitz-starters-jctzpta6?ctl=1&embed=1&file=src%2Fmain.ts)

この実装のアニメーションに関わる部分をそれぞれ細かく見ていこう。

### `animate.enter`

コンポーネントのテンプレート中で任意のHTML要素に `animate.enter` 属性を設定すると、その値の文字列が出現アニメーション用のCSSクラスとして付与される。次の例では、要素の出現時に `enter` クラスが付与される。このクラスはアニメーションが終了すると自動的に解除される。

```html
<div animate.enter="enter">Hello</div>
```

あとはこの `enter` クラスに対応するCSSアニメーションを設定しておけば、要素がDOM上に現れるときのアニメーションが実現できる。

```css
.enter {
  animation: enter-animation 0.5s ease-in-out;
  opacity: 1;
  transform: translateY(0);
}
```

アニメーション用に付与するクラスが固定であれば上記のような記述でいいが、コンポーネントの状態により動的になる場合は、プロパティバインディングのような構文で文字列オブジェクトまたは文字列の配列オブジェクトも渡せる。

```html
<!-- enterClassList: Array<string> -->
<div [animate.enter]="enterClassList">Hello</div>
```

さらに複雑な制御を行いたい場合、たとえばサードパーティライブラリを使ったアニメーションをしたいときなどは、イベントバインディング形式を使うこともできる。次のように、`(animate.enter)` イベントでコールバックメソッドを呼び出すと、アニメーション対象のDOM要素参照を引数に受け取って好きな処理を実行できる。

```html
<div (animate.enter)="animateEnter($event)">Hello</div>
```

```typescript
  // `animate.enter="enter"` と同等の処理
  animateEnter(event: AnimationCallbackEvent) {
    // クラスを付与
    event.target.classList.add('enter');
    // アニメーションの完了をAngularに伝える
    event.target.addEventListener('animationend', () => {
      event.animationComplete();
    }, { once: true });
  }
```

### `animate.leave`

`animate.enter` とは逆に、`animate.leave` 属性を使うと要素が消えるときに付与するクラスを設定できる。プロパティバインディングやイベントバインディングが使えるのも同様である。

```html
<div animate.leave="leave">Hello</div>
<div [animate.leave]="leaveClassList">Hello</div>
<div (animate.leave)="animateLeave($event)">Hello</div>
```

## まとめ

Angular v20.2で導入される新しいEnter/Leaveアニメーションは、コンポーネントやDOM要素の表示・非表示に簡単にアニメーションを適用できる強力なAPIだ。簡単なアニメーションであればCSSクラスの付け外しだけで簡単に実装でき、複雑なユースケースにおいてもコールバック関数を使って柔軟なアニメーション制御が可能になる。サードパーティのアニメーションライブラリとの親和性も十分に期待できる。

おそらくv20.2段階では開発者プレビュー版となるだろうが、リリースが楽しみだ。
