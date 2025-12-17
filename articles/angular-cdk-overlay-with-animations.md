---
title: 'Angular: CDK Overlay でフェードアウトするポップアップを作る'
published_at: '2025-02-05 11:34'
topics:
  - 'angular'
  - 'angular cdk'
  - 'css'
published: true
source: 'https://www.notion.so/Angular-CDK-Overlay-1913521b014a80f09c8af2b4dde093d1'
type: 'tech'
emoji: '✨'
---

Angular CDK の Overlay APIは非常に便利で、ポップアップのように画面の中でレイヤーが一段上のオーバーレイ表示を簡単に実現できる。

https://material.angular.io/cdk/overlay/overview

このOverlayを使ったことがある開発者なら一度はぶつかったことのある壁といえば、オーバーレイに表示したコンポーネントが閉じるときにどうやってアニメーションするかだろう。たとえば、ユーザーになにかのメッセージを一定時間だけ表示してフェードアウトする、いわゆるトーストメッセージというやつを作ってみよう。

![](/images/angular-cdk-overlay-with-animations/CleanShot_2025-02-05_at_10.45.17.dac9b39dba38f05e.gif)
_テキストを表示して一定時間後にフェードアウトするトーストメッセージ_

トーストとして表示されるビューを`ToastContainer`コンポーネントとし、素朴にCDK Overlayを使うと次のようなコードになる。動的に生成したコンポーネントはそれを破棄するのも開発者の責任である。`overlay.dispose()` を呼び出すことでオーバーレイとその上に表示されていたコンポーネントがすべて破棄される。これでトーストが一定時間後に消えるようになった。

```typescript
@Component({
  template: `
    <div>{{message()}}</div>
  `,
  styles: `
  :host {
    display: block;
    padding: 16px;
    border-radius: 8px;
    background-color: lightblue;
  }
  `,
})
export class ToastContainer {
  readonly message = input('');
}

@Component({
  selector: 'app-root',
  template: `
  <h1>Toast Demo</h1>

  <button (click)="openToast()">open toast</button>
  `,
})
export class App {
  readonly #cdkOverlay = inject(Overlay);

  openToast() {
    const overlay = this.#cdkOverlay.create({
      positionStrategy: this.#cdkOverlay
        .position()
        .global()
        .centerHorizontally()
        .centerVertically(),
    });
    const toast = overlay.attach(new ComponentPortal(ToastContainer));
    // set toast message
    toast.setInput('message', 'Hello Angular!');
    // show toast for 2000ms
    setTimeout(() => {
      overlay.dispose();
    }, 2000);
  }
}
```

さて、ここでトーストが消えるときにフェードアウトアニメーションを挟むとする。トーストとして表示するのは2000msだが、そこでオーバーレイを消してしまうとアニメーションするまえにコンポーネントが消えてしまう。**アニメーションの完了を待ってからオーバーレイを破棄する**にはどうするといいだろうか。

今回紹介するのは CSS Animations APIの `animationend` イベントを使ったアプローチである。

https://developer.mozilla.org/ja/docs/Web/API/Element/animationend_event

その名前のとおり、CSSアニメーションが終了したときにJavaScriptを実行できる機能で、当然Angularのコンポーネントでも使用できる。このイベントを使い、ToastContainerが呼び出し元に対してトーストの退出が終わったことを通知できるようにしよう。この方法は、Angular Materialで同様のUIを提供しているSnackBar APIの実装をベースにしている。

https://material.angular.io/components/snack-bar/overview

## `registerOnCompleteExit`

まずは呼び出し元との間のインターフェースを作成する。アニメーションが終了してトーストが完全に消えたときに呼び出されるコールバック関数を、`registerOnCompleteExit`というメソッドで登録できるようにしておこう。この命名はAngularの`ControlValueAccessor`で定義されている`registerOnChange`を意識して似せている。また、トーストの退出アニメーションを開始するための`exit`メソッドも用意する。

呼び出し元では、`registerOnCompleteExit`メソッドに渡すコールバック関数でオーバーレイの破棄を行うようにしておき、トーストの表示時間が経ったあとに`exit`メソッドを呼び出している。これでインターフェースは揃った。

