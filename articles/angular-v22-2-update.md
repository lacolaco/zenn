---
title: 'Angular v22.2アップデートのまとめ'
published_at: '2026-10-03 11:39'
topics:
  - 'angular'
  - 'angular cli'
  - 'angular material'
  - 'signals'
  - 'angular update'
published: true
source: 'https://app.notion.com/p/Angular-v22-2-3de3521b014a80f5991afe2520dc8cd1'
type: 'tech'
emoji: '✨'
---

Angular v22.2.0がリリースされた。マンスリーのマイナーアップデートなので機能追加もいろいろと行われている。内容を確認しておこう。重要なものに絞っているので全部知りたい場合は公式のCHANGELOGに当たってほしい。

## angular/angular

フレームワークの主な変更点は以下。

https://github.com/angular/angular/blob/main/CHANGELOG.md#2220

### テンプレートからプライベートメンバへのアクセス許可

https://github.com/angular/angular/commit/48a0fd6e8a8d14bdc1d901ee5615f4b0ab698fe8

コンポーネントのテンプレートHTMLからクラスのプライベートメンバを参照できるようになった。この件の背景や影響についてはすでに別記事で書いたのでそちらを読んでほしい。

https://blog.lacolaco.net/posts/angular-private-fields

### `strictUnclaimedEventNames`の追加

https://github.com/angular/angular/commit/312e1d808902116fb8cd4e02d936260113453999

テンプレート内でのイベントバインディング`(eventName)`が、対象のDOM要素が持つイベントか、ディレクティブのアウトプットと一致することを強制するコンパイルフラグが追加された。まだこれはオプトインで、`strictTemplates`にも含まれていないため個別に設定が必要。

```html
<!-- error -->
<button (unknownEvent)="...">
```

### `@Component.deferredImports`の追加

https://github.com/angular/angular/commit/7d9f55da11319da8f273d9edcd38ff2983bdbb0c

`@Component.deferredImports`で特定の名前付き`@defer`ブロックに紐づけたコンポーネント・ディレクティブ・パイプについて、指定したブロック内でのみ使われていることをテンプレートの型チェックで検証するようになった。`@defer`の外や、別の名前のブロック内で使うとコンパイルエラーになる。

```typescript
@Component({
  deferredImports: {
    blockA: [CmpA],
    blockB: [CmpB],
  },
  template: `
    @defer (name blockA) {
      <!-- error: CmpB（selector: 'cmp-b'）はblockB用の依存 -->
      <cmp-b />
    }
  `,
})
export class App {}
```

### ErrorBoundary機能の追加

https://github.com/angular/angular/commit/f6afb807c1e62d26b8b665f2b4a9a52c2433a673

https://github.com/angular/angular/commit/f4a5650ed9c71a8ee1dbd3003e13900464827757

https://github.com/angular/angular/pull/70463

テンプレート内で描画エラーを捕捉する`@boundary`ブロックが追加された。ブロック内の描画に失敗すると`@error`ブロックに切り替わるため、画面の一部のエラーをその範囲内で扱える。`@error`では`$error`でエラーを参照でき、`$reset()`でエラー状態を解除して再描画を試せる。

```html
@boundary {
  <complex-chart [data]="data" />
} @error {
  <p>チャートの描画に失敗した: {{ $error.message }}</p>
  <button (click)="$reset()">再試行</button>
}
```

`ErrorHandler`にも`onViewError`フックが追加され、描画エラーの詳細を受け取れるようになった。あわせてAngular Language Serviceも`@boundary`と`@error`に対応し、入力補完やホバー、定義への移動、ブロックの折りたたみなどで新しい構文を扱えるようになっている。

### ディレクティブ用のテストユーティリティ追加

https://github.com/angular/angular/commit/05c4d5a8354228100b51176f295ed5dee4f3febc

`TestBed.createDirective`が追加され、テスト用のホストコンポーネントを自分で定義せずにディレクティブをテストできるようになった。戻り値の`DirectiveFixture`から`directiveInstance`でディレクティブ本体、`nativeElement`でホスト要素を参照でき、`detectChanges()`で変更検知を実行できる。

