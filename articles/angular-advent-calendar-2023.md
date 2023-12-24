---
title: 'Angularでのボタンコンポーネントの作成'
published_at: '2023-12-25 09:00'
topics:
  - 'Angular'
published: true
source: 'https://www.notion.so/Angular-119f8e2c8fc740f4aa76755373a0b009'
type: 'tech'
emoji: '✨'
---

これはAngularアドベントカレンダー 2023の25日目の記事です。昨日はAKAIさんの[xxxx]でした。無事25日間のバトンパスが繋がって、アドベントカレンダーの主催としてとても嬉しいです。参加してくださったみなさんありがとうございました！

https://qiita.com/advent-calendar/2023/angular

さて、この記事では [web.dev](http://web.dev/) に以前投稿された “Building a button component” という記事を参考にしてAngularでボタンコンポーネントを実装します。プレーンなHTMLとCSSだけで実装する例が元記事では紹介されていますが、Angularのコンポーネントとしてできるだけ自然なインターフェースで、UIコンポーネントとして再利用しやすくなるようにアレンジします。

https://web.dev/articles/building/a-button-component?hl=ja

## 準備

スタートラインは元記事に倣い、次のようにボタンを並べ、全体をレイアウトするCSSを用意します。元記事ではbodyタグの直下にボタンを並べていましたが、こちらでは代わりに `App` コンポーネントのスタイルでレイアウトしています。まだボタンとしてコンポーネント分割はしていません。

@[stackblitz](https://stackblitz.com/edit/angular-t3gnpu?ctl=1&embed=1&file=src/global_styles.css&view=preview)

## ボタンコンポーネントの作成

まずはボタンコンポーネントを作成します。 `AwesomeButton` コンポーネントは `awesome-button` 属性を持つ`button`要素と`input`要素にマッチする**属性セレクタ**を設定します。汎用的なボタンコンポーネントを実装する際に避けるべきことは、コンポーネントのセレクタを要素セレクタにして、コンポーネントの内部にHTML標準の`button`タグを隠蔽してしまうことです。

```typescript
import { Component } from '@angular/core';

@Component({
  selector: `
  button[awesome-button],
  input[type=button][awesome-button],
  input[type=file][awesome-button]
  `,
  standalone: true,
  template: `<ng-content />`,
  host: {
    class: 'awesome-button',
  },
})
export class AwesomeButton {}
```

HTML標準の`button`要素を内包した独自のボタンコンポーネントは、HTML標準の要素でサポートされているさまざまな機能を再実装しなければならなくなります。大半はコンポーネントのInputを内部の`button`要素にバインディングし、`button`要素のイベントを自身のOutputとして投げ直すことになり、たいていは不完全な伝言ゲームをするだけになります。アプリケーションの中で`button`要素に特定の属性（`aria-label`など）を付与したくなるたびにそれをinputからリレーする必要があります。

ボタンコンポーネントを属性セレクタで実装すると、ボタンコンポーネントを使うテンプレート上には`button`要素がそのまま存在しているため、ボタンコンポーネントが`button`要素の振る舞いを再現するためのコードはまったく不要になります。ボタンコンポーネントは標準の`button`要素に追加したい振る舞いだけを責任範囲とできるわけです。

```html
<h4>Buttons</h4>
<button awesome-button>&#60;button&#62;</button>
<button awesome-button type="submit">&#60;button type=submit&#62;</button>
<button awesome-button type="button">&#60;button type=button&#62;</button>
<button awesome-button type="reset">&#60;button type=reset&#62;</button>

<h4>Button State</h4>
<button awesome-button disabled>&#60;button disabled&#62;</button>

<h4>Input Buttons</h4>
<input awesome-button type="button" value="<input type=button>" />
<input awesome-button type="file" />
```

作成したコンポーネントに最低限のスタイルを加えます。元記事と同じく[open-props](https://open-props.style/)を使ってCSS変数を導入し、AwesomeButtonコンポーネントのスタイルを設定した状態で一段落です。

https://open-props.style/

@[stackblitz](https://stackblitz.com/edit/angular-sbmebk?ctl=1&embed=1&file=src/button.component.ts)

## ホバー・フォーカス時のスタイル

最初に手を加えるのは、マウスでホバーしたときとキーボード操作でフォーカスしたときの強調されたスタイルです。[元記事](https://web.dev/articles/building/a-button-component?hl=en#hover_and_focus_together)では`:is`セレクタによって、ホバーとフォーカスに同じスタイルを与える書き方が紹介されています。同じようにコンポーネントスタイルを記述します。

ホスト要素に対して特定の条件のためのセレクタを加える場合は`:host()`セレクタの引数を使います。SCSSを使っている場合は`:host` セレクタの中で`&:is` のようにネストさせてもよいでしょう。

https://developer.mozilla.org/en-US/docs/Web/CSS/:host_function

```css
:host(:is(:hover, :focus)) {
  cursor: pointer;
  color: var(--blue-0);
  background-color: var(--blue-5);
}
```

また、フォーカス時にアウトラインが少しアニメーションするCSSも加えます。`prefers-reduced-motion` メディア特性が設定されていないときに限り、`outline-offset`をややずらします。アニメーションを減らしたい設定をしているユーザーにはアニメーションしないようになります。

https://developer.mozilla.org/ja/docs/Web/CSS/@media/prefers-reduced-motion

```css
@media (prefers-reduced-motion: no-preference) {
  :host(:focus) {
    transition: outline-offset 0.25s ease;
  }
  :host(:focus:not(:active)) {
    outline-offset: 5px;
  }
}
```

これでフォーカスとホバーの状態が視覚的に判別しやすくなりました。

@[stackblitz](https://stackblitz.com/edit/angular-edap9x?ctl=1&embed=1&file=src/button.component.css)

## カラースキームへの対応

次は、ブラウザのカラースキーム設定に応じてライトテーマとダークテーマが切り替わるようにします。[元記事](https://web.dev/articles/building/a-button-component?hl=en#an_adaptive_custom_property_strategy)と同じように、`prefers-color-scheme`メディア特性に応じてCSS変数の値を切り替えることで実現します。コンポーネントスタイルでもCSS変数の宣言はできます。`:host`セレクタの中で宣言すればそのコンポーネントスタイル中ではどこでも間違いなく参照できます。

```css
:host {
  --_bg-light: white;
  --_bg-dark: black;
  --_bg: var(--_bg-light);

  background-color: var(--_bg);
}

@media (prefers-color-scheme: dark) {
  :host {
    --_bg: var(--_bg-dark);
  }
}
```

ただしコンポーネントスタイルでCSS変数を使う場合は、CSS変数が階層的なスコープを持つことに注意する必要があります。CSS変数のスコープはこのコンポーネントのテンプレート内に閉じず、DOMツリー上でこのコンポーネントの子孫にあたる要素もCSS変数を参照できます。それが便利な場面も多いですが、名前の衝突や意図せぬ上書きについての注意は必要です。

また、ここで今後のステップにそなえてコンポーネントのセレクタも修正します。コンポーネント側では`input`要素の`type=reset`と`type=submit`にも対応します。

```typescript
@Component({
  selector: `
  button[awesome-button],
  input[type=button][awesome-button],
  input[type=submit][awesome-button],
  input[type=reset][awesome-button],
  input[type=file][awesome-button],
  `,
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './button.component.css',
  host: {
    class: 'awesome-button',
  },
})
export class AwesomeButton {}
```

また、ファイル選択ボタンに適切なスタイルを与えるため、いままで:hostセレクタに一律で与えていたスタイルを修正します。[元記事](https://web.dev/articles/building/a-button-component?hl=en#the_shared_selector)と同じように、`input[type=file]`の場合にはホスト要素ではなくその`::file-selector-button`疑似要素をボタンとしてのスタイリング対象にするため、次のようにセレクタを2つに分割します。 CSS変数の宣言については`:host`要素に残しています。

https://developer.mozilla.org/en-US/docs/Web/CSS/::file-selector-button

```css
:host {
  --_bg-light: white;
  --_bg-dark: black;
  --_bg: var(--_bg-light);
}

:host(:where(button, input[type='button'], input[type='submit'], input[type='reset'])),
:host(:where(input[type='file'])::file-selector-button) {
  ...
}
```

@[stackblitz](https://stackblitz.com/edit/angular-ih2w48?ctl=1&embed=1&file=src/button.component.css)

## スタイルの変更

ここまでのボタンコンポーネントのスタイルは常に同じでしたが、ボタンの種類や状態に応じて切り替わるように変更します。[元記事](https://web.dev/articles/building/a-button-component?hl=en#preparing_for_design_consistency)と同じように、必要なCSS変数を一通り宣言し、各種スタイルに適用します。ほぼ元記事と同じことをするだけなのでコードは割愛します。気になる方はStackblitzで確認してください。

特筆すべき点として、ボタンが`type=submit`である場合には強調されたスタイルになるようにします。この際、`form`要素の中で`type`属性が指定されていない`button`要素も`type=submit`とみなされます。このような場合、コンポーネントのホスト要素に対してその祖先側の条件を指定するために`:host-context`セレクタを使うことができます。この例では、祖先のどこかに`form`要素があり、かつ自身が`type`属性も`disabled`属性も持たない`button`要素であるという条件を記述しています。

https://developer.mozilla.org/en-US/docs/Web/CSS/:host-context

```css
/* Customizing submit buttons */
:host(:where([type='submit'])),
:host-context(form) :host(button:not([type], [disabled])) {
  --_text: var(--_accent);
}
```

:::message
このセレクタは本当であれば`:host(:where(button:not([type],[disabled])))` と書けなければいけないが、今のAngularのCSSコンパイラでは解釈に失敗するらしく、やむなく`:where`を外している。この件については後日イシューを報告する。
:::

また、ボタンコンポーネントにマウスカーソルが重なったときにはインタラクション可能であることをユーザーに伝えますが、[元記事](https://web.dev/articles/building/a-button-component?hl=en#cursor_and_touch_adjustments)では`cursor: pointer`だけでなく、`touch-action: manipulation`もセットしています。これにより、ユーザーがダブルタップなどしたときにデバイス側でのズーム機能などが反応してしまうことを防げるようです。

https://developer.mozilla.org/ja/docs/Web/CSS/touch-action#manipulation

```css
:host(
    :where(
        button,
        input[type='button'],
        input[type='submit'],
        input[type='reset']
      )
  ),
:host(:where(input[type='file'])::file-selector-button) {
  cursor: pointer;
  touch-action: manipulation;
}
```

次のサンプルコードは以上の作業を終えた状態です。

@[stackblitz](https://stackblitz.com/edit/angular-9m5xdt?ctl=1&embed=1&file=src/button.component.css)

## ボタンのバリアント

最後に、ボタンコンポーネントに特定のパラメータを与えることでバリアントを切り替えられるようにします。[元記事](https://web.dev/articles/building/a-button-component?hl=en#creating_variants)と同じように、`custom`と`large`の二種類を追加します。

まずは、`<button awesome-button color="custom">` のように、`color`インプットに対して`custom`という値が渡されたときにスタイルをカスタマイズします。既定値は`default`とし、`color`プロパティの値を`data-color`属性にバインディングすることでCSSセレクタからアクセスできるようにします。

```typescript
export type AwesomeButtonColor = 'custom' | 'default';

@Component({
  selector: `
  button[awesome-button],
  input[type=button][awesome-button],
  input[type=submit][awesome-button],
  input[type=reset][awesome-button],
  input[type=file][awesome-button],
  `,
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './button.component.css',
  host: {
    class: 'awesome-button',
    '[attr.data-color]': 'color',
  },
})
export class AwesomeButton {
  @Input() color: AwesomeButtonColor = 'default';
}
```

そしてボタンコンポーネントのスタイルで`data-color`属性の値に応じてCSS変数を切り替えます。これで完了です。

```css
/* Variants */
:host(:where([data-color='custom'])) {
  --_bg: linear-gradient(hsl(228 94% 67%), hsl(228 81% 59%));
  --_border: hsl(228 89% 63%);
  --_text: hsl(228 89% 100%);
  --_ink-shadow: 0 1px 0 hsl(228 57% 50%);
  --_highlight: hsl(228 94% 67% / 20%);
}
```

次に、ボタンの大きさに関するバリアントとして `<button awesome-button size="large">` という使い方ができるようにします。`custom`バリアントの例と同じように、`size`インプットを追加して`data-size`属性にバインディングします。

次のコードが最終的な完成形です。

@[stackblitz](https://stackblitz.com/edit/angular-uxu7uj?ctl=1&embed=1&file=src/button.component.css)

## まとめ

ボタンコンポーネントの実装を通して、AngularでUIパーツとしてコンポーネントを作る際のちょっとしたテクニックを紹介してみました。誰かの役に立てば幸いです。いままで使ったことのなかったCSSの機能も知れて自分の収穫もありました。

今回の例では`input[type=file]`の特殊ケースを扱うことでCSSは少し複雑になりましたが、ネスト構文などを使えばもう少し整理されたCSSにできそうに思います。ただCSS変数の数がすごく多いので、変数管理のあたりは実用的にはまだまだ改善しなければならないですね。

Angular Materialもそうですが、CSS変数がいよいよ本格的にUIコンポーネント設計の中で考慮すべきものとして普及してきているように感じています。来年はもっとCSS変数を活用して上手にコンポーネントのスタイリングを実装していきたいものです。