```typescript
export class ToastContainer {
	//...

  #onCompleteExit?: () => void;

  registerOnCompleteExit(fn: () => void) {
    this.#onCompleteExit = fn;
  }
  
  exit() {
    // todo
  }
}

export class App {
  readonly #cdkOverlay = inject(Overlay);

  openToast() {
    //...
    // clean up the overlay on toast exit
    toast.instance.registerOnCompleteExit(() => {
      overlay.dispose();
    });
    // show toast for 2000ms
    setTimeout(() => {
      toast.instance.exit();
    }, 2000);
  }
}
```

## `animationend` 

残りはToastContainerの実装である。やることは2つある。

- `exit`メソッドが呼び出されたらフェードアウトアニメーションを開始する
- フェードアウトアニメーションが完了したら登録されたコールバック関数を呼び出して通知する

まずはアニメーションを開始させる仕組みを作ろう。使うのはCSSとSignal、クラスバインディングだけでいい。内部的に`animationState`フィールドを持ち、初期値を設定しておく。exitメソッドが呼び出されたらこの値が`exit`に変更する。あとは`animationState`の値に連動して`toast-container-exit`クラスをコンポーネントのホスト要素に付与し、このクラスを使ってCSSアニメーションを書けばよい。

```typescript

@Component({
  styles: `
  :host {
    opacity: 1;
  }

  :host(.toast-container-exit) {
    animation: toast-exit 500ms linear forwards;
  }
   
  @keyframes toast-exit {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }
  `,
  host: {
    '[class.toast-container-exit]': "animationState() === 'exit'",
  },
})
export class ToastContainer {
  protected readonly animationState = signal<'visible' | 'exit'>('visible');

  exit() {
    this.animationState.set('exit');
  }
}
```

続いて、`toast-exit`アニメーションが終わったときに`animationend`イベントを受け取る。アニメーションが実行されるホスト要素に`animationend`イベントバインディングを追加し、コンポーネントの`onAnimationEnd`メソッドを呼び出す。その中で最初に受け取っていた退出完了時のコールバック関数を呼び出せば完成だ。

```typescript
@Component({
  host: {
    '[class.toast-container-exit]': "animationState() === 'exit'",
    '(animationend)': 'onAnimationEnd($event)',
  },
})
export class ToastContainer {
  //...

  #onCompleteExit?: () => void;

  protected onAnimationEnd($event: AnimationEvent) {
    this.#onCompleteExit?.();
  }
}
```

実装の細かい部分はStackblitzのサンプルコードを見てほしい。

@[stackblitz](https://stackblitz.com/edit/stackblitz-starters-jtn3rbyy?ctl=1&embed=1&file=src%2Fmain.ts)

## Why not `@angular/animations` ?

今回の方法ではCSSアニメーションを使っているが、Angularフレームワークにはアニメーション機能を提供するAPIもある。

https://angular.jp/guide/animations

Angular Materialでも少し前まではSnackBarなどのアニメーションにAngular Animations APIを使っていた。しかしv19に入ったあたりからその使用箇所をCSSアニメーションに置き換えている。

https://github.com/angular/components/pull/30381

そしてとうとうすべてのコンポーネントでAngular Animationsを使っていない状態となり、Angular Materialの依存関係から完全に消えることになった。Animations依存だったAPIはv19系で非推奨となり、v21で削除される見込みだ。

https://github.com/angular/components/pull/30446

https://github.com/angular/components/pull/30435

なぜこのような書き換えを行ったのか、背景のすべてはわからないが、少なくともそのひとつはAngular Animations APIが抱えるメモリリーク問題である。Angular Materialの中でアニメーションを多用する`MatSort`コンポーネントにはメモリリークの問題が指摘されていた。

https://github.com/angular/angular/issues/54149

これ以外にもMatSortには多くのアニメーション実装の複雑さに起因する問題があり、MatSortのアニメーション実装をシンプルにする修正が入った。これがこの脱Angular Animationsの端緒であった。

https://github.com/angular/components/pull/30057

こうした状況を踏まえて、今後は可能ならCSSアニメーションによる実装を選択するのが安心だろう。Web標準の機能でシンプルに解決できるならわざわざフレームワークのAPIを間に挟む必要はない。

## まとめ

- Angular CDKのOverlayを使ったポップアップUIにフェードアウトアニメーションを実装する方法を紹介した
- CSSアニメーションと animationend イベントを組み合わせることで、アニメーション完了を待ってからオーバーレイを破棄する実装が可能
- Angular MaterialのSnackBarと同様のアプローチを採用し、シンプルで信頼性の高い実装を実現できた