`bindings`には`inputBinding`や`outputBinding`を指定できる。属性セレクタだけのディレクティブではホスト要素のタグ名を推測できないため、`tagName`も指定する。

```typescript
import { Directive, input, inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

@Directive({
  selector: '[active]',
  host: { '[class.active]': 'active()' },
})
class ActiveDirective {
  active = input(false);
}

it('入力に応じてホスト要素のクラスを切り替える', () => {
  const active = signal(true);
  const fixture = TestBed.createDirective(ActiveDirective, {
    tagName: 'div',
    bindings: [inputBinding('active', active)],
  });
  fixture.detectChanges();
  expect(fixture.nativeElement.classList.contains('active')).toBe(true);

  active.set(false);
  fixture.detectChanges();
  expect(fixture.nativeElement.classList.contains('active')).toBe(false);
});
```

### ビュー・コンテンツクエリでの`Injector`取得

https://github.com/angular/angular/commit/bd9b45b5cc1dd904cc4a5de45f6de8e1564b70b6

ビュークエリやコンテンツクエリの`read`オプションに`Injector`を指定できるようになった。取得できるのはクエリで見つかった要素のノードインジェクタで、その要素の位置から見えるプロバイダを解決できる。

```typescript
import { Component, Directive, InjectionToken, Injector, viewChild } from '@angular/core';

const TOKEN = new InjectionToken<string>('TOKEN');

@Directive({
  selector: '[localProvider]',
  providers: [{ provide: TOKEN, useValue: '要素内の値' }],
})
class LocalProviderDirective {}

@Component({
  imports: [LocalProviderDirective],
  template: '<div #target localProvider></div>',
})
class AppComponent {
  targetInjector = viewChild.required('target', { read: Injector });

  ngAfterViewInit() {
    console.log(this.targetInjector().get(TOKEN)); // '要素内の値'
  }
}
```

### Signal Formsで非表示固定のフィールドを指定

https://github.com/angular/angular/commit/d5e8b1ef7a02c84d4fd70a6b4d748ead9ff815bf

Signal Formsの`hidden`ルールで、条件を省略できるようになった。これまでは常に非表示にしたい場合も`{ when: () => true }`を指定する必要があったが、`hidden(path)`だけで書けるようになる。対象のフィールドは常に`hidden()`が`true`になり、バリデーションの対象からも外れる。

```typescript
import { Component, signal } from '@angular/core';
import { form, FormField, hidden } from '@angular/forms/signals';

@Component({
  imports: [FormField],
  template: `
    @if (!profileForm.publicUrl().hidden()) {
      <input [formField]="profileForm.publicUrl" />
    }
  `,
})
class ProfileComponent {
  profileModel = signal({ publicUrl: '' });
  profileForm = form(this.profileModel, (path) => {
    hidden(path.publicUrl);
  });
}
```

`hidden`はフォームデータ上のフィールドの状態を指定するルールで、DOMを自動的に非表示にするものではない。表示の切り替えは上の例のようにテンプレート側で`hidden()`を参照する。

### `containsTree`APIの公開

https://github.com/angular/angular/commit/2720362818cdeb2a940171e4ab6f21cf78c6a302

ルーター内部で使われていた`containsTree`が`@angular/router`の公開APIになった。2つの`UrlTree`を渡して、一方がもう一方に含まれるかを判定できる。現在のURLとの比較に限らず、任意のURL同士を比較する用途で使える。

```typescript
import { containsTree, DefaultUrlSerializer } from '@angular/router';

const serializer = new DefaultUrlSerializer();
const container = serializer.parse('/products/42?category=books&page=2');
const target = serializer.parse('/products?category=books');

containsTree(container, target);                     // true
containsTree(container, target, { paths: 'exact' });  // false
containsTree(container, target, { queryParams: 'exact' }); // false
```

### `RedirectCommand`のthrowによるリダイレクト

