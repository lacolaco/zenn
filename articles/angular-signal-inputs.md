---
title: 'Angular: Signal Inputsで何が変わるのか'
published_at: '2024-01-11 14:48'
topics:
  - 'angular'
  - 'signals'
published: true
source: 'https://www.notion.so/Angular-Signal-Inputs-190478da4fdf4db6a71f4942d2011d2a'
type: 'tech'
emoji: '✨'
---

Angular v17.1.0にて、**Signal Inputs**という機能がリリースされる見込みだ。Signals APIのRFC段階から提案されていたものだが、ついに実際に使えるAPIになる。この記事ではSignal Inputsによって何が変わるのかをかいつまんで解説する。

## Signal Inputsとは

Signal InputsはSignals RFCの中でもSignal-based Componentsのセクションで提案されている。

https://github.com/angular/angular/discussions/49682

> In signal-based components, all component inputs are signals. 

ここで書かれているように、コンポーネントのインプットプロパティをSignalとして宣言できる。従来のSignalではないオブジェクトでは、インプットの変更に反応して処理をおこなうために `ngOnChanges` ライフサイクルフックや、setterによる代入処理への割り込みが必要だったが、Signal Inputsでは通常のSignalと同様に`computed`や`effect`によってリアクティブな処理ができる。

## 例

以下は実際に動作するサンプルコードだ。`input()` によってインプットプロパティを宣言している。親コンポーネントから値を必ず受け取りたい場合は`input.required()`で指定できる。コンポーネント内ではSignalとして扱えるため、インプットの値が変わったときに行いたい処理は`effect`を使う。

@[stackblitz](https://stackblitz.com/edit/angular-k9ltgo?ctl=1&embed=1&file=src/main.ts)

## Signal Inputsで何が変わるのか

Signal Inputsへの移行により、特に以下の3つの点が大きく変わると考えられる。

### `ngOnChanges`が不要になる

これまではどのインプットが更新されても単一の`ngOnChanges`ライフサイクルフックで待ち受けるか、あるいはsetterを使うしかなかったが、それらはSignal Inputsと`effect`で一切不要になる。setterで入力された値の前処理をしていたようなケースも、今はすでにInput Transformもあるため、インプットプロパティのsetterが必要なケースは皆無だろう。

### TypeScriptの`strictPropertyInitialization`を常に有効化できる

TypeScriptのstrictモードに含まれている`strictPropertyInitialization` は、クラスプロパティが必ず初期化されていることをチェックする設定だが、親から値を受け取ることを前提にしたコンポーネントではインプットプロパティに初期値を入れられず、`strictPropertyInitialization` フラグをオフにしなければならないケースがあった。このことについては以前に記事を書いている。

https://blog.lacolaco.net/posts/angular-strict-property-initialization-best-practice/

Signal InputsによってすべてのインプットプロパティはSignal型のオブジェクトで初期化されることになるため、この記事で書いたベストプラクティスはすべて過去のものとなる。`strictPropertyInitialization`は常に有効化できるようになるはずだ。

### インプットがイミュータブルになる

`input()`によって作成される`InputSignal`オブジェクトは、`computed`と同じく読み取り専用のSignalである。これまではプリミティブ型ではないミュータブルなオブジェクトがインプットプロパティに渡された場合、子コンポーネントから親コンポーネントへ変更が逆流することがありえた。Signal Inputsであればそのようなことはなくなり、バグが起きにくくなる。

## 参考リンク

- [https://justangular.com/blog/signal-inputs-are-here-to-change-the-game](https://justangular.com/blog/signal-inputs-are-here-to-change-the-game)
- [https://netbasal.com/revolutionizing-angular-introducing-the-new-signal-input-api-d0fc3c8777f2](https://netbasal.com/revolutionizing-angular-introducing-the-new-signal-input-api-d0fc3c8777f2)
- [https://github.com/angular/angular/pull/53872](https://github.com/angular/angular/pull/53872)

