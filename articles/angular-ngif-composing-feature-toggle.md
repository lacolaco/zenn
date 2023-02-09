---
title: 'Angular: NgIfを合成したフィーチャートグルディレクティブ'
published_at: '2023-02-07'
topics:
  - 'angular'
published: true
source: 'https://www.notion.so/Angular-NgIf-c30c4744b39047558495a126d32ad0d9'
type: 'tech'
emoji: '✨'
---

Angular の組み込みディレクティブ `NgIf` を使って、ある条件を満たすときにだけビューの一部分を描画するケースは多い。たとえば、特定の権限を持つユーザーにだけ表示されるビューを実装することがある。 `NgIf` を直接使う場合には、その条件ロジックをテンプレートあるいはコンポーネントで持つことになる。一箇所だけならよいが、同じようなロジックを多用するならそのロジックを含めて再利用可能にしたい。

今回はそのようなフィーチャートグルのユースケースを Angular v15 で導入された `hostDirectives` 機能を使って実装してみよう。

サンプルは StackBlitz に用意した。以下、要点をかいつまんで解説するが、あくまでも概念実証的なサンプルコードなので**くれぐれもこのままプロダクションコードなどに転記しないように**。

@[stackblitz](https://stackblitz.com/edit/angular-ivy-nacplk?ctl=1&embed=1&file=src/app/app.component.html)

次のコードで、`AuthDirective` に `NgIf` ディレクティブを合成している。合成とはどういうことか。そのディレクティブがテンプレートで使用されるとき、あたかも合成されたディレクティブも同じ位置に使用されているかのように振る舞う、ということである。

```typescript
@Directive({
  selector: '[appIfHasPermissions]',
  standalone: true,
  hostDirectives: [NgIf],
})
export class AuthDirective implements OnInit, OnDestroy {
  private readonly ngIfDirective = inject(NgIf);
```

この場合、 `AuthDirective` が使用されるとき、ディレクティブが付与された要素に `NgIf` ディレクティブも同時に付与されているように振る舞う。そのため、 `AuthDirective` は同じ要素上に同居するディレクティブのインスタンスを `inject()` 関数によって（もちろんコンストラクタでもよい）参照できる。

あとは表示する条件を満たしたときに `NgIf` ディレクティブの `ngIf` プロパティが `true` になるようロジックを実装すればよい。

```typescript
combineLatest([this.authService.user$, this._permissions]).subscribe(
  ([user, requiredPermissions]) => {
    const permitted = requiredPermissions.every((p) =>
      user.permissions.includes(p),
    );
    this.ngIfDirective.ngIf = permitted;
  },
);
```

このように `NgIf` と条件ロジックを合成したディレクティブを再利用可能にすることで、ディレクティブを使う側の責務は減ってコンポーネントが簡素になり、より宣言的なテンプレートに仕上がる。そして DOM 要素の生成・破棄のロジックは Angular の組み込みディレクティブに委譲しており、アプリケーションのユースケース的な関心だけを自前実装することができた。

```html
<div *appIfHasPermissions="[]">no permissions</div>
<div *appIfHasPermissions="['read-all']">read-all</div>
<div *appIfHasPermissions="['read-all', 'write-all']">read-all, write-all</div>
```

`NgIf` に限らず、Angular の組み込みディレクティブを `hostDirectives` を使って自作ディレクティブに合成して実装量を減らし、クオリティが保証された DOM 操作実装に乗っかることが簡単になった。つまり、**UI ライブラリ的な関心事だけを実装したディレクティブ**と、**アプリケーション的な関心事をそれに上乗せするディレクティブ**とを分けて実装し、再利用やテストがしやすいモジュール化を実現しやすくなったということだ。ぜひさまざまな場面でこの新機能を活用してほしい。