https://github.com/angular/angular/commit/b65dea4f03e5fc01093a718c990c72ae9165c43f

ガードやリゾルバから`RedirectCommand`を`throw`してリダイレクトできるようになった。`RedirectCommand`は`Error`を継承するようになり、ルーターは投げられたコマンドを通常のナビゲーションエラーではなくリダイレクトとして扱う。

これまではリダイレクトの指示を戻り値として返す必要があったが、ネストしたヘルパー関数からも`throw`で処理を中断できる。呼び出し元まで`RedirectCommand`を返して伝播させる必要がなくなり、ヘルパーの戻り値の型にリダイレクト用の型を混ぜずに済む。

```typescript
import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';

function requireId(id: string | null): string {
  if (id === null) {
    throw new RedirectCommand(inject(Router).parseUrl('/not-found'));
  }
  return id;
}

export const idResolver: ResolveFn<string> = (route) => {
  return requireId(route.paramMap.get('id'));
};
```

### Router Resources APIの公開

https://github.com/angular/angular/commit/3064f3f1dccd78177bf3b86f8ea231102884f0d7

ルート単位のデータ取得をResource APIで扱う**Router Resources**が公開APIになった。`withRouterResources()`で有効にし、ルートの`resources`にデータ取得処理を定義できる。ルート間での並列読み込みや、画面遷移をブロックしないデータ取得、再ナビゲーションなしでのデータ再取得に対応している。

使い方や従来のリゾルバとの違いについては、後日別の記事で詳しく書く予定。

### ルート別インジェクタ自動破棄機能の安定化

https://github.com/angular/angular/commit/7137a41223079b4b172aeccb5031347fcc947b79

使われなくなったルートのインジェクタを自動的に破棄する機能が安定版になり、`withAutoCleanupInjectors()`として利用できるようになった。従来の`withExperimentalAutoCleanupInjectors()`は非推奨になった。

通常、ルートのインジェクタとそこで提供されるサービスは、別の画面に遷移しても保持される。この機能を有効にすると、ナビゲーション完了後に使用中のルートと再利用のために保存されたルートを確認し、不要になったインジェクタを破棄する。サービスの`ngOnDestroy`や`DestroyRef`に登録した後処理も実行される。

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withAutoCleanupInjectors } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withAutoCleanupInjectors())],
};
```

### CSSネイティブネスト構文のカプセル化対応

https://github.com/angular/angular/commit/d0d7f57e0810a24ba16dbb1f2ab9f079a096fa3d

CSSネイティブのネスト構文を、`ViewEncapsulation.Emulated`のスタイルカプセル化で正しく扱うようになった。ネストした子セレクタにもコンポーネントのスコープ用属性を付けるようになり、親セレクタを参照する`&`も扱える。

```css
.card {
  .title {
    color: red;
  }

  &:hover {
    background: lightgray;
  }
}
```

### `animate.enter`・`animate.leave`への関数・Signalのバインディング

https://github.com/angular/angular/commit/de5889ec4fab2b337e394eb994c8d428272d5ec9

`[animate.enter]`と`[animate.leave]`に、クラス名を返す関数やSignalを直接渡した場合にアニメーションが実行されない不具合が修正された。これまでは`enterClass()`のようにテンプレート側で呼び出す必要があったが、`enterClass`のように参照を渡してもクラス名を取得できるようになる。

```typescript
import { Component, signal } from '@angular/core';

