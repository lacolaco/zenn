---
title: 'SignalベースのAngularコンポーネント設計パターン'
published_at: '2023-06-03 09:00'
topics:
  - 'tech'
  - 'Angular'
  - '状態管理'
  - 'Signals'
  - '設計'
published: true
source: 'https://www.notion.so/Signal-Angular-c0a2a3172b8f47ef821d9ef5e602c5f9'
type: 'tech'
emoji: '✨'
---

この記事では Angular v16 で導入された Signals を前提としたコンポーネント設計のパターンをいくつかまとめる。単純な責任を持つコンポーネントからはじめ、だんだんと複雑な責任に関わるコンポーネントに発展させていく。ちょうど一年前に書いた Angular アプリケーションの状態管理パターンについての記事の、Signals による改訂版にもなっている。

https://blog.lacolaco.net/2022/05/angular-state-management-patterns/

なお、この記事中での各コンポーネント実装パターンの名称は特に定まったものではなく、この記事中での参照の一貫性のためだけに名付けている。あまり名称にこだわらずに読んでほしいし、もし参考にして実装しようとする際には、アプリケーションに適した命名を各自であらためて検討してほしい。

また、この記事のサンプルコードは Angular v16.0 時点での API に準拠している。

## 1. ステートレスコンポーネント

もっとも基本的なパターンである **ステートレスコンポーネント** は、あらゆる振る舞いを親コンポーネントからのインプットに依存し、親コンポーネントへのアウトプットによってアプリケーションに作用するものだ。

```html
<div>
  <button (click)="increment.emit()">+</button>
  <button (click)="decrement.emit()">-</button>
  <button (click)="reset.emit()">reset</button>
</div>
<p>Count: {{ count }}</p>
```

```typescript
@Component({
  selector: 'app-stateless-counter',
  templateUrl: './stateless.component.html',
  styleUrls: ['./stateless.component.css'],
})
export class StatelessCounterComponent {
  @Input() count = 0;

  @Output() increment = new EventEmitter<void>();
  @Output() decrement = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
}
```

### このパターンの特徴

- コンポーネント内部に状態を持たない
- 依存するものも副作用もなく、再利用性がきわめて高い
- 入力によってのみ振る舞いが変わるためユニットテストを書きやすい

### このパターンのユースケース例

- ほとんどの UI 構築を目的としたコンポーネント

## 2. ステートフルコンポーネント

次にの**ステートフルコンポーネント**は、自身の振る舞いを左右する状態を自身で保持し、管理するものだ。ステートフルコンポーネントは多くの場合、ステートレスコンポーネントにインプットを与え、アウトプットを受け取って状態を更新することになるが、必ずしもそうでなくてもよい。しかし、あくまでも自律した振る舞いは自身の内部に閉じており、それ以外の副作用は持たない。

Angular Signals によってリアクティブな状態管理を RxJS や Observable、外部ライブラリなどを使わずに実現できるようになった。

```html
<app-stateless-counter
  [count]="count()"
  (increment)="increment()"
  (decrement)="decrement()"
  (reset)="reset()"
/>
```

```typescript
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { StatelessCounterComponent } from '../stateless/stateless.component';

@Component({
  selector: 'app-simple-stateful-counter',
  standalone: true,
  imports: [StatelessCounterComponent],
  templateUrl: './simple-stateful.component.html',
  styleUrls: ['./simple-stateful.component.css'],
})
export class SimpleStatefulCounterComponent {
  count = signal(0);

  increment() {
    this.count.update((count) => count + 1);
  }

  decrement() {
    this.count.update((count) => count - 1);
  }

  reset() {
    this.count.set(0);
  }
}
```

### このパターンの特徴

- コンポーネント内部に状態を持つ
- 依存するものがなく外部への副作用もないため再利用性が高い
- コンポーネントへのユニットテストを書きやすい
- 状態のライフサイクルを意識する必要がある

### このパターンのユースケース例

- 単純かつ自身に閉じた状態を持つ UI コンポーネント
  - メニューやダイアログの開閉状態など

## 3. Simple PDS

**Simple PDS**（**Presentation-Domain Separation**) パターンは、ステートフルコンポーネントにビジネスロジックを加えたものだ。いわゆるコンテナコンポーネントと呼ばれる類のコンポーネントはこれと似た構造になる。

https://martinfowler.com/bliki/PresentationDomainSeparation.html

