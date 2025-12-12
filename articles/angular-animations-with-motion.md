---
title: 'Angular: Motionを使ったアニメーション'
published_at: '2025-12-12 10:13'
topics:
  - 'angular'
  - 'motion'
published: true
source: 'https://www.notion.so/Angular-Motion-2c53521b014a80d98279f5c01f43773b'
type: 'tech'
emoji: '✨'
---

Motionというアニメーションライブラリがある。Figma Makeでコード生成させるとアニメーション用に使われているのを見かけて調べてみたら、React用、Vue.js用と別にJavaScript用のパッケージがあることに気づいた。

https://motion.dev/

JavaScriptで使えるということはAngularで使えるということなので、AngularコンポーネントのアニメーションにMotionを使ってみた。以下はAngular v21.0とMotion v12.23.25 で動作するサンプル。

@[stackblitz](https://stackblitz.com/edit/stackblitz-starters-qykjb6db?ctl=1&embed=1&file=src%2Fapp%2Fmotion-demo.ts)

## 基本的な使い方

Motionの基本的な使い方では、`animate()` 関数の第一引数にアニメーションさせたいDOM要素を渡し、アニメーションの詳細を第二引数以降に渡す。

例として、次のようなテンプレートで、`#fadeBox`変数でアクセスできるようにした`app-animated-box`コンポーネントを用意する。このコンポーネントはただの矩形を表示するコンポーネントだ。ボタンがクリックされたら`runFadeAnimation`メソッドを呼び出して`fadeBox`コンポーネントのDOM要素をアニメーションさせる。

```html
<!-- Fade In Demo -->
<section class="bg-white p-6 rounded-lg shadow-md">
  <h2 class="text-xl font-semibold mb-4 text-gray-700">Fade In Animation</h2>
  <app-animated-box #fadeBox> Fade </app-animated-box>
  <button (click)="runFadeAnimation(fadeBox)" class="btn-base">Animate</button>
</section>
```

コンポーネントクラス側の実装はこうなる。`runFadeAnimation`メソッドでMotionの`animate`関数を呼び出している。今回はフェードインアニメーションなので`opacity`を0から1まで、600msかけて遷移させるような命令になっている。

DOM要素の参照が必要なので、`AnimatedBox`コンポーネントのクラスには`getElement`メソッドを定義して自身の`ElementRef`から要素参照を返させているが、これは親から`viewChild`で参照してもかまわない。

```typescript
import { Component, signal, AnimationCallbackEvent } from '@angular/core';
import { AnimatedBox } from './animated-box';
import { animate } from 'motion';

@Component({
  selector: 'app-motion-demo',
  imports: [AnimatedBox],
  templateUrl: './motion-demo.html',
  styleUrl: './motion-demo.css',
})
export class MotionDemo {
  protected runFadeAnimation(box: AnimatedBox): void {
    // getElement(): ElementRef.nativeElementを返している
    animate(
      box.getElement(),
      { opacity: [0, 1] },
      { duration: 0.6, ease: 'easeInOut' },
    );
  }
}
```

この調子で、任意のトリガーで任意のアニメーションを簡単に宣言的に実装できるため、Motionはけっこう便利だ。

## enter/leaveアニメーションと連携する

Angularには組み込みのenter/leaveアニメーション機能がある。この機能については以前に記事を書いたので詳細はそちらに。

https://blog.lacolaco.net/posts/angular-animations-enter-leave

この記事で以下のように書いていたサードパーティライブラリとの連携を実際にMotionでやってみよう。

> さらに複雑な制御を行いたい場合、たとえばサードパーティライブラリを使ったアニメーションをしたいときなどは、イベントバインディング形式を使うこともできる。次のように、`(animate.enter)` イベントでコールバックメソッドを呼び出すと、アニメーション対象のDOM要素参照を引数に受け取って好きな処理を実行できる。

例として、配列に新たな要素が追加されたらフェードイン、削除されたらフェードアウトするようなビューを考える。次のように、`items`配列にある要素の数だけ`AnimatedBox`が表示されるようにする。そしてボタンを押すと要素が入ったり消えたりトグルする。配列の要素に対応して表示される`AnimatedBox`のタグには`(animate.enter)`イベントと`(animate.leave)`イベントのリスナーが設定され、それぞれ対応するコンポーネントのメソッドを呼び出している。

```html
<!-- Fade In/Out on Enter/Leave Demo -->
<section class="bg-white p-6 rounded-lg shadow-md">
  <div class="mt-4 flex gap-4">
    @for (item of items(); track item) {
    <app-animated-box
      #itemBox
      (animate.enter)="onItemEnter(itemBox, $event)"
      (animate.leave)="onItemLeave(itemBox, $event)"
    >
      Item {{ item }}
    </app-animated-box>
    }
  </div>
  <button (click)="toggleItem()" class="btn-base">
    {{ items().length === 1 ? 'Add' : 'Remove' }} Item
  </button>
</section>
```

コンポーネントクラスのほうは次のようになる。それぞれのメソッドは第一引数に`AnimatedBox`コンポーネントの参照を、第二引数にアニメーションイベントオブジェクトを受け取っている。基本的な例と同じようにMotionの`animate`関数を使ってアニメーションしたあと、アニメーションが完了したことをAngularに伝えるために`event.animationComplete()`を`then`コールバックの中で呼び出している。

```typescript
protected onItemEnter(box: AnimatedBox, event: AnimationCallbackEvent): void {
  const element = box.getElement() as HTMLElement;
  element.style.opacity = '0';
  animate(element, { opacity: [0, 1] }, { duration: 0.3 }).finished.then(() => {
    event.animationComplete();
  });
}

protected onItemLeave(box: AnimatedBox, event: AnimationCallbackEvent): void {
  animate(box.getElement(), { opacity: [1, 0] }, { duration: 0.3 }).finished.then(() => {
    event.animationComplete();
  });
}
```

![](/images/angular-animations-with-motion/3c6255ea-b6c7-4055-8126-638d2819f0c3/3bfa090d-b53d-4327-84b5-525c410066a8.gif)

これだけでコンポーネントの生成と破棄のタイミングにあわせたアニメーションができるため、CSSアニメーションに慣れていない場合はおすすめしたい。

トレードオフとして、CSSアニメーションだけで実現する場合と比べてライブラリのサイズが気になるところだが、Motionは非常に軽量である。公式ドキュメントによれば、HTML/CSSアニメーション機能だけなら2.3kb程度だということだ。アニメーションひとつのために払うには割高だが、アニメーションを多用するアプリケーションであれば、アニメーション定義をTypeScriptで管理したいというニーズに応えられる優れたソリューションではないかと思う。

また、Angular専用ライブラリではないので、世の中にアニメーション実装例の知見が多かったり、Figma Makeのようなプロトタイプツールが生成した実装を流用しやすいのもポイントだ。非推奨となった`@angular/animations` に代わる新たなアプローチとしてぜひ試してみてほしい。
