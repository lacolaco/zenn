---
title: 'Angular v22: injectAsync でビジネスロジックを遅延読み込みする'
published_at: '2026-06-22 08:49'
topics:
  - 'angular'
  - 'typescript'
  - 'dependency injection'
published: true
source: 'https://app.notion.com/p/Angular-v22-injectAsync-3813521b014a80c7aad1d3778117c09c'
type: 'tech'
emoji: '✨'
---

Angular v22で追加された`injectAsync`関数は、読み込み速度改善のための新たな選択肢を提供するものだ。これまでに存在した遅延読み込みAPIをおさらいしつつ、新しいAPIを紹介する。

https://angular.jp/guide/di/lazy-loading-services

## `injectAsync` 

依存性の注入に使う`inject`関数は、注入する対象に対して静的な参照を作る。そのため、依存する側が初期ロードJSに含まれる場合は、依存される側も同様にバンドルサイズを増やすことになる。次の例では、`ReportView`コンポーネントと`ReportExporter`サービスは静的に結合しており、読み込みタイミングを分けることはできない。

```typescript
// 静的インポート
import { ReportExporter } from './exporter';

@Component({...})
export class ReportView {
  // ReportView は ReportExporter を静的に参照する
  exporter = inject(ReportExporter);
  
  export() {
    this.exporter.export();
  }
}
```

`ReportExporter`が常に使われる機能ではなければ、`ReportView`だけ初期読み込みに残し、`ReportExporter`はエクスポートボタンを押されたときに初めて読み込まれるよう遅延させたい。それを実現するのが`injectAsync`だ。この関数は、特定のサービスの注入を非同期化し、バンドルを分割してモジュールを遅延読み込み可能にする。

次の例のように、`ReportExporter`サービスの参照を静的インポートから`injectAsync`関数の引数での動的インポートに置き換える。こうすることで、`this.exporter`フィールドは呼び出すことでサービスの参照を非同期的に返す関数になる。戻り値を`await`すれば元と同じようにサービスを利用できる。

```typescript
@Component({...})
export class ReportView {
  // 動的インポート
  // ReportView は ReportExporter を動的に参照する
  exporter = injectAsync(() => import('./exporter').then(m => m.ReportExporter));
  
  async export() {
    const exporter = await this.exporter();
    exporter.export();
  }
}
```

### 利用上の制約

`injectAsync`が使えるのは、`@Injectable({ providedIn: 'root' })` か、`@Service()` デコレータで宣言されたサービスだけだ。モジュールの読み込みに応じて動的に依存性の注入システムに組み込まれる都合上、複雑なプロバイダー定義には対応していない。

## 遅延読み込みの方法とユースケース

上述の例のように、アプリケーションが提供する機能のうち、一部分を利用する頻度が低い場合は、その機能を使わないユーザーの体験を損なわないために遅延読み込みを検討する価値がある。Angularはいくつかの遅延読み込みAPIを提供するが、その使い分けはアプリケーションの機能をどの粒度、どの境界で区切れるかというアプリケーションドメインに依存するものになる。

### ルートによる遅延読み込み

もっとも大きな粒度での遅延読み込みは、Routerのページ読み込み単位（ルート）でバンドルを分割する方法だ。ルートの親子関係を使って、あるパス以下のページをまとめて遅延読み込みさせたいときには `loadChildren` を、特定のルートを遅延読み込みさせたいときには `loadComponent` を使うことができる。

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    // ログインページを遅延読み込み
    loadComponent: () => import('./components/auth/login-page'),
  },
  {
    path: 'admin',
    // 管理者用ページ群を遅延読み込み
    loadComponent: () => import('./admin/admin.component'),
    loadChildren: () => import('./admin/admin.routes'),
  },
];
```

ユーザーの権限の違いなどでアクセスできるページがきれいに分断されているようなケースでは、ルートによる遅延読み込みの導入は効果を発揮するだろう。

https://angular.jp/best-practices/performance/lazy-loaded-routes

### 部分ビューの遅延読み込み

`@defer` ブロックを使い、コンポーネントビューの一部分を遅延読み込み可能にできる。その領域が画面内に入ったときや、何かユーザーがアクションを行ったときに初めてビューを読み込んで初期化する。

```typescript
@defer {
  <large-component />
} @placeholder {
  <p>プレースホルダーコンテンツ</p>
}
```

これはコンポーネントの子孫ビューの中で、特定のコンポーネントがバンドルサイズに与える影響が大きく、なおかつその表示速度がミッションクリティカルじゃないときに選択できる。たとえばカレンダーウィジェットや、複雑なフォームなどが考えられる。ファーストビューに含まれないブログ記事のコメント欄などもまさに適用対象だろう。

機能の利用頻度、利用タイミングが画面領域によってズレるようなケースで、`@defer`によるビューの遅延読み込みは有効に働くだろう。

https://angular.jp/best-practices/performance/defer

### サービスの遅延読み込み

ビューではなくロジックについて、一部が遅延可能なときに選択するのが今回紹介した`injectAsync`だ。サードパーティの大きなライブラリを利用するようなロジックが、初期読み込みには必要無く、必要になったときに読み込みをトリガーできるのであれば、`injectAsync`の出番だ。

https://angular.jp/best-practices/performance/lazy-loading-services

### モジュールの遅延読み込み

最後に、AngularのAPIではないので忘れがちな方法だが、シンプルにES Moduleの動的インポート `import(...)` を使うだけでもモジュール単位での遅延読み込みは実現できる。Angular CLIのビルドの中で、動的インポートは遅延読み込みに変換されているためだ。読み込む対象がただの関数やクラス、定数などであれば、Angularの依存性の注入やコンポーネントシステムと関係しないため、素の動的インポートを使うだけでいい。

特定のユースケースでだけ使うライブラリなど、それを利用するサービス単位で分割してもいいし、サービスは静的に参照したうえで、その内部でモジュール単位の分割をしてもいい。これは実装の好みで決めればいいだろう。非同期処理の責務がサービスの外に置かれるか、サービスの中に置かれるかの違いだけだ。個人的には、`injectAsync` でカバーできるならそれでいいが、複雑なDIプロバイダーの定義が必要な場合に適宜モジュール単位の遅延読み込みを組み合わせるのがいいのではないかと思う。

## まとめ

- `injectAsync` は、DIの参照を動的インポートに置き換えることで、サービス単位でのバンドル分割と遅延読み込みを可能にする。
- 対象は `@Injectable({ providedIn: 'root' })` または `@Service()` で宣言されたサービスに限られ、複雑なプロバイダー定義には対応しない。
- Angularが提供する遅延読み込みの方法と分割単位
  - ルート: `loadChildren` / `loadComponent`
  - 部分ビュー: `@defer`
  - サービス: `injectAsync`
  - それ以外のモジュール: `import(...)`