@Component({
  template: `
    <button (click)="show.set(!show())">切り替え</button>
    @if (show()) {
      <div [animate.enter]="enterClass" [animate.leave]="leaveClass">
        Hello
      </div>
    }
  `,
})
class Example {
  show = signal(true);
  enterClass = signal('fade-in');
  leaveClass = () => 'fade-out';
}
```

## angular/angular-cli

Angular CLIの主な変更は以下。

https://github.com/angular/angular-cli/blob/main/CHANGELOG.md#2220

### MCPサーバーのルートディレクトリ指定

https://github.com/angular/angular-cli/commit/41555dfb3b71d08cdfe2853bf2cbeca5b6942f67

`ng mcp`に`--root`オプションが追加された。MCPサーバーがファイルアクセスを許可する範囲と、Angularワークスペースを探索する起点を、起動時に明示できる。`--root`は複数指定できるため、複数のワークスペースを扱う場合や、ワークスペースの外からサーバーを起動する場合にも使える。

```bash
ng mcp --root /path/to/app-a --root /path/to/app-b
```

MCPクライアントが`listRoots()`でルートを提供する場合は、そちらが優先される。クライアントが対応していない場合や空のリストを返す場合は`--root`の指定が使われ、どちらもなければカレントディレクトリが使われる。

### テスト対象に合わせたコンパイル範囲の絞り込み

https://github.com/angular/angular-cli/commit/f47f77f5f6db5cda1493652f813c98c26f172ea9

`@angular/build:unit-test`のVitest実行で、`--include`で指定していないテストファイルの型エラーによってテストが失敗する不具合が修正された。これまでは実行するテストを絞っても、`tsconfig`に含まれるすべてのテストファイルがコンパイルされていた。

```bash
ng test --include='src/app/services/test.service.spec.ts'
```

### ファイル監視のネイティブ実装への移行

https://github.com/angular/angular-cli/commit/a6ef9cfbeace725d58c0f7f65640ef6de9b39c33

`@angular/build`のファイル監視が、`watchpack`から`@parcel/watcher`を中心とした実装に置き換わった。C++のネイティブバインディングを通じてOSのファイル監視APIを利用し、watchモードでのCPU・メモリ使用量を削減する。ポーリングを使う場合やネイティブ監視が利用できない環境では、`chokidar`にフォールバックする。

### Sassコンパイラのネイティブ実装への移行

https://github.com/angular/angular-cli/commit/ecbcd87b8857225e4df3df7896b3236d63553f23

`@angular/build`のSassコンパイルが、JavaScript版のDart Sassをワーカースレッドで実行する方式から、`sass-embedded`を使う方式に移行した。DartのAOTコンパイル済みバイナリを別プロセスとして起動し、標準入出力を通じて非同期にコンパイルを依頼する。コンパイラのプロセスは複数のコンパイルで使い回される。

ベンチマークでは、以下の改善が報告されている。

- Sass処理単体では、コンパイラ起動後のコンパイル時間の中央値で約1.3〜4.3倍、差分コンパイルで約2〜3倍の高速化。
- `ng build`全体の実時間では、Sassファイル5つの小規模アプリで約8〜14%短縮。500ファイルの大規模アプリでは初回はほぼ同等で、2回目以降のビルドは約2〜3%短縮。
- `ng build`のピークメモリ使用量は、**小規模アプリで約14〜29%、大規模アプリで約31〜33%削減**。

計測例では、大規模アプリは時間短縮よりメモリ削減の効果が大きい。

### SSRのCritical CSS処理の事前コンパイル

https://github.com/angular/angular-cli/commit/23e3d44a7f051cd3bb67700b8d8407f73b7aa7f3

`@angular/ssr`のCritical CSSインライン化で、スタイルシートの解析をビルド時に行うようになった。Critical CSSは、描画に必要なCSSをHTML内に埋め込み、外部スタイルシートの読み込みを待たずに表示できるようにする処理。これまではリクエスト処理中にHTMLとCSSを解析していたが、CSSから処理用の「プラン」を事前に生成し、サーバーのマニフェストに含める方式に変わった。リクエストごとにCSSを解析する負担が減り、SSRのCPU使用量や応答までの待ち時間を大幅に削減する。

## angular/components

Angular CDKやAria、Materialなどの主な変更点は以下。

https://github.com/angular/components/blob/main/CHANGELOG.md#2220

### Material Symbolsの自動判別

https://github.com/angular/components/commit/5d64e397b47e722e6ec8cd9eed69cd032766f656

`mat-icon`が、読み込まれているMaterial Symbolsのフォントを判別して、対応するCSSクラスを自動的に付けるようになった。これまではデフォルトで旧Material Icons用の`material-icons`クラスが付いていたが、Material Symbolsだけが読み込まれている場合は、Outlined・Rounded・Sharpに応じた`material-symbols-*`クラスが使われる。

```html
<!-- index.htmlでフォントを読み込む -->
<link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" />

