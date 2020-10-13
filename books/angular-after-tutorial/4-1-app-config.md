---
title: "第4章 依存性の注入 - アプリケーションコンフィグの管理"
---

第4章ではAngularの依存性の注入機能の実践的な利用パターンをいくつかのユースケースを通して解説します。
この章の内容を理解するには以下の前提知識が必要です。

* [公式チュートリアルのサービスの章](https://angular.jp/tutorial/toh-pt4)を理解していること
* Angularの[依存性の注入](https://angular.jp/guide/dependency-injection)の概要を理解していること

:::details 更新履歴
**2019/03/13:** 値プロバイダーの宣言方法を、Tree-Shakableプロバイダーを使った手法に変更しました。
:::

## アプリケーションコンフィグ

多くのアプリケーションは実行時の振る舞いを柔軟に制御するために、**定数**や**環境変数**を使って設定を管理しています。たとえば、APIサーバーのベースURLを開発環境とプロダクション環境で切り替えるためには、環境ごとに固有の文字列を使うように設計します。あるいは、外部サービスのAPIキーや、アプリケーションのタイトルなども同様でしょう。ブラウザのUserAgentのように実行の初期段階で決定するものも、ある種の環境変数といえます。

これらの値をコンポーネントやサービスに直接ハードコーディングしてしまうと、違う値を使ったテストは不可能になり、複数箇所への変更を一致させる努力が必要になります。これは単一責任の原則に反した、メンテナンス性の低い実装です。

まず最初におこなうべきことはそれらの設定値をアプリケーションから隔離された場所に切り出すことです。それはたとえばJSONファイルであったり、定数管理用のTypeScriptファイルであったり、ビルド時の環境変数であったりと様々です。場合によっては設定値をバックエンドサーバーで管理し、起動時にHTTPリクエストして取得するかもしれません。

ともかく、メンテナンス性とスケーラビリティを両立したアプリケーションの設計には、実行前に決定されるいくつかの **設定値によってアプリケーションの振る舞いを柔軟に変更できる** ようにすることが求められます。このような設定値のことをここでは **アプリケーションコンフィグ \(App Config\)** と呼ぶことにしましょう。

:::message
言語設定やUIテーマなど、ユーザーごとの設定を管理する**ユーザーコンフィグ**とは  
まったく区別されます。
:::

## コンフィグへの参照

アプリケーションコンフィグを扱う際のよくある失敗は、 **アプリケーションのいろんな場所から直接参照してしまう** ことです。Angularのアプリケーションで考えると、コンポーネントやサービスのそれぞれがアプリケーションコンフィグに直接依存する状態です。コンポーネントやサービス単体でのテストができず、設定値を変化させたテストを書くことができません。また、設定値が増えたり、名前や形式が変わったときに変更しなければならないモジュールも増えます。

![](https://storage.googleapis.com/zenn-user-upload/rkwugrjm3aqmmlg61vsyses7y1a8)

アプリケーション外とアプリケーション内が複雑に絡み合ったこの状態を解決するために、 **依存性の注入（DI）** を活用しましょう。アプリケーションのブートストラップ時にコンフィグをDIに取り入れ、設定値がコンポーネントやサービスへ動的に注入されるようにします。その具体的な方法についてこれから学びます。

![](https://storage.googleapis.com/zenn-user-upload/9mm4n1sm5tlos29pwlz97pguuyf1)

## 値プロバイダー（Value Provider）

AngularのDIについて基本的な学習を終えていれば、 `providers: [HeroService]`  というプロバイダー設定が、 `providers: [{ provide: HeroService, useClass: HeroService ]}` の省略であることは知っているでしょう。 これは **クラスプロバイダー（Class Provider）** と呼ばれ、指定されたクラスのインスタンスを注入可能にするプロバイダーです。クラスプロバイダー以外にもいくつかのプロバイダーの種類がありますが、まず知っておくべきものは **値プロバイダー（Value Provider）** です。値プロバイダーを使った実装のパターンを見ていきましょう。

### コンフィグファイル

まずはじめに、アプリケーションコンフィグの設定値を管理するファイルを用意します。 `src/config.ts` ファイルに、アプリケーションの設定値を配置します。

```typescript:src/config.ts
export const config = {
  appTitle: 'Example App',
};
```

この値を注入可能にするために、これから **トークン** と 値プロバイダーを定義します。

### トークンとプロバイダー

**トークン \(Token\)** とは、DIにおいて **「何を注入するか」を識別する鍵** のようなものです。プロバイダーとインジェクターは、実体を参照しない代わりにこのトークンを互いに参照します。トークンはJavaScriptのオブジェクトであれば何でもよいですが、Angularが提供する `InjectionToken` クラスのインスタンスを使うのが一般的です。

`src/app/providers` ディレクトリの中に `app-title.ts` ファイルを作成し、次のようにトークンを作成します。 `InjectionToken` のコンストラクタに渡す文字列は何でもかまいませんが、トークンの変数名はアッパースネークケースとするのが慣例です。ジェネリック型に `string` を指定すると、このトークンで取得できるオブジェクトの型が文字列であることもAngularに伝えられます。

```typescript:app-titie.ts
import { InjectionToken } from '@angular/core';

export const APP_TITLE = new InjectionToken<string>('appTitle');
```

次に `APP_TITLE` トークンに値を提供するプロバイダーを作成します。`InjectionToken` の第2引数で、 `APP_TITLE` をアプリケーション全体で有効にする `providedIn: 'root'` の設定と、その値の指定をします。

```typescript
import { config } from '../../config';

export const APP_TITLE = new InjectionToken<string>('appTitle', {
  providedIn: 'root',
  factory: () => config.appTitle,
});
```

`AppModule` の `providers` フィールドではなく、**トークンが自律的に** プロバイダーを宣言します。これは [**Tree-Shakable プロバイダー**](https://angular.jp/guide/dependency-injection-providers#tree-shakable-providers)と呼ばれるものです。NgModuleから静的に参照されないことがプロダクションビルドで不必要なコードを除去する際の助けとなります。

ここまで全く結合していなかったコンフィグとアプリケーションが、DIを通じて関係を持ちました。DIを境界として **アプリケーションの中と外を分離** し、 **アプリケーション内部からはコンフィグについてまったく関心を持たない** ようにできました。

コンポーネントやサービスでは、次のように `@Inject` デコレーターを使うことで `APP_TITLE` トークンに紐付いた値をコンストラクタ引数として注入します。

```typescript:app.component.ts
import { Component, Inject } from '@angular/core';
import { APP_TITLE } from './providers/app-title';

@Component({
  selector: 'my-app',
  template: `{{appTitle}}`,
})
export class AppComponent {
  appTitle: string;

  constructor(@Inject(APP_TITLE) appTitle: string) {
    this.appTitle = appTitle;
  }
}
```

あるいは、 `Injector` クラスを注入し、 `get` メソッドで値を取得する方法もあります。 `InjectionToken` にジェネリクスで型を伝えているため、`get` メソッドの戻り値は正しく文字列型になります。

```typescript
import { Component, Injector } from '@angular/core';
import { APP_TITLE } from './providers/app-title';

@Component({
  selector: 'my-app',
  template: `{{appTitle}}`,
})
export class AppComponent {
  appTitle: string;

  constructor(injector: Injector) {
    this.appTitle = injector.get(APP_TITLE); // string型として取得できる
  }
}
```

## 抽象クラスを使ったAppConfigパターン

ここまでの内容が理解できたら次のステップに進みましょう。コンフィグの内容が増えてくると、それぞれに独立したプロバイダーとトークンを定義するのは面倒です。コンフィグは基本的に一箇所で管理されるものですから、変更のタイミングが同じだとすれば個別に管理される必要もありません。アプリケーションコンフィグをまとめて管理する `AppConfig` を導入してみましょう。

先ほどの `app-title.ts` ファイルを `app-config.ts` ファイルにリネームし、次のように変更します。注目すべきポイントは、 `InjectionToken` のインスタンスがなくなり、  **`AppConfig` 抽象クラス** が定義されたことと、その **抽象クラスの値プロバイダーを`@Injectable` で宣言している** ことです。

```typescript:app-config.ts
import { Injectable } from '@angular/core';
import { config } from '../../config';

const appConfig: AppConfig = {
  appTitle: config.appTitle;
};

@Injectable({
  providedIn: 'root',
  useValue: appConfig
})
export abstract class AppConfig {
  readonly appTitle: string;
}
```

プロバイダーのトークンに使えるのはJavaScriptとして実体のあるオブジェクトだけです。つまり、TypeScriptのトランスパイル前にしか存在しない `interface` や `type` はトークンになりません。しかし **抽象クラスはトランスパイル後にもクラスとして残る** ため、トークンとして使うことができます。

この変更により、注入をおこなう側も影響を受けます。クラス型をトークンにしたため、 `@Inject` はもう必要ありません。クラスプロバイダーで提供されたクラスと同じように `AppConfig` 型をトークンとして注入できます。

```typescript:app.component.ts
import { Component } from '@angular/core';
import { AppConfig } from './providers/app-config';

@Component({
  selector: 'my-app',
  template: `{{appTitle}}`,
})
export class AppComponent {
  appTitle: string;

  constructor({ appTitle }: AppConfig) {
    this.appTitle = appTitle
  }
}
```

`AppConfig` が導入されたことで、これからコンフィグの中身が増えたとしても新たにプロバイダーやトークンを増やす必要はなくなりました。コンポーネントのコードも少なくなり、メンテナンス性の高いソースコードになりました。この実装パターンを **AppConfig パターン** と呼ぶことにしましょう。

### AppConfigパターンの欠点

`AppConfig` は便利なパターンですが弱点もあります。`AppConfig` が管理する設定値が多くなると、注入する場所によってはそのほとんどが不要な値というケースが増えてきます。しかしコンストラクタ引数の型は `AppConfig` 型ですから、テストの際にも本来は不要な設定値を渡す必要が生まれてしまいます。DIを利用した結果テストしにくくなってしまっては本末転倒です。

この問題を防ぐために、 `AppConfig` が大きくなりすぎたと感じたら、 **適切な粒度でコンフィグを分割** すべきです。 なるべく同じ関心事でまとまった設定値をひとかたまりとして、いくつかの `FooConfig` 、 `BarConfig` のようなものを作りましょう。

