---
title: 'Angular: プライベートフィールドの意味論再考'
published_at: '2026-09-25 07:56'
topics:
  - 'angular'
published: true
source: 'https://app.notion.com/p/Angular-3e53521b014a804c8c2fd56fecda60ed'
type: 'tech'
emoji: '✨'
---

Angular v22.2.0アップデートから、コンポーネントクラスのプライベートフィールドについてテンプレートコンパイラの振る舞いが変更された。この記事では更新内容と、それにより再考しなければならないフィールド宣言の意味論について現在の考えをまとめる。

## 更新内容

Angular v22.2.0アップデートでは、コンポーネントのテンプレート内から`private`修飾子により宣言されたクラスフィールド（メンバ変数）が参照可能になった。

[https://github.com/angular/angular/pull/70188](https://github.com/angular/angular/pull/70188)

具体的には次のようなコードが実行可能になった。コンポーネントが持つ `name` フィールドを補間構文で参照してもコンパイルエラーにならない。

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-greeting',
  template: `<p>Hello, {{ name }}!</p>`,
})
export class GreetingComponent {
  private name = 'Angular';
}
```

制限が緩和されたのは`private`修飾子で宣言されたフィールドだけで、`#`接頭辞を使うECMAScriptのプライベートフィールドはこれまでどおり参照できずコンパイルエラーになる。

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-greeting',
  // Error
  template: `<p>Hello, {{ #name }}!</p>`,
})
export class GreetingComponent {
  #name = 'Angular';
}
```

## 変更の背景

この変更の背景にあるのは、TypeScript 5.5で導入された[`isolatedDeclarations`](https://www.typescriptlang.org/tsconfig/isolatedDeclarations.html)への対応である。`isolatedDeclarations`は各ファイルを型検査なしで独立して型宣言ファイル（`.d.ts`）へ変換できることを保証する。

Angularコンポーネントは通常エクスポートされるクラスなので、その`public`および`protected`メンバーはクラスの外部向け型宣言に含まれる。たとえば、テンプレートから参照するSignalを次のように宣言したとする。

```typescript
export class GreetingComponent {
  protected readonly name = signal('Angular');
}
```

`protected`メンバーは派生クラスからアクセスできるため、クラスの外部向け型の一部である。そのため`isolatedDeclarations`のもとでは、次のように明示的な型注釈が必要になる。

```typescript
export class GreetingComponent {
  protected readonly name: WritableSignal<string> = signal('Angular');
}
```

一方、`private`メンバーはクラスの実装詳細であり、その具体的な型を外部向けAPIとして公開する必要がない。したがって、テンプレート専用のフィールドを`private`にできれば、型宣言ファイルを生成するためだけの冗長な型注釈を避け、TypeScriptの型推論をそのまま利用できる。

```typescript
export class GreetingComponent {
  private readonly name = signal('Angular');
}
```

これまではテンプレートから参照するメンバーを`private`にできなかった。このため開発者は、`isolatedDeclarations`を有効にする場合、テンプレートに公開するフィールドに型注釈を追加するしかなかった。今回の変更はこの開発者体験の悪化への対策である。

## コンポーネントクラスフィールドの意味論

コンポーネントクラスのフィールド宣言を使い分けるには、それぞれのフィールドの種類がどのような意図を持って宣言されるものなのか、その意味論を明確にしておく必要がある。

プロジェクトごとに差はあると思うが、従来の典型的な意味論は次のようになるだろう。従来の仕様では、Angularコンポーネントとしての機能レベルでは`private`修飾子によるプライベートフィールドと、`#`接頭辞によるプライベートフィールドに違いはなかった。そのため、意味論的に区別する必要もなくプロジェクトの中でどちらを使うか方針さえ定めておけば混乱することはなかった。

- `public`: クラスインスタンスとしてアクセスされる経路で公開するAPI
  - プロダクションコードにはあまり出番はない。テストコードで`ComponentFixture`からインスタンスにアクセスする場合には必要だが、Testing Libraryなどを使うDOMテストであれば不要。
- `protected`: コンポーネント内部でのみアクセスされる内部API
  - コンポーネントクラスで継承を使うことはほぼないため、実質的にプライベートフィールドとして機能し、テンプレートからもアクセスできる。**テンプレートバインディング用に宣言するフィールド**は基本的に`protected`でよい。
- `private`: クラスメソッドからのみアクセスされる内部API
  - テンプレートからも参照できないため、**ビューから隠蔽したい依存サービスの注入フィールドや内部状態**に使われる。

総合すると次のようなコンポーネント実装がこれまでの典型例だった。

```typescript
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile-editor',
  template: `
    <input
      #nameInput
      [value]="name()"
      (input)="name.set(nameInput.value)"
    />
    <button (click)="goBack()">戻る</button>
  `,
})
export class ProfileEditorComponent {
  // クラスインスタンスを介して外部から呼び出すためのAPI
  public reset(): void {
    this.name.set('');
  }

  // テンプレートから参照する内部API
  protected readonly name = signal('');

  // クラスのメソッドからのみ参照する実装詳細
  private readonly router = inject(Router);

  protected goBack(): void {
    this.router.navigate(['/profiles']);
  }
}
```

## 新仕様における意味論の提案

今回の変更を前提にすると、テンプレートはコンポーネントクラスの外部ではなく、**クラスとともにコンポーネントの実装を構成するもの**として捉えるのが自然だろう。

この前提では、それぞれの宣言を次のように使い分けられる。