<!-- テンプレートではfontSetの指定が不要 -->
<mat-icon>home</mat-icon>
```

上の例では`material-symbols-outlined`クラスが自動的に付与される。フォント自体を自動で読み込む機能ではないので、フォントの読み込みは別途必要。旧Material IconsとMaterial Symbolsの両方が読み込まれている場合は、互換性のため従来の`material-icons`が優先される。

### `MatMenuItem`の`disabledInteractive` サポート

https://github.com/angular/components/commit/cacab5551ba8a4af365b0e99132ef21e87c3b3f5

`MatMenuItem`に`disabledInteractive`入力が追加された。`disabled`と併用すると、無効な見た目を維持したままフォーカスやホバーを受け付けるようになる。キーボードでの項目移動でもフォーカスできるため、操作できない理由をツールチップで説明する用途などに使える。

```html
<button [matMenuTriggerFor]="menu">操作</button>

<mat-menu #menu="matMenu">
  <button mat-menu-item disabled [disabledInteractive]="true"
          matTooltip="この操作には管理者権限が必要">
    削除
  </button>
</mat-menu>
```

通常の`disabled`と異なり、ネイティブの`disabled`属性は付かず、`aria-disabled`で無効状態を伝える。

### Angular Aria: `MenuItem`の`value`省略対応

https://github.com/angular/components/commit/cd9c7da8b6caf503cf1c0b1de1e7e861077abefb

`@angular/aria/menu`の`MenuItem`で、`value`入力を省略できるようになった。これまでは各項目の`(click)`で処理を実行する場合も`value`が必須だったが、値を使わないメニュー項目にダミーの値を付ける必要がなくなる。値を省略した項目が複数あっても、値の重複を知らせる警告は出ない。

```html
<div ngMenu>
  <button ngMenuItem (click)="newFile()">新規作成</button>
  <button ngMenuItem (click)="openFile()">開く</button>
</div>
```

### `MatFormFieldControl`のSignal Forms対応

https://github.com/angular/components/commit/42c72bf2ebb0a8ba0b38c5614814385b25df43e9

`MatFormFieldControl`が、Signal Formsを使うカスタムコントロールを扱えるようになった。`ngField`プロパティでフォームフィールドを公開すると、`mat-form-field`が`valid`や`dirty`などの状態を読み取り、対応するCSSクラスに反映する。

`MatFormFieldControl`として提供するクラスに`ngField`を追加することで、Signal Formsとの連携ができる。

```typescript
import { Component, forwardRef, inject } from '@angular/core';
import { FORM_FIELD, FormField } from '@angular/forms/signals';
import { MatFormFieldControl } from '@angular/material/form-field';

@Component({
  selector: 'app-custom-name-input',
  templateUrl: './custom-input.html',
  providers: [{
    provide: MatFormFieldControl,
    useExisting: forwardRef(() => CustomNameInput),
  }],
})
export class CustomNameInput {
  // Signal Formsとの連携部分
  readonly ngField: FormField<string> | null =
    inject(FORM_FIELD, {optional: true, self: true}) as FormField<string> | null;
}
```

フォームを使う側は、通常どおり`[formField]`でフィールドを渡して`mat-form-field`内に配置する。このSignal Formsのディレクティブをコントロール内の`inject(FORM_FIELD)`が取得する。

```html
<mat-form-field>
  <mat-label>名前</mat-label>
  <app-custom-name-input [formField]="profileForm.name" />
</mat-form-field>
```

従来は`ngControl`を通じてAngular Formsの状態を参照していたが、`ngField`がある場合はそちらを優先してSignal Formsの状態を参照する。

