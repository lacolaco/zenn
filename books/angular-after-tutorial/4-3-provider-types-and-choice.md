---
title: "第4章 依存性の注入 - プロバイダーの種類と選び方"
---

AngularのDIには4種類のプロバイダーがあります。それぞれに目的があり、適した用途があります。チュートリアルでは述べられていない、プロバイダーの選び方の指針を理解しましょう。

## Q. 提供したいものはオブジェクトですか？

提供したいものがクラスのインスタンスではなく単なるオブジェクトなら、アプリケーションコンフィグの章で述べたように  `InjectionToken` をトークンとする **値プロバイダー** を使いましょう。

```typescript
import { InjectionToken } from '@angular/core';

export const SOME_VALUE = new InjectionToken('someValue', {
  providedIn: 'root',
  factory: () => someValue,
});
```

## Q. 提供したいものは関数の戻り値ですか？

実行時に値が確定する動的なオブジェクトを提供したい場合には2つの選択肢があります。ひとつはシンプルに **あなたが** 関数を呼び出し、その戻り値を **値プロバイダー** に渡す方法です。もうひとつは、**ファクトリープロバイダー** を使って、Angularに**値の作り方**を教える方法です。次の例では2つのプロバイダーは実質的に同じ結果を生みます。

```typescript
import { InjectionToken } from '@angular/core';

export function getSomeValue(): SomeValue {
  return someValue;
}

export const SOME_VALUE_1 = new InjectionToken<SomeValue>('someValue', {
  providedIn: 'root',
  factory: () => getSomeValue(), // 関数の結果をAngularに渡します
});

export const SOME_VALUE_2 = new InjectionToken<SomeValue>('someValue', {
  providedIn: 'root',
  factory: getSomeValue, // ファクトリー関数をAngularに渡します    
});
```

もしファクトリー関数が依存する引数が完全にAngularから切り離されている場合は、結果だけをアプリケーションに関連付ける値プロバイダーのほうがシンプルに済むでしょう。それはつまり、 `getSomeValue` 関数がAngularに依存しないユニットテストを記述できる状態だということです。

逆に、ファクトリー関数がひとつでも **Angularやアプリケーションが提供する他のサービスへの依存性** をもつ場合、つまり **ファクトリー関数の中でDIをおこないたい** ときにはファクトリープロバイダー以外の選択肢はありません。次の例では、Angularの `PLATFORM_ID` APIに依存した関数をファクトリープロバイダーに渡しています。ファクトリー関数内で依存性を注入するには `inject` 関数を使います。

```typescript
import { InjectionToken, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export function getSomeValue(): SomeValue {
  const platformId = inject(PLATFORM_ID); // 依存性の注入をおこなう
  if (isPlatformBrowser(platformId)) {
    return someValueForBrowser;
  }
  return someValue;
}

export const SOME_VALUE = new InjectionToken<SomeValue>('someValue', {
  providedIn: 'root',
  factory: getSomeValue,
});
```

:::message
ファクトリープロバイダーはどんな値でも自由に解決して提供できる強力なプロバイダーですが、その分ソースコードの可読性やメンテナンス性を損なう危険性もあります。**ファクトリープロバイダーでないと解決できないものはほとんどありません。**

基本的には、**依存性を持てない値プロバイダー**と、**すべての依存性をDIで解決できるクラスプロバイダー**の2つだけを使うように心がけることを推奨します。
:::

## Q. 提供したいものはクラスインスタンスですか？

クラスインスタンスを提供したい場合には3つの選択肢があります。第一に**クラスプロバイダー**を利用してインスタンス化をAngularに委譲する方法、第二に**ファクトリープロバイダー**を使ってあなたがインスタンス化をおこなう方法、第三にあなたがインスタンス化したインスタンスオブジェクトを**値プロバイダー**で提供する方法です。しかし、**原則として常にクラスプロバイダーを使うべき**です。なぜならクラスプロバイダーで提供可能な状態にクラスを保つことが結果的にアプリケーションのテスタビリティやモジュール性を維持することにつながるからです。

:::message
サードパーティSDKの抽象化の例のように、例外的な実装が好ましい場面もあります。
:::


### シンプルなクラスプロバイダー

クラスの**コンストラクタ引数がすべてDIで解決できる**場合、あるいは**コンストラクタ引数を持たない**場合は、クラスに `@Injectable` デコレーターを付与するだけで、ファクトリー関数について考慮する必要はありません。

```typescript
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SomeClassWithDeps {
  constructor(childDep: ChildDep) {}
}

@Injectable({ providedIn: 'root' })
export class SomeClassWithoutDeps {
  constructor() {}
}
```

### DIで解決できない引数があるときには？

クラスの中にはDIで解決できないコンストラクタ引数を受け取りたいものもあります。たとえば `window` や `document` のようなオブジェクトや、環境変数などから導かれる設定値が考えられます。そのようなクラスは、理論的には次のようにファクトリープロバイダーを使ってインスタンス化することができるでしょう。

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// ファクトリー関数
export function someClassFactory(): SomeClass {
  const httpClient = inject(HttpClient);
  const userAgent = navigator.userAgent;
  return new SomeClass(httpClient, userAgent);
}

@Injectable({
  providedIn: 'root',
  factory: someClassFactory,
})
export class SomeClass {
  // HttpClientとUserAgent文字列に依存する
  constructor(httpClient: HttpClient, userAgent: string) {}
}
```

確かにこのプロバイダーは正しく動作しますが非効率的なコードです。`SomeClass` クラスのコンストラクタ引数が増えるたびに、ファクトリー関数にも手を加える必要があります。そしてDIによる解決が必要な引数かどうかは開発者の頭の中にしか答えがありません。また、ファクトリー関数の中にある `navigator.userAgent` は暗黙的な依存性であり、`someClassFactory` のテストのためにモック化するのが困難です。そして何よりも避けたいのは、ソースコードの中でクラスプロバイダーで提供されるクラスとそうでないクラスが混在することで**一貫性を失う**ことです。

このようなケースでは、次の例のように `userAgent` 引数もDIで解決できるように**別のプロバイダーを作る**べきです。そして `SomeClass` は他のサービスと同じようにクラスプロバイダーで提供します。

```typescript:providers/user-agent.ts
import { InjectionToken } from '@angular/core';

export const USER_AGENT = new InjectionToken('userAgent', {
  providedIn: 'root',
  factory: () => navigator.userAgent,
});
```

```typescript:services/some-class.ts
import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { USER_AGENT } from '../providers/user-agent';

@Injectable({ providedIn: 'root' })
export class SomeClass {
  constructor(httpClient: HttpClient, @Inject(USER_AGENT) userAgent: string) {}
}
```

Tree-shakableプロバイダーは NgModuleの `providers` 配列に同じトークンのプロバイダーを宣言することで簡単に上書きできます。上記の例でUserAgent文字列を変えたテストをする場合は次のように記述できます。

```typescript:services/some-class.spec.ts
describe('SomeClass', () => {
  beforeEach(() => {
    let some: SomeClass;
    TestBed.configureTestingModule({
      providers: [
        SomeClass, // rootとは別のインスタンスを作成する
        {
          provide: USER_AGENT,
          useValue: 'For Testing'
        }
      ]
    });
    some = TestBed.get(SomeClass);
  });
});
```

ここまでの内容をまとめると、次の図のようになります。新しくプロバイダーを宣言するときに参考にしてください。

![](https://storage.googleapis.com/zenn-user-upload/r357kfyjvezkxl5n158jw8movhy6)

