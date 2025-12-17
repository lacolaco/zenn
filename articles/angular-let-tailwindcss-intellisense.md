---
title: 'Angular: テンプレート内変数でTailwind CSS IntelliSenseの入力補完を有効にする'
published_at: '2025-01-09 22:01'
topics:
  - 'angular'
  - 'tailwindcss'
published: true
source: 'https://www.notion.so/Angular-Tailwind-CSS-IntelliSense-1763521b014a80ca916dd87cfc630eca'
type: 'tech'
emoji: '✨'
---

Angularの `@let` 構文によるテンプレート内変数でTailwind CSSのユーティリティクラスを記述できるようにしてみよう。（テンプレート内変数でクラス文字列を再利用できるようにするアイデアはClassiの同僚である [koki-develop](https://zenn.dev/kou_pg_0131) さんが提案してくれた）

次の画像のように、Tailwind CSS IntelliSense によってクラス文字列であると認識され、入力補完が効くし、入力後には色のプレビューアイコンも表示される。完璧である。

![](/images/angular-let-tailwindcss-intellisense/CleanShot_2025-01-09_at_21.41.322x.6a27d7a9684259ba.png)
_VS Code上でTailwind CSSのユーティリティクラスの入力補完が動作している様子を示したスクリーンショット_

![](/images/angular-let-tailwindcss-intellisense/CleanShot_2025-01-09_at_21.34.452x.05480b1d1c3500dc.png)
_テンプレート内変数の文字列がTailwind CSSのユーティリティクラスだと認識されている様子を示したスクリーンショット_

## `classAttributes` 

やったことは簡単で、Tailwind CSS IntelliSense の `classAttributes` 設定を変更しただけである。

https://github.com/tailwindlabs/tailwindcss-intellisense?tab=readme-ov-file#tailwindcssclassattributes

この設定は本来、Tailwind CSS IntelliSense がクラス文字列を期待するHTML属性を列挙したものだが、HTML属性じゃなくてもざっくり `key=value` の形で記述されるものはなんでも対象にしてくれるようだ（実装を詳細に見たわけじゃないが）。

`classAttributes` には左辺のキーを正規表現で設定する。今回は `linkItemClassName` のように `.*ClassName` というパターンにマッチするとき、右辺にあたる部分では Tailwind CSS IntelliSense の入力補完が有効になる。パターンは好みに合わせて変えればよい。

```json
{
    "tailwindCSS.classAttributes": [
        "class",
        "className",
        "ngClass",
        "class:list",
        ".*ClassName" <-- 追加
    ]
}
```

この設定を `.vscode/settings.json` に加えるなりユーザー設定を変更するなりして、VS Code拡張を再起動すると冒頭のスクリーンショットのように機能する。再起動しないと反映されないので注意。