- `public`: クラスインスタンスの利用者に公開するAPI
  - コンポーネントインスタンスを介して外部から直接アクセスする必要がある場合に限って使う。
- `protected`: 派生クラスに公開するAPI
  - 基本的に使わない。継承を前提にしたコンポーネントでのみユースケースがあるが、きわめて稀。
- `private`: コンポーネント内部のAPI
  - クラスとテンプレートの双方から利用できる。テンプレートが参照する状態やメソッドの基本形とする。

この整理では、従来`protected`が担っていた「テンプレート向けの内部API」という役割を`private`へ移すことで、外部向けの型宣言に具体的な型を公開せず、`isolatedDeclarations`のもとでも型推論を活用できる。

一方で、依存サービスや内部状態など、テンプレートから直接参照させたくない実装詳細はどうするのか。この問題への向き合い方として、大きく二つの方針が考えられる。

### 方針1: コンポーネント内の情報隠蔽を維持する

一つは、TypeScriptの`private`とECMAScriptの`#private`を異なる可視性として使い分けるものである。

- `private`: クラスとテンプレートで共有する、コンポーネント内部のAPI
- `#private`: テンプレートからも隠蔽し、クラス本体だけで使う実装詳細

```typescript
@Component({
  selector: 'app-user-list',
  template: `
    @for (user of users.value(); track user.id) {
      <button (click)="selectUser(user.id)">
        {{ user.name }}
      </button>
    }
  `,
})
export class UserListComponent {
  #http = inject(HttpClient);
  #selectedUserId = signal<string | null>(null);

  private readonly users = resource({
    loader: () =>
      firstValueFrom(
        this.#http.get<readonly User[]>('/api/users'),
      ),
  });

  private readonly selection =
    this.#selectedUserId.asReadonly();

  private selectUser(id: string): void {
    this.#selectedUserId.set(id);
  }
}
```

この方針では、コンポーネントの内部に「テンプレートから可視」と「クラス本体だけ」の情報隠蔽を残す。テンプレートには読み取り専用のSignalやResource、意図された操作だけを公開し、変更可能な状態や低水準の依存は`#private`に閉じ込める。従来の`protected`と`private`の意味論を、そのまま`private`と`#private`にシフトして継続する。

この方法の利点は、可視性を言語機能によって強制できることにある。一方で、ひとつのクラス内に二種類のプライベート構文が混在し、単なる記法の違いがAngularテンプレートからの可視性という重要な意味を持つことになる。

### 方針2: コンポーネント内の情報隠蔽を責務分離へ置き換える

私の好みであるもう一つの方針は、テンプレートとクラスはコンポーネントとしてひとつのまとまりだと解釈し、**コンポーネント内部での情報隠蔽は行わない**ことにする。その代わり、テンプレートから隠す必要がある実装詳細はそもそもコンポーネントに持たせないようにする。

今回の変更が許可するのは、テンプレートからコンポーネント自身の`private`フィールドへのアクセスである。ネストしたオブジェクトの`private`フィールドまで公開されるわけではない。この性質を利用し、テンプレートへ公開しない依存・状態・処理などをFacade、ViewModel、Storeなど別のオブジェクトへ移す。

```typescript
@Injectable()
class UserListViewModel {
  private readonly http = inject(HttpClient);
  private readonly selectedUserId = signal<string | null>(null);

  readonly users = resource({
    loader: () =>
      firstValueFrom(
        this.http.get<readonly User[]>('/api/users'),
      ),
  });

  readonly selection = this.selectedUserId.asReadonly();

  selectUser(id: string): void {
    this.selectedUserId.set(id);
  }
}

@Component({
  selector: 'app-user-list',
  providers: [UserListViewModel],
  template: `
    @for (user of vm.users.value(); track user.id) {
      <button (click)="vm.selectUser(user.id)">
        {{ user.name }}
      </button>
    }
  `,
})
export class UserListComponent {
  private readonly vm = inject(UserListViewModel);
}
```

テンプレートから直接見えるのはコンポーネントの`vm`フィールドである。その先で利用できるのは`UserListViewModel`の公開APIだけであり、`http`や`selectedUserId`のような`private`メンバーにはアクセスできない。

この方針では、コンポーネントのクラスはテンプレートと外部オブジェクトを統合する責務に集中し、情報隠蔽が必要な実装は別のオブジェクトへ移す。

### 二つの方針

二つの提案で根本的に異なるのは、**コンポーネントの内側にさらに情報隠蔽の境界を設けるか**どうかである。クラスとテンプレートが異なるコンテキストを持つと考えるか、同一のコンテキストを共有するものだと考えるかで、プライベートフィールドの意味論が変わってくる。

|  | フィールド可視性による情報隠蔽 | オブジェクトによる情報隠蔽 |
| ------- | ------- | ------- |
| コンポーネント内の可視性 | `private`と`#private`で二段階に分ける | メンバーはすべてテンプレートに公開する |
| 実装詳細の置き場所 | 同じコンポーネントクラス | ViewModel、Facade、Storeなど別オブジェクト |
| 強制する仕組み | 言語機能 | オブジェクト境界 |
| 長所 | 追加の抽象化が少なく、ツールサポートが完全 | private構文を混在させない |
| 短所 | 二種類のprivate構文が混在する | 責務分離の手間。小さなコンポーネントでは過剰設計になりうる |

他にもアプローチはあるかもしれないが、意味論的にはこの二つのどちらかの派生形になるだろう。あるいは、何も考えずにすべてをテンプレートに公開するのもそのプロジェクトがそう決めるなら問題ではない。重要なのは意図と一貫性だ。

