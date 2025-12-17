---
title: 'Weekly Commits on Angular 2025-03-05'
published_at: '2025-03-05 18:21'
topics:
  - 'angular'
published: true
source: 'https://www.notion.so/Weekly-Commits-on-Angular-2025-03-05-1b43521b014a80448298efca294f5fde'
type: 'tech'
emoji: '✨'
---

一週間の間にAngular関連レポジトリへ取り込まれたコミットについて見ていきます。フレームワーク・ツールの利用者にあまり関係のないものは省略しています。

## angular/angular

Commits: [https://github.com/angular/angular/commits/main/?since=2025-02-27&until=2025-03-05](https://github.com/angular/angular/commits/main/?since=2025-02-27&until=2025-03-05)

### v20.0リリース日程の設定

https://github.com/angular/angular/commit/d85ebb447532c8c47029cfd59ef5fa57c7abd25c

v20.0のリリース予定日が暫定で5/26となりました。

### `httpResource` の `map` オプションを `parse` にリネーム

https://github.com/angular/angular/commit/919c4521ec1c340194e249e3db74e38f39d797b9

レスポンスボディに宣言的な変換処理を行うための関数オプションを `map` から `parse` にリネームしました。おそらくZodやValibotなどのバリデーションライブラリとの機能的な親和性を考慮したものと思われます。

https://x.com/Jean__Meche/status/1894176836239724874

上記のツイートのサンプルコードにおける `map` オプションの部分が次のように書けるはずです。

```typescript
swPersonResource = httpResource(
  () => `https://swapi.dev/api/people/${this.id()}`,
  { parse: starWarsPersonSchema.parse },
);
```

### `Injector.destroy` メソッドの公開

https://github.com/angular/angular/commit/4812215a7b3bcb54bce3f017d89246aa39af2cc5

`Injector.create` 関数で動的に作成されたインジェクターの破棄を行う`destroy`メソッドが公開APIとして露出されました。実装上はもともと存在したので振る舞いの変更はありません。

### テンプレート内でのタグ付きテンプレートリテラルの許可

https://github.com/angular/angular/commit/51b8ff23cefb5112937dec9727a5b5d6e913aae6

コンポーネントテンプレート内でタグ付きテンプレートリテラルの宣言が可能になりました。先週に引き続き、テンプレート式におけるECMAScript構文のサポートカバレッジを広げる狙いです。

```typescript
@Component({
  template: '{{ greet`Hello, ${name()}` }}'
})
export class MyComp {
  name = input();

  greet(strings: TemplateStringsArray, name: string) {
    return strings[0] + name + strings[1] + '!';
  }
}
```

### 動的なコンポーネント生成の機能拡充

https://github.com/angular/angular/commit/82aa2c1a527be85e09f0f660ece56b594bff5a76

https://github.com/angular/angular/commit/fe57332fc5c4e6b44f01b9b4343385e90b3edf77

https://github.com/angular/angular/commit/be44cc8f40fb2364dbaf20ba24496e4355f84e78

`createComponent`関数などコンポーネントインスタンスを動的に生成するAPIにディレクティブをアタッチできるようになりました。

また、動的に生成されるコンポーネントに対してインプット・アウトプットを宣言的に渡すAPIも追加されました。テンプレート中でのみ可能だった操作がTypeScriptコード上でもサポートされます。

### TypeScript 5.8未満のサポート終了

https://github.com/angular/angular/commit/326d48afb4266ef9b028860e2f845de005653d75

TypeScript 5.8未満のサポートを終了しています。v20.0に含まれる破壊的変更になります。

### `httpResource`における`context`オプションのサポート

https://github.com/angular/angular/commit/bb14fe86e31fbb80daaa3898499f93d0e4ebc1f7

`HttpClient`のインターセプター機構でサポートされている`context`オプションが追加されました。実装漏れだったようです。

## angular/angular-cli

Commits: [https://github.com/angular/angular-cli/commits/main/?since=2025-02-27&until=2025-03-05](https://github.com/angular/angular-cli/commits/main/?since=2025-02-27&until=2025-03-05)

### `provideServerRoutesConfig` 関数の廃止

https://github.com/angular/angular-cli/commit/d63e31c326b306a95b9c75bb48dda6b9372278bc

SSR用の `provideServerRoutesConfig` APIは開発者プレビューとして公開されていましたが、`provideServerRouting` APIと置き換わる形で廃止されます。

## angular/components

Commits: [https://github.com/angular/components/commits/main/?since=2025-02-27&until=2025-03-05](https://github.com/angular/components/commits/main/?since=2025-02-27&until=2025-03-05)

### `CdkListbox`ディレクティブの追加

https://github.com/angular/components/commit/fc46997442b72bc1ba395fcd5f008b0358e5c91f

`angular/cdk-experimental`パッケージにARIA Roleのlistboxに対応する`CdkListbox`ディレクティブの実装が追加されました。また、`CdkListbox`におけるキーボード操作やtypeahead機能など見た目とは別の振る舞いについては新たに `ui-patterns` というサブパッケージが追加されたようです。今後他のCDKディレクティブの裏側でも活用されることが予想されます。

