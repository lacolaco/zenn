---
title: 'Angular MaterialのdisabledInteractive'
published_at: '2024-09-18 11:30'
topics:
  - 'angular material'
  - 'アクセシビリティ'
  - 'angular'
published: true
source: 'https://www.notion.so/Angular-Material-disabledInteractive-52edeabe72e344cc9eddd2ccf9148002'
type: 'tech'
emoji: '✨'
---

近頃、HTMLの `<button>` タグの `disabled` 属性と `aria-disabled` 属性、Webアクセシビリティを絡めた発信や言説を見ることが増えているように感じる。

https://azukiazusa.dev/blog/use-aria-disabled-to-give-focus-to-disabled-button/

https://zenn.dev/tor_inc/articles/aae4a896bbab9e

https://qiita.com/ymrl/items/0bfb691e98e153e90fc5

https://design.digital.go.jp/components/button/#h4-ボタンの無効化（disabled）における注意点

個別のケースにおいて `disabled` を使うべきか `aria-disabled` を使うべきかという是非についてはここでは扱わないが、どちらの方法も選択可能な技術的オプションとして持っておきたい。その点で、今回の記事では2023年あたりから Angular Material のコンポーネントに実装されはじめた `disabledInteractive` 機能について解説をする。

## Angular Materialの `disabledInteractive`

Angular MaterialのMatButtonコンポーネントには `disabledInteractive` プロパティがある。このプロパティを追加したプルリクエストには次のように説明が書かれている。

> Native disabled buttons don't allow focus and prevent the button from dispatching events. In some cases this can be problematic, because it prevents the app from showing to the user why the button is disabled.

https://github.com/angular/components/pull/28242

ここで解決すべき問題とされているのは、ネイティブのボタン要素が非活性状態だとフォーカスを受け付けないことと、イベントを発火できないことである。それによって「なぜボタンが非活性なのか」を表示することを阻害してしまうことがある。

オプトインで追加された `disabledInteractive` プロパティは、非活性状態のスタイルを適用しつつ、`aria-disabled=”true”` 属性を有効にするが、`disabled` 属性はセットしない。これにより、ボタンに対してユーザーがインタラクト可能である状態を保つ。

公式ドキュメントのサンプルコードを見てみよう。この例では、ひとつめのボタンは `disabled` 属性が指定された上で `disabledInteractive` も併用されている。コンポーネントのテンプレートHTML上では`disabled` 属性がついているが、レンダリングされたDOM上では`disabled`属性はなく`aria-disabled=”true”` だけになっており、開発者に直接WAI-ARIA属性を扱わせることなく実装の詳細を隠蔽してある。

https://material.angular.io/components/button/examples#button-disabled-interactive

```html
<button
  mat-raised-button
  disabled
  disabledInteractive
  matTooltip="This is a tooltip!"
>
  Disabled button allowing interactivity
</button>

<button mat-raised-button disabled matTooltip="This is a tooltip!">
  Default disabled button
</button>
```

`disabledInteractive` プロパティは、そのMatButtonの`disabled` プロパティが`true` のときにインタラクト可能にするかどうかを制御する。インタラクト可能な状態では、あらゆるイベントは通常状態と同じく発火される。この例では`disabledInteractive`がついているボタンの方だけマウスオーバーによりツールチップを表示できる。

当然、この状態では非活性状態でもクリック可能なので、フォームの送信などに使う場合はボタンの状態と同期してアプリケーション側でのバリデーション機構が必要になる。公式ドキュメントでも使用上の注意が書かれている。

> **Note:** Using the `disabledInteractive` input can result in buttons that previously prevented actions to no longer do so, for example a submit button in a form. When using this input, you should guard against such cases in your component.

https://material.angular.io/components/button/overview#interactive-disabled-buttons

ともあれ、開発者の間でのニーズが高まっていることを受けてAngular Materialではこのような機能が実装されている。MatButtonに限らず、フォームコントロール系の要素では徐々に実装が広がっており、チェックボックスやラジオボタン、テキストインプットなどいくつかのコンポーネントで同様の`disabledInteractive` プロパティを使えるようになっている。バージョンアップを重ねるごとに少しずつ増えており、今後も拡充されるだろう。

https://github.com/angular/components/pulls

あくまでもオプトインであり、この機能は「使うべきベストプラクティス」として用意されているわけではない。システムの要件次第ではこういった対応が必要になるケースがあり、そういうときにAngular Materialでは実現できないと判断されることを避けるためのものだろう。必要だと思えば使えばよいし、そうでないなら使わなくてよい。しかし存在は知っておくことで実装の幅は広がるはずだ。