このパターンでは PDS 原則に従い、コンポーネントと密接なビジネスロジックをローカルサービス (ここでは**ユースケース**と呼ぶ）に分離し、コンポーネントからメソッドを呼び出す。ユースケースクラスには HTTP 通信やアプリケーションのドメインロジックなどが記述される。

```typescript
@Injectable()
export class UserListUsecase {
  #http = inject(HttpClient);

  async getUsers(): Promise<User[]> {
    return lastValueFrom(
      this.#http.get<User[]>('https://jsonplaceholder.typicode.com/users'),
    );
  }
}
```

HTML テンプレートはステートフルコンポーネントと同じくステートレスコンポーネントを呼び出す場合もあれば、直接ビューを記述してもよい。

```html
<ul>
  <li *ngFor="let user of users()">
    <span>#{{ user.id }}: {{ user.name }}</span>
  </li>
</ul>
```

```typescript
import { UserListUsecase } from './usecase';

@Component({
  selector: 'app-simple-pds-user-list',
  standalone: true,
  imports: [CommonModule],
  providers: [UserListUsecase],
  templateUrl: './simple-pds.component.html',
  styleUrls: ['./simple-pds.component.css'],
})
export class SimplePdsUserListComponent implements OnInit {
  usecase = inject(UserListUsecase);

  users = signal<User[]>([]);

  ngOnInit() {
    this.usecase.getUsers().then((users) => {
      this.users.set(users);
    });
  }
}
```

![](/images/angular-signals-component-design-patterns/b48234b7-ca60-4dc5-8a7d-2b16ad5246b7/Untitled.png)
_Simple PDS Component_

### このパターンの特徴

- コンポーネント内部に状態を持つ
- コンポーネントは UI に関する責任を持ち、それ以外の責任を外部に委譲する
- 依存性の注入により、コンポーネントとユースケースは疎結合である
  - ユースケースクラスのインスタンスをテストダブルに差し替えてテストできる

### このパターンのユースケース例

- 比較的シンプルな、管理する状態のスケールが小さいページの Routed Component
- UI とビジネスロジックを併せ持ったコンテナコンポーネント

## 4. PDS+CQS

Simple PDS パターンではコンポーネントが状態管理の責任を持っているが、状態の操作が複雑化すると、コンポーネントの責務が肥大化する。そのため、Simple PDS パターンが適用できるのは状態管理の複雑さが十分に単純である場合、たとえば HTTP 通信で取得したデータを保持しておくだけのような場合である。

状態の更新にロジックが関与し、状態遷移の整合性について複雑性がある場合は、さらにコンポーネントから責任を切り出すモチベーションが生まれる。その解決策のひとつが **PDS+CQS** (**Presentation Domain Separation + Command Query Separation)** パターンである。

PDS+CQS パターンの主要な構成要素は、**ステート**・**ユースケース**・**コンテナコンポーネント**の 3 つである。状態管理の責任をプレゼンテーション側からドメイン側のステートに移した上で、コンポーネントとステートの間のデータの流れは、ユースケースによって状態の更新を行うコマンドと状態の読み取りを行うクエリに分離される。この 3 つの構成要素と 2 つの分離原則の関係を図示すると次のようになる。

![](/images/angular-signals-component-design-patterns/36d4d687-5e55-4d2d-809d-0c5e006b2159/pds-cqs.png)
_PDS+CQS Component_

このパターンが適用されるコンポーネントはアプリケーションの中で多くないし、あまり増やすべきではない。主にページ単位の状態を扱うことになる Routed Component や、クライアントサイドでの状態の操作が多い複雑な UI を構築するコンポーネントに適している。このパターンでは対象範囲の状態管理を一箇所に集約してカプセル化するため、UI を構成するほとんどのコンポーネントをステートレスコンポーネントとして実装できることが利点である。

## PDS+CQS サンプル: TodoList

このパターンの実装例として、簡単な TODO リストを作ってみよう。

### SignalState

まずは `SignalState<T>` というインターフェースの導入を検討する。このインターフェースは `asReadonly()` メソッドを持ち、 `ReadonlyState<T>` を返す。 `ReadonlyState<T>` は与えられた型を読み取り専用の `Signal` 型に変換した型だ。 （書き込み可能な Signal は `WritableSignal` 型に限られる）

```typescript
// signal-state.ts
export interface SignalState<T> {
  asReadonly(): ReadonlyState<T>;
}

export type ReadonlyState<T> = T extends object
  ? {
      [K in keyof T]: Signal<T[K]>;
    }
  : Signal<T>;
```

### State/Usecase

このインターフェースを実装したステートクラス `TodoListState` は次のようになる。このステートクラスの責任は、状態の保持とその更新手続きのカプセル化である。クラスフィールドは `signal()` または `computed()` で作成された Signal オブジェクトであり、Signal の値を更新するメソッドが定義されている。そして `asReadonly()` メソッドで読み取り専用の状態オブジェクトを返す。

```typescript
// todo-list.state.ts
import { computed, signal } from '@angular/core';
import { SignalState } from '../shared/signal-state';
import { Todo } from './todo';

export type State = {
  todos: Todo[];
  incompletedTodos: Todo[];
  completedTodos: Todo[];
};

export class TodoListState implements SignalState<State> {
  todos = signal<Todo[]>([
    {
      id: 1,
      title: 'Learn Signals',
      completed: false,
    },
  ]);

  completedTodos = computed(() => {
    return this.todos().filter((todo) => todo.completed);
  });
  incompletedTodos = computed(() => {
    return this.todos().filter((todo) => !todo.completed);
  });

  addTodo(title: string): void {
    this.todos.update((todos) => [
      {
        id: todos.length + 1,
        title,
        completed: false,
      },
      ...todos,
    ]);
  }

  setCompleted(id: Todo['id'], completed: boolean) {
    this.todos.mutate((todos) => {
      const item = todos.find((todo) => todo.id === id);
      if (item) {
        item.completed = completed;
      }
    });
  }

  asReadonly() {
    return {
      todos: this.todos.asReadonly(),
      completedTodos: this.completedTodos,
      incompletedTodos: this.incompletedTodos,
    };
  }
}
```

次にユースケースクラスを実装する。CQS 原則に従い、ユースケースクラスが持つインターフェースはコマンド（更新）とクエリ（問い合わせ）のどちらかに区別される。

https://martinfowler.com/bliki/CommandQuerySeparation.html

ユースケースクラス `TodoListUsecase` は `#state` プライベートフィールドに `TodoListState` のインスタンスを持ち、 `state` パブリックフィールドに `TodoListState` の `asReadonly()` メソッドの戻り値を持つ。

```typescript
// todo-list.usecase.ts
import { TodoListState } from './state';
import { Todo } from './todo';

@Injectable()
export class TodoListUsecase {
  #state = new TodoListState();

  state = this.#state.asReadonly();

  addTodo(title: string) {
    this.#state.addTodo(title);
  }

  setTodoCompleted(id: Todo['id'], completed: boolean) {
    this.#state.setCompleted(id, completed);
  }
}
```

そして、コンテナコンポーネントは依存性の注入によってユースケースクラスのインスタンスにアクセスする。Simple PDS パターンと違い、状態を更新するための処理を自身で持たず、ユースケースクラスが公開するメソッド（コマンド）を呼び出す。CQS 原則に従い、メソッドは戻り値を持たず、コマンドの作用はユースケースが公開するクエリである `state` オブジェクトを介して伝えられる。

コンテナコンポーネントはステートクラスの存在を直接知ることはなく、ユースケースクラスだけに依存する。状態管理についてはユースケースクラスが提供する `state` フィールドだけを知っており、その裏の実体については隠蔽されている。

```html
<app-todo-list-view
  [items]="usecase.state.todos()"
  (changeCompleted)="usecase.setTodoCompleted($event.id, $event.completed)"
/>
```

```typescript
import { TodoListUsecase } from './usecase';
import { TodoListViewComponent } from './views/todo-list-view/todo-list-view.component';

@Component({
  selector: 'app-pds-cqs-todo-list',
  standalone: true,
  imports: [CommonModule, TodoListViewComponent],
  providers: [TodoListUsecase],
  templateUrl: './pds-cqs.component.html',
  styleUrls: ['./pds-cqs.component.css'],
})
export class PdsCqsTodoListComponent {
  usecase = inject(TodoListUsecase);
}
```

実装の詳細は動作するサンプルを見てほしい。

@[stackblitz](https://stackblitz.com/edit/stackblitz-starters-jcdjgn?ctl=1&embed=1&file=src/pds-cqs/pds-cqs.component.ts)

## まとめ

今回紹介したコンポーネント設計パターンにおける責任についてまとめると次のようになる。

| パターン                   | UI 構築        | 状態管理       | ビジネスロジック |
| :------------------------- | :------------- | :------------- | :--------------- |
| ステートレスコンポーネント | コンポーネント | なし           | なし             |
| ステートフルコンポーネント | コンポーネント | コンポーネント | なし             |
| Simple PDS                 | コンポーネント | コンポーネント | ユースケース     |
| PDS+CQS                    | コンポーネント | ステート       | ユースケース     |

どのパターンにもそれに適した場面があり、目的に合わせて組み合わせて使うものである。ただし、アプリケーションの全体を通して、複雑なコンポーネントよりも単純なパターンのコンポーネントのほうが多くの割合を占めるようにするべきだ。そうすることでアプリケーションの大部分をユニットテストしやすい状態に保つことができる。
