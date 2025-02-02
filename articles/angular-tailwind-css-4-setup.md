---
title: 'Angular: Tailwind CSS 4.0のセットアップ'
published_at: '2025-02-02 14:54'
topics:
  - 'angular'
  - 'tailwindcss'
published: true
source: 'https://www.notion.so/Angular-Tailwind-CSS-4-0-18e3521b014a80d9af62f945ecfa18f3'
type: 'tech'
emoji: '✨'
---

Tailwind CSS 4.0がリリースされたが、Angular CLIはもともとTailwind CSSとの連携に正式対応している。あらためて最新バージョンでのセットアップ方法を確認しておこう。

## PostCSS経由でのセットアップ

Tailwind CSS の公式ドキュメントでは、Angularプロジェクトの導入方法が説明されている。この方法では `.postcssrc.json` を作成して PostCSS 経由でTailwind CSSを組み込んでいる。

https://tailwindcss.com/docs/installation/framework-guides/angular

ドキュメントには書かれていないが、Angular CLIはもともとプロジェクトに PostCSS の設定ファイルがあればそれを利用する仕組みがある。ワークスペースかプロジェクトのルートディレクトリに設定ファイルを置いておくだけでビルド時に読み込まれる。

https://github.com/angular/angular-cli/blob/main/packages/angular/build/src/utils/postcss-configuration.ts#L20

今回はこのおかげで、特にTailwind CSSのために何かをしなくても単なるPostCSSプラグインとして機能するようだ。新規のプロジェクトを作成する場合はこの方法を取ればよいだろう。

## Tailwind CSS 3系からのアップグレード

Tailwind CSS 3系からAngularアプリケーションに組み込んで使っている場合、おそらく `tailwind.config.js` のようなJavaScript形式の設定ファイルをAngular CLIに読み込ませる形がほとんどだろう。以前のドキュメントではそのやり方で説明されていた。

そのままでも動きはすると思うが、設定ファイルのCSS化は Tailwind CSS 4.0 の目玉でもあるので、既存アプリにおいても上記のPostCSSを使ったセットアップにアップグレードしたい。一度 PostCSS 経由でのセットアップにしておけば Angular CLI 内部での Tailwind CSS 統合に依存せず、Angular と Tailwind CSS 両方の継続的なアップグレードがしやすくなるだろう。そこで、既存のJavaScript設定ファイルを併用して段階的に移行しよう。

公式ドキュメントではアップグレードガイドに書かれているとおり、 `@config` ディレクティブを使うことで、Tailwind CSSをインポートしているCSSファイルから、JavaScript設定ファイルの読み込みを指示できる。

```css
@import 'tailwindcss';

@config "../tailwind.config.js";
```

この手順を踏めば、Tailwind CSS 3系を組み込んでいるAngular アプリケーションも簡単にアップグレードできそうだ。ただし、Tailwind CSS 4.0 にはユーティリティクラスそのものにもいろいろと破壊的変更があるため、アップグレードガイドをよく読もう。

## まとめ

Angular プロジェクトでのTailwind CSS 4.0の組み込みは `.postcssrc.json`を使用したPostCSS経由のセットアップがシンプルで推奨される方法だ。既存プロジェクトでは@configディレクティブを使用してJavaScript設定ファイルからの段階的な移行が可能で、Angular CLIとの統合に依存せず、将来的なアップグレードも容易になる。
