---
title: 'Weekly Commits on Angular 2025-04-09'
published_at: '2025-04-09 16:28'
topics:
  - 'angular'
published: true
source: 'https://www.notion.so/Weekly-Commits-on-Angular-2025-04-09-1d03521b014a80beae58f852f4628521'
type: 'tech'
emoji: '✨'
---

一週間の間にAngular関連レポジトリへ取り込まれたコミットについて見ていきます。フレームワーク・ツールの利用者にあまり関係のないものは省略しています。

## angular/angular

Commits: [https://github.com/angular/angular/commits/main/?since=2025-04-02&until=2025-04-09](https://github.com/angular/angular/commits/main/?since=2025-04-02&until=2025-04-09)

### refactor(http): remove non reactive signature from `httpResource`.

https://github.com/angular/angular/commit/23e4da430ab9eecb9ce9102bfe5d4a3de4e34443

開発者プレビュー中の`httpResource`関数の引数が変わりました。もともとは文字列リテラルを受け取っていましたが、テンプレートリテラル中でシグナルを読み込んでもリアクティブにならないことに気づきにくいということで、関数でしか引数を取らないようになりました。

### feat(forms): Allow to reset a form without emitting events (#60354)

https://github.com/angular/angular/commit/bdfbd5493240869e9a25fa10a0f6c21510e12492

FormGroupの`resetForm`メソッドが第2引数で`onlySelf`オプションと`emitEvent`オプションを取るようになりました。フォームの入力状態をリセットしつつイベントを発生させないようにできます。

### feat(router): Add ability to directly abort a navigation (#60380)

https://github.com/angular/angular/commit/0bb4bd661e8fafe3228692181397272898fb9e9a

Routerパッケージの`Navigation`オブジェクトに`abort`メソッドが追加されました。`Router.getCurrentNavigation()?.abort()` のように呼び出すことで進行中のナビゲーションを直接中断できるAPIです。

### feat(forms): add `markAllAsDirty` to `AbstractControl` (#58663)

https://github.com/angular/angular/commit/a07ee60989441c38e6539fd25cad5166622e9f9e

Formsパッケージの`AbstractControl`オブジェクトに`markAllAsDirty`メソッドが追加されました。その`AbstractControl`自身と入れ子になった子コントロールすべてをDirty状態に変化させる便利メソッドです。

### feat(core): mark `toObservable` as stable (#60449)

https://github.com/angular/angular/commit/4e88e18a8ef0f19aed85316e80627ad6d2ec80a7

開発者プレビューとして提供されていた`toObservable`関数がv20で安定版APIとして昇格されます。

### feat(core): stabilize `linkedSignal` API (#60741)

https://github.com/angular/angular/commit/8d050b5bfc49878f01777f71a37e34d5c1733b1b

開発者プレビューとして提供されていた`linkedSignal`関数がv20で安定版APIとして昇格されます。

### feat(core): promote `effect` to stable (#60773)

https://github.com/angular/angular/commit/2c6b697e4c76fe8af38838539530da3322400bb0

開発者プレビューとして提供されていた`effect`関数がv20で安定版APIとして昇格されます。

## angular/angular-cli

Commits: [https://github.com/angular/angular-cli/commits/main/?since=2025-04-02&until=2025-04-09](https://github.com/angular/angular-cli/commits/main/?since=2025-04-02&until=2025-04-09)

### feat(@schematics/angular): add migration to update `moduleResolution` to `bundler`

https://github.com/angular/angular-cli/commit/1e137ca848839402bc214fbccdc04243862d01d0

v20でアップデートする `ng update` コマンドで、tsconfigファイルの`moduleResolution`設定を`bundler`に変更する自動マイグレーションです。

### fix(@schematics/angular): default component templates to not use `.ng.html` extension

https://github.com/angular/angular-cli/commit/90615a88b10535d7f0197008b9d48ceac4409c23

先日のコミットで`ng generate`コマンドにより作成されるコンポーネントHTMLファイルの拡張子がデフォルトで`.ng.html`となる変更が加えられていましたが、この変更は`ngHtml`オプションによるオプトインに変更されました。`ng new`コマンドで作成される最初のコンポーネントのHTMLファイルは `app.html` がデフォルトになります。

### feat(@schematics/angular): add update migration to keep previous style guide generation behavior

https://github.com/angular/angular-cli/commit/fdc6291dda4903f418667d415b05367390cf829d

`ng generate`コマンドで作成されるファイルの拡張子をv19以前のスタイルに維持するように設定を更新する自動マイグレーションが追加されました。

## angular/components

Commits: [https://github.com/angular/components/commits/main/?since=2025-04-02&until=2025-04-09](https://github.com/angular/components/commits/main/?since=2025-04-02&until=2025-04-09)

### feat(material/core): handle `prefers-reduced-motion` automatically (#30796)

https://github.com/angular/components/commit/82f0fa6fa750779a04687d2564537e672a326b90

Angular Materialは`prefers-reduced-motion` メディア特性にしたがって自動的にアニメーションを無効化するようになります。
