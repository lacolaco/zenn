---
title: 'Angular: ホスト要素にTailwindCSSのクラスを付与する'
published_at: '2023-09-06 12:58'
topics:
  - 'Angular'
  - 'tailwindcss'
published: true
source: 'https://www.notion.so/Angular-TailwindCSS-4b13c6c076da42c381d181affb15f518'
type: 'tech'
emoji: '✨'
---

Angular アプリケーションで TailwindCSS を使っているとき、コンポーネントやディレクティブのホスト要素にスタイルを付与するのが書きにくくて困っていた。コンポーネントHTML内の子要素については `class` 属性にクラスを追加するだけなので、VSCodeの TailwindCSS IntelliSenseが期待通りに機能するが、ホスト要素にクラスを付与するAPIはHTMLの外なので、入力補完の効かない自由文字列で記述しなければならなかったからだ。

https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss

![](/images/angular-host-element-with-tailwindcss-classes//3c6255ea-b6c7-4055-8126-638d2819f0c3/5391c161-d5f9-4447-b38b-5ff29f5d786a/Untitled.png)
_hostメタデータのclassプロパティはTailwindCSS Extensionにクラスを記述する場所だと認識されていない_

TainwindCSS のユーティリティファーストは入力補完があってはじめてまともに実用性があるアプローチだと考えているので、この使いにくさはAngularアプリケーションでTailwindCSSを使う上で悩みのタネだった。

これはどうにかできないかと長らく思っていたのだが、あらためてExtensionの設定項目を眺めてみると `classRegex` という設定があった。実はけっこう前から追加されているらしく、これを使えば任意の正規表現にヒットする行でIntelliSenseを有効にできる。

https://zenn.dev/shon0/articles/2aa72060fb824d

https://github.com/tailwindlabs/tailwindcss/issues/7553

そういうわけで、次のようにVSCodeの設定を記述した。 このJSONは個人設定に書いてもいいが、チーム開発なら `.vscode/settings.json` に書いておけば個別の設定なしに自動的に適用できる。

```json
{
  "tailwindCSS.experimental.classRegex": [
    "class\\:\\s*[\"'`]([^\"'`]*).*?[\"'`]"
  ]
}
```

結果、無事にコンポーネントの `host.class` プロパティでもTailwindCSSのクラス入力補完が使えるようになった。

![](/images/angular-host-element-with-tailwindcss-classes//3c6255ea-b6c7-4055-8126-638d2819f0c3/b91070c2-7095-4738-b736-4c57828d7c62/Untitled.png)
_classプロパティの中で TailwildCSS の入力補完が効くようになった_

スタンドアローンコンポーネントで書くようになってから、テンプレートHTMLはインラインで書くことが増えたが、CSSもインラインで書くのにこの点だけがネックだったので、それが解決して嬉しい。
