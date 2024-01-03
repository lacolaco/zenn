---
title: 'Angular: 依存性の注入にコンストラクタ引数ではなくinject関数を使うべき理由'
published_at: '2023-03-23 09:44'
topics:
  - 'angular'
  - 'dependency injection'
  - 'typescript'
published: true
source: 'https://www.notion.so/Angular-inject-23c54aef56ff4d4c99b035e052b80056'
type: 'tech'
emoji: '📝'
---

Angular v14から導入された `inject()` 関数によって、これまでコンストラクタ引数でしかできなかった依存性の注入を、単なる関数の呼び出しに置き換えることができるようになった。

https://blog.lacolaco.net/2022/09/presentation-angular-standalone-based-app/

https://netbasal.com/unleash-the-power-of-di-functions-in-angular-2eb9f2697d66

これまでは型推論におけるちょっとした優位性を除いては基本的に互換性のある、どちらを使ってもよいAPIとして認識されていたが、TypeScript 5.0 で導入されたECMAScript Decoratorsの標準実装によって話が変わってきた。今後は、依存性の注入にコンストラクタ引数ではなくinject関数を使うべきであると言える理由をこの記事で解説する。

## コンストラクタ引数の問題点

コンストラクタ引数を使用した依存性の注入は、TypeScriptのExperimental Decoratorsで実装されているParameter Decoratorsの機能が不可欠である。Parameter Decoratorsとは、関数の引数を修飾するデコレーターである。コンストラクタ引数による依存性の注入に使われる `@Inject()` や `@Self()` 、 `@Optional()` などはすべてParameter Decoratorsである。

```typescript
class Foo {
  constructor(@Inject(Bar) bar: Bar) {}
}
```

`@Inject()` を使っていないコンストラクタ引数でもインジェクションできていると思っている人もいるかもしれないが、それはAngularのデコレーターコンパイラが型パラメータを自動的にインジェクショントークンに変換して次のように書き換えているからである。これは `@Inject()` の省略記法にすぎない。

```typescript
class Foo {
  // 型パラメータから判断して自動的に @Inject(Bar) が生成される
  constructor(bar: Bar) {}
}
```

しかし、TypeScript 5.0で実装されたECMAScript 標準準拠のデコレーターは、いまのところParameter Decoratorsを持たない。いずれECMAScriptでサポートされるかもしれないが、ともかく現状はTypeScriptの実験的実装でしかサポートされていない構文ということになる。

https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#decorators

> This new decorators proposal is not compatible with --emitDecoratorMetadata, and it does not allow decorating parameters. Future ECMAScript proposals may be able to help bridge that gap.

Angular は TypeScript 5.0の標準デコレーター実装にも互換性を持たせるように内部で対応を進めているため、ただちにこれまでのAngularプロジェクトが壊れることはない。

https://github.com/angular/angular/pull/49492

だが、なるべく安定した標準に依存したソースコードを書こうとするなら、Parameter Decoratorsからの脱却を進めなければならない。

## inject関数の優位性

幸い、Angularの文脈でParameter Decoratorsを使っているのはコンストラクタ引数での依存性の注入だけであり、この機能は v14 から導入されている `inject()` 関数で完全に置き換え可能である。つまり、Parameter Decoratorsからの完全脱却はすでに可能である。

むしろ、 `inject()` 関数を使わなければ実現できないユースケースも増えつつあり、デコレーターの問題がなくても置き換えは時間の問題だっただろう。RouterのGuard/Resolverはすでにクラスベースの実装を非推奨にしているし、HttpClientのinterceptorも関数ベースのAPIをサポートした。

依存性の注入を含むビジネスロジックの関数切り出しというリファクタリング面での恩恵があるというレベルではすでになく、 `inject()` 関数を使わければ新しい機能を利用できないようになってきている。

## 結論

コンストラクタ引数による依存性の注入をやめなければ、TypeScript の実験的実装に依存し続けることになる。今後しばらくはTypeScriptがサポートを切ることはないらしいが、今後さまざまなライブラリやツールが標準デコレーターを前提とした形で登場してくるだろう。そのとき、非標準のデコレーターでしかサポートされていないParameter Decoratorsの存在が足を引っ張る可能性は高い。

もはやどちらを使うか選べる段階は終わったと考えるべきだ。 `inject()` 関数が依存性の注入を利用するただひとつの安定APIである。
