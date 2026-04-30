---
title: 'Angular v22: ChangeDetectionStrategy.Eager の導入とOnPush By Default'
published_at: '2026-04-22 23:43'
topics:
  - 'angular'
  - 'signals'
  - 'angular cli'
published: true
source: 'https://app.notion.com/p/Angular-v22-ChangeDetectionStrategy-Eager-OnPush-By-Default-34a3521b014a808f9211c3a1b715c44d'
type: 'tech'
emoji: '✨'
---

Angular v21.2では、コンポーネントの変更検知戦略の選択肢として `ChangeDetectionStrategy.Eager` が新たに追加された。とはいえ、これは今までの `ChangeDetectionStrategy.Default` とまったく同じ挙動であり、エイリアスが追加されただけだ。

https://github.com/angular/angular/pull/66830

v21時点での変更検知戦略は`Eager` (= `Default`)と `OnPush`が選択できるが、**v22ではついに**`OnPush`**がデフォルトとなる**。既存プロジェクトの移行パスについても計画が見えているので解説しておく。

## Default-to-Eager Migration

https://github.com/angular/angular/commit/cb4cb77053a817fe800af6395783720761e29ada

Angular v22への`ng update`マイグレーションによって、変更検知戦略が無指定、あるいは`Default`を指定しているコンポーネントでは、自動的に`Eager`に書き換えられる。これにより、既存プロジェクトでは従来通りの変更検知でアプリケーションが動作するため、破壊的な変更は起こらない。

## OnPush By Default

https://github.com/angular/angular-cli/commit/6572a69443356ff0022e6ce162915125fee0e3bb

https://github.com/angular/angular/commit/eae8f7e30b9f8bebdcdb535bd86260199c34274b

v22から、`ng new`や`ng generate`で生成されるコンポーネントの変更検知戦略がデフォルトで`OnPush`となる。もちろん設定ファイルで明示的にコンポーネントの生成オプションを `changeDetection: Eager` としていればそちらが適用されるが、そうでない場合は新規コードが何もしなくてもOnPushモードで動作することになる。

## Eager-to-OnPush Migration?

今のところ、`Eager`モードの廃止についての議論はない。`OnPush`のほうがパフォーマンスの優位性はあるが、焦って既存コードを移行する必要はないだろう。移行を進めるにあたっては、先にコンポーネントの内部状態をSignalに移行するとうまくいきやすい。`OnPush`にしてコンポーネントが動かなくなる一番の要因は、コンポーネントのクラスフィールドを内部で書き換えているケースだが、フィールドが`Signal`になっていればテンプレートが自動的に`Signal`の変更を購読してくれる。

```diff
@Component({
  template: `
-   <div>{{ userData?.name }}</div>
+   <div>{{ userData()?.name }}</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Component {
   private userService = inject(UserService);

-  userData?: UserData | undefined;
+  readonly userData = signal<UserData | undefined>(undefined);

loadUserData() {
    this.userService.getUserData().then((data) => {
-      this.userData = data;
+      this.userData.set(data);
    });
  }
}
```

そもそもなぜAngularチームが`OnPush`をこれまで以上に推進したいのかというと、既存プロジェクトのZoneless化を促したいからだ。Zone.jsへの依存を剥がすためには`OnPush`化が推奨される。必須ではないが、完全に`OnPush`で動いているならZone.jsは必要ないと保証できる。逆に言えば、`Eager`モードで動いているコンポーネントがある場合は、Zone.jsへの依存の可能性が捨てきれない。

Angular MCP Serverでも `onpush_zoneless_migration` というツールを提供し、AIエージェントによる`OnPush`移行とZoneless化を支援している。

https://angular.jp/guide/zoneless

https://angular.dev/ai/mcp

既存コードがそのままで動くとはいえ、今後のAngularエコシステムは「もう`OnPush`がデフォルトだよね」という空気で発展していくはずだ。その恩恵を漏らさず受け取りたいならば、やはり`OnPush`移行、Zoneless移行は避けて通れない道だろう。

## まとめ

- Angular v22 では `ChangeDetectionStrategy.Eager` が `Default` の後継として扱われる
- 既存コードは `ng update` で `Default` / 無指定のコンポーネントが自動的に `Eager` に移行され、振る舞いが保たれる
- 新規作成されるコンポーネントは `OnPush` がデフォルトになる
- すぐに既存の `Eager` を移行する必要はないが、今後は `OnPush` 前提のエコシステムに変化していくだろう

