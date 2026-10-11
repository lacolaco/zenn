---
title: 'Angular: Router Resources解説'
published_at: '2026-10-11 21:18'
topics:
  - 'angular'
  - 'signals'
  - 'angular router'
published: true
source: 'https://app.notion.com/p/Angular-Router-Resources-3f13521b014a80f49acefae0cf5204c7'
type: 'tech'
emoji: '✨'
---

Angular v22.2でリリースされた**Router Resources**は、長らく期待されていたRouterとSignalsの本格的な統合APIだ。この記事では基本的な使い方を、具体的なユースケースを通して解説する。

https://angular.jp/guide/routing/data-fetching-with-resources

## Router Resourcesの使い方

### 遷移時のブロッキングなデータ取得

もっとも典型的なユースケースは、Routerでの遷移時にデータの取得を行い、データが揃うまで待ってからページを移動するものだ。これまではObservable/Promiseベースのデータリゾルバーがそれを担っていたが、同じ役割をSignalベースで置き換える直感的なAPIが導入された。具体的に新旧のコード比較で見てみよう。

ページ遷移時にURLパス中のIDを使ってユーザーデータを取得するケースを例にする。従来であれば、次のようにリゾルバー関数を宣言してコンポーネント側は取得済みのユーザーデータを受け取っていた。

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withComponentInputBinding())],
};

// app.routes.ts
import { ResolveFn, Routes } from '@angular/router';
import { UserProfile } from './user-profile';
import { User, UserService } from './user.service';

const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  const userId = route.paramMap.get('id')!;
  return userService.getUser(userId);
};

export const routes: Routes = [
  {
    path: 'users/:id',
    component: UserProfile,
    resolve: { user: userResolver },
  },
];
```

コンポーネントは取得済みの `User` を、`withComponentInputBinding` によってインプットシグナルとして受け取る。これが典型的なデータリゾルバーによる遷移時のデータ取得だ。

```typescript
// user-profile.ts
import { Component, input } from '@angular/core';
import { User } from './user.service';

@Component({
  selector: 'app-user-profile',
  template: `
    <h2>{{ user().name }}</h2>
  `,
})
export class UserProfile {
  readonly user = input.required<User>();
}
```

これをRouter Resourceに書き換えると次のようになる。まずRouter Resourcesを使うため、Routerの設定に `withRouterResources()` を追加する。そして、データリゾルバーの代わりに`Route.resources`プロパティに関数を宣言する。この関数は`ResourceContext`オブジェクトを引数にとり、リソースのキーバリューオブジェクトを返す。`ResourceContext` は各種パラメータをSignalとして持っており、たとえば`ctx.params()` はパスパラメータを格納したSignalになっている。コンポーネントにはリソースが解決した`value()`の値が渡されるため、データリゾルバーの場合とまったく同じコードのまま変更はいらない。

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withRouterResources,
} from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterResources(), // Added
    ),
  ],
};

// app.routes.ts
import { inject, resource } from '@angular/core';
import { Routes } from '@angular/router';
import { UserProfile } from './user-profile';
import { UserService } from './user.service';

export const routes: Routes = [
  {
    path: 'users/:id',
    component: UserProfile,
    resources: (ctx) => {
      const userService = inject(UserService);
      return {
        user: resource({
          params: () => ctx.params()['id'] as string,
          loader: ({ params: id }) =>
            userService.getUser(id),
        }),
      };
    },
  },
];
```

この例ではRouter Resourcesによってデータリゾルバーが置き換えられたが、ただ置き換えるだけなら新しいAPIは不要だ。ここからはRouter Resourcesにしかできない利点の部分を見ていこう。

### 非ブロッキングなデータ取得

データリゾルバーの振る舞いは**ブロッキング**であり、データ取得が完了してからページ遷移する。これによってデータが必要なページに行く前に状態を整合させることには役立つが、いくつかの点で欠点がある。ひとつはユーザー体験の問題で、データ取得を遷移前のページで待つことになり、画面が固まったように感じられる。スケルトンやローディングUIなどによって待ち時間をケアすることが難しい。もうひとつはコードの分散である。データリゾルバーが常にブロッキングであるため、非ブロッキングなデータの取得はコンポーネント側に書くことになる。ページ遷移に伴うデータ取得という同じ関心でありながら、コードが散らばってしまう。

Router Resourcesは**データ取得をブロッキングにするか非ブロッキングにするかを選択できる**。これによって、Routerに依存したページ遷移に伴うデータ取得のコードを一箇所に集約できる。具体的に見てみよう。

先の例と違い、ユーザーデータの取得中はローディング表示、失敗したらエラー表示、取得できたらユーザー情報を表示することにしよう。従来のAPIであれば、`withComponentInputBinding` によってコンポーネントがパスパラメータをインプットシグナルとして受け取り、それをパラメータとするリソースを作成するのもコンポーネントの役割になる。

```typescript
// user-profile.ts
import { Component, inject, resource } from '@angular/core';
import { UserService } from './user.service';

@Component({
  template: `
    @if (userResource.isLoading()) {
      <p>Loading...</p>
    } @else if (userResource.error()) {
      <p>Failed to load user.</p>
    } @else if (userResource.value(); as user) {
      <h2>{{ user.name }}</h2>
      <p>ID: {{ user.id }}</p>
    }
  `,
})
export class UserProfile {
  private readonly userService = inject(UserService);
  private readonly id = input.required<string>(); // users/:id

  readonly userResource = resource({
    params: () => this.id(),
    loader: ({ params: id }) =>
      this.userService.getUser(id),
  });
}
```

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { UserProfile } from './user-profile';

export const routes: Routes = [
  { path: 'users/:id', component: UserProfile },
];
```

これがRouter Resourcesでは、以下のようになる。ルート設定の `resources` 関数でリソースを作るが、先ほどの例と違い、`nonBlocking`関数でリソースをラップする。こうすると、コンポーネントはリソースにより取得される`value()`ではなく、**リソースオブジェクトそのもの**を受け取る。つまり、`user`ではなく`userResource`を受け取るということだ。

```typescript
// app.routes.ts
import { inject, resource } from '@angular/core';
import { nonBlocking, Routes } from '@angular/router';
import { UserProfile } from './user-profile';
import { UserService } from './user.service';

export const routes: Routes = [
  {
    path: 'users/:id',
    component: UserProfile,
    resources: (ctx) => {
      const userService = inject(UserService);
      return {
        userResource: nonBlocking(
          resource({
            params: () => ctx.params()['id'] as string | undefined,
            loader: ({ params: id }) =>
              userService.getUser(id),
          }),
        ),
      };
    },
  },
];
```

コンポーネントは最初から**リソースオブジェクトをインプットシグナルとして受け取る**。リソースオブジェクトはデータ取得の状態やエラーなども保持しているため、従来と同じく状態に応じたUIの変化に対応できる。コンポーネントからはデータ取得に関する関心が消え、サービスへの依存がなくなっていることにも注目したい。Router Resourcesにより、コンポーネントはプレゼンテーション層としての分離レベルをより高めることができる。データがどのように取得されるかという内部事情は、リソースの裏側に隠蔽されるのだ。

```typescript
// user-profile.ts
import { Component, input, Resource } from '@angular/core';
import { User } from './user.service';

@Component({
  template: `
    @let res = userResource();
    @if (res.isLoading()) {
      <p>Loading...</p>
    } @else if (res.error()) {
      <p>Failed to load user.</p>
    } @else if (res.value(); as user) {
      <h2>{{ user.name }}</h2>
      <p>ID: {{ user.id }}</p>
    }
  `,
})
export class UserProfile {
  readonly userResource = input.required<Resource<User | undefined>>();
}
```

### 親子ルートにまたがるデータ取得の並列実行

Router Resourcesのもうひとつの利点は、複数のルートにまたがるデータ取得を並列に実行できることだ。データリゾルバーは親ルートから子ルートへ順番に実行される。データ取得同士に依存関係がない場合でも、子は親の完了を待たなければならない。

ユーザーのプロフィールと投稿一覧を表示するページを例にしよう。親ルートがユーザー情報を取得し、子ルートがそのユーザーの投稿一覧を取得する。どちらもURLのIDさえわかれば取得でき、投稿一覧を取得するためにユーザー情報の取得完了を待つ必要はない。

```typescript
// app.routes.ts
import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { UserPage } from './user-page';
import { UserPosts } from './user-posts';
import { User, UserService } from './user.service';
import { Post, PostService } from './post.service';

const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  const userId = route.paramMap.get('id')!;
  return userService.getUser(userId);
};

const postsResolver: ResolveFn<Post[]> = (route) => {
  const postService = inject(PostService);
  const userId = route.paramMap.get('id')!;
  return postService.getPosts(userId);
};

export const routes: Routes = [
  {
    path: 'users/:id',
    component: UserPage,
    resolve: { user: userResolver },
    children: [
      {
        path: '',
        component: UserPosts,
        resolve: { posts: postsResolver },
      },
    ],
  },
];
```

`UserPage` はユーザー情報と `RouterOutlet` を表示し、その中に `UserPosts` が投稿一覧を表示する。空のパスを持つ子ルートは親のパスパラメータを継承するため、子でも同じ `id` を使える。コンポーネントはこれまでの例と同様に、`withComponentInputBinding` によって取得済みの `user` と `posts` をそれぞれ受け取る。この構成では、ユーザー情報の取得に200ms、投稿一覧の取得に300msかかるとすると、データ取得で合計500ms待つことになる。

これをRouter Resourcesに置き換えると次のようになる。Router Resourcesは、**遷移先にマッチした親子ルートのリソースを並行して読み込む**。ユーザー情報と投稿一覧の取得が並列に進むため、先ほどの例であればデータ取得の待ち時間は合計500msではなく、遅いほうの300ms程度になる。

```typescript
// app.routes.ts
import { inject, resource } from '@angular/core';
import { ResourceContext, Routes } from '@angular/router';
import { UserPage } from './user-page';
import { UserPosts } from './user-posts';
import { UserService } from './user.service';
import { PostService } from './post.service';

const userResource = (ctx: ResourceContext) => {
  const userService = inject(UserService);
  return resource({
    params: () => ctx.params()['id'] as string,
    loader: ({ params: id }) =>
      userService.getUser(id),
  });
};

const postsResource = (ctx: ResourceContext) => {
  const postService = inject(PostService);
  return resource({
    params: () => ctx.params()['id'] as string,
    loader: ({ params: id }) =>
      postService.getPosts(id),
  });
};

export const routes: Routes = [
  {
    path: 'users/:id',
    component: UserPage,
    resources: (ctx) => ({ user: userResource(ctx) }),
    children: [
      {
        path: '',
        component: UserPosts,
        resources: (ctx) => ({ posts: postsResource(ctx) }),
      },
    ],
  },
];
```

#### Appendix: 親ルートのリソースに依存する

親ルートで取得したユーザー情報に含まれる所属組織のIDを使って、子ルートが投稿一覧を取得する場合を考えてみよう。この場合、URLのパラメータだけでは取得条件が決まらず、子は親のリソースに依存する。v22.2.0時点のRouter Resourcesには、`resources` 関数のコンテキストから親ルートのリソースを参照するAPIがないが、このユースケースに対応する[PR #70587](https://github.com/angular/angular/pull/70587)が実装中だ。

このドラフトでは、祖先ルートのリソースを継承する`ResourceContext.resources` が公開され、`ctx.resources()` から親で宣言したリソースを取り出す形になる。先ほどの `postsResource` をこの提案に合わせて書き換えると、次のようになる。この例では `User` が `organizationId` を持ち、投稿取得サービスがそのIDを受け取るものとする。

```typescript
// app.routes.ts
import { inject, Resource, resource } from '@angular/core';
import { ResourceContext } from '@angular/router';
import { User } from './user.service';
import { PostService } from './post.service';

const postsResource = (ctx: ResourceContext) => {
  const postService = inject(PostService);
  return resource({
    params: ({ chain }) => {
      const userResource = ctx.resources()['user'] as Resource<User | undefined>;
      return chain(userResource)?.organizationId;
    },
    loader: ({ params: organizationId }) =>
      postService.getPostsByOrganization(organizationId),
  });
};
```

### 再ナビゲーションなしの再読み込み

ユーザー一覧で名前を編集し、保存後に一覧を再取得する場合を考えてみよう。保存した値をそのまま表示するのではなく、サーバー側で更新されたデータを一覧に反映したい。この例では、`UserService.getUsers()` が一覧を `Promise<User[]>` として返し、`saveUser(user)` がユーザー情報を保存して `Promise<void>` を返すものとする。

一覧をデータリゾルバーで取得している場合、保存後の再取得にもナビゲーションが必要になる。同じURLへのナビゲーションを処理するための `onSameUrlNavigation: 'reload'` と、パスパラメータが変わらなくてもリゾルバーを再実行するための `runGuardsAndResolvers: 'always'` を指定する。この方法では、保存後に一覧を更新するためにルートのマッチングやガードの評価もやり直すことになる。

```typescript
// app.routes.ts
import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { UserList } from './user-list';
import { User, UserService } from './user.service';

const usersResolver: ResolveFn<User[]> = () => {
  const userService = inject(UserService);
  return userService.getUsers();
};

export const routes: Routes = [
  {
    path: 'users',
    component: UserList,
    resolve: { users: usersResolver },
    runGuardsAndResolvers: 'always',
  },
];

// user-list.ts
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserService } from './user.service';

@Component({
  template: `
    @for (user of users(); track user.id) {
      <input #name [value]="user.name" />
      <button (click)="saveUser(user, name.value)">Save</button>
    }
  `,
})
export class UserList {
  readonly users = input.required<User[]>();
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  async saveUser(user: User, name: string) {
    await this.userService.saveUser({ ...user, name });
    await this.router.navigateByUrl(this.router.url, {
      onSameUrlNavigation: 'reload',
    });
  }
}
```

Router Resourcesであれば、保存完了後に一覧のリソースの `reload()` を呼ぶだけでよい。

```typescript
// app.routes.ts
import { inject, resource } from '@angular/core';
import { Routes } from '@angular/router';
import { UserList } from './user-list';
import { UserService } from './user.service';

const usersResource = () => {
  const userService = inject(UserService);
  return resource({
    loader: () => userService.getUsers(),
  });
};

export const routes: Routes = [
  {
    path: 'users',
    component: UserList,
    resources: () => ({ users: usersResource() }),
  },
];

// user-list.ts
import { Component, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { User, UserService } from './user.service';

@Component({
  template: `
    @for (user of users(); track user.id) {
      <input #name [value]="user.name" />
      <button (click)="saveUser(user, name.value)">Save</button>
    }
  `,
})
export class UserList {
  readonly users = input.required<User[]>();
  private readonly userService = inject(UserService);
  private readonly usersResource =
    inject(ActivatedRoute).resources?.['users']!;

  async saveUser(user: User, name: string) {
    await this.userService.saveUser({ ...user, name });
    this.usersResource.reload();
  }
}
```

ブロッキングなリソースの場合、インプットシグナルには取得結果だけが渡されるため、リソースオブジェクトは `ActivatedRoute.resources` から参照する。保存の完了を待ってから一覧を再取得し、取得結果の変化がインプットシグナルにも反映される。保存処理はコンポーネント側に残るが、一覧の取得処理を重複して書く必要はない。

非ブロッキングなリソースの場合は、受け取ったリソースの `reload()` を直接呼び出せばよい。ただし、22.2.0時点ではRouterにより渡される`reload`メソッド付きのリソースに対応した型が公開されてない。現状では次の例のように自前で型を用意するのがいいだろう。

```typescript
// user-list.ts
import { Component, inject, input, Resource } from '@angular/core';
import { User, UserService } from './user.service';

type RouteResource<T> = Resource<T> & { reload(): boolean };

@Component({
  template: `
    @let res = usersResource();
    @if (res.isLoading()) {
      <p>Loading...</p>
    } @else if (res.error()) {
      <p>Failed to load users.</p>
    } @else if (res.value(); as users) {
      @for (user of users; track user.id) {
        <input #name [value]="user.name" />
        <button (click)="saveUser(user, name.value)">Save</button>
      }
    }
  `,
})
export class UserList {
  readonly usersResource = input.required<RouteResource<User[] | undefined>>();
  private readonly userService = inject(UserService);

  async saveUser(user: User, name: string) {
    await this.userService.saveUser({ ...user, name });
    this.usersResource().reload();
  }
}
```

### クエリパラメータに応じたリアクティブなデータ取得

同じページで検索条件を変え、それに応じて検索結果を更新する場合を考えてみよう。ユーザー検索ページのURLを `/users?q=alice` とし、検索語をクエリパラメータ `q` に保存する。検索語を変えるとURLは `/users?q=bob` になり、同じコンポーネントを使い続けながら検索結果を更新する。この例では、`UserService.searchUsers(q)` が検索結果を `Promise<User[]>` として返すものとする。

従来であれば、コンポーネントがクエリパラメータをインプットシグナルとして受け取り、それを取得条件とするリソースを持つことになる。

```typescript
// user-search.ts
import { Component, inject, input, linkedSignal, resource } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { UserService } from './user.service';

@Component({
  imports: [RouterLink, FormField],
  template: `
    <input type="search" [formField]="searchForm.q" />
    <button [routerLink]="[]" [queryParams]="{ q: searchForm.q().value() }">Search</button>
    
    @let res = usersResource;
    @if (res.isLoading()) {
      <p>Loading...</p>
    } @else if (res.error()) {
      <p>Failed to load users.</p>
    } @else if (res.value(); as users) {
      @for (user of users; track user.id) {
        <p>{{ user.name }}</p>
      }
    }
  `,
})
export class UserSearch {
  readonly q = input<string>();
  readonly searchForm = form(linkedSignal(() => ({ q: this.q() ?? '' })));
  private readonly userService = inject(UserService);

  readonly usersResource = resource({
    params: () => this.q() ?? '',
    loader: ({ params: query }) =>
      this.userService.searchUsers(query),
  });
}

// app.routes.ts
import { Routes } from '@angular/router';
import { UserSearch } from './user-search';

export const routes: Routes = [
  { path: 'users', component: UserSearch },
];
```

Router Resourcesでは、`ctx.queryParams()` から検索語を読み取り、リソースを `nonBlocking()` でラップする。クエリパラメータの更新は検索完了を待たず、リソースは検索語の変化に応じてデータを取得する。

```typescript
// app.routes.ts
import { computed, inject, resource } from '@angular/core';
import { nonBlocking, ResourceContext, Routes } from '@angular/router';
import { UserSearch } from './user-search';
import { UserService } from './user.service';

const usersResource = (ctx: ResourceContext) => {
  const userService = inject(UserService);
  const q = computed(() => (ctx.queryParams()['q'] as string | undefined) ?? '');
  return resource({
    params: () => q(),
    loader: ({ params: query }) =>
      userService.searchUsers(query),
  });
};

export const routes: Routes = [
  {
    path: 'users',
    component: UserSearch,
    resources: (ctx) => ({ usersResource: nonBlocking(usersResource(ctx)) }),
  },
];
```

コンポーネントはリソースをインプットシグナルとして受け取り、これまでと同じく取得状態と検索結果を表示する。検索条件からデータ取得へ繋ぐ処理はRouter側に移り、コンポーネントは検索サービスに依存しなくなる。

ここで重要なのは、リソースが**クエリパラメータ全体ではなく検索語の **`q`** パラメータだけを取得条件にしている**ことだ。`computed` で `q` だけを取り出したSignalに変換してから `params` 関数で読んでいる。表示方法を切り替える別のクエリパラメータが変わっても、`q` が同じなら再取得も再描画も行われない。Signalの利点であるきめ細かいリアクティビティ（Fine-grained reactivity）をURLの状態変化に対しても適用できる。

```typescript
// user-search.ts
import { Component, input, linkedSignal, Resource } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { User } from './user.service';

@Component({
  imports: [RouterLink, FormField],
  template: `
    <input type="search" [formField]="searchForm.q" />
    <button [routerLink]="[]" [queryParams]="{ q: searchForm.q().value() }">Search</button>
    
    @let res = usersResource();
    @if (res.isLoading()) {
      <p>Loading...</p>
    } @else if (res.error()) {
      <p>Failed to load users.</p>
    } @else if (res.value(); as users) {
      @for (user of users; track user.id) {
        <p>{{ user.name }}</p>
      }
    }
  `,
})
export class UserSearch {
  readonly q = input<string>();
  readonly searchForm = form(linkedSignal(() => ({ q: this.q() ?? '' })));
  readonly usersResource = input.required<Resource<User[] | undefined>>();
}
```

### `httpResource`を使ったデータ取得

Router Resourcesには、`resource()` だけでなく `httpResource()` で作成したリソースも渡せる。ユーザー情報を `GET /api/users/:id` で取得する場合、サービスを経由してローダーを書く代わりに、パスパラメータからリクエストURLを組み立てればよい。`httpResource()` はURLを返す関数が読むSignalの変化に応じてHTTPリクエストを実行する。この例ではIDが変わるとユーザー情報を再取得する。

```typescript
// app.routes.ts
import { httpResource } from '@angular/common/http';
import { computed } from '@angular/core';
import { nonBlocking, ResourceContext, Routes } from '@angular/router';
import { UserProfile } from './user-profile';
import { User } from './user.service';

const userResource = (ctx: ResourceContext) => {
  const id = computed(() => ctx.params()['id'] as string);
  return httpResource<User>(() => `/api/users/${encodeURIComponent(id())}`);
};

export const routes: Routes = [
  {
    path: 'users/:id',
    component: UserProfile,
    resources: (ctx) => ({ userResource: nonBlocking(userResource(ctx)) }),
  },
];
```

## 考慮すべき点

Router Resourcesを利用するうえで考慮すべき点として、型推論の課題がある。以前からあるものだが、ルート設定で宣言したリソース名とコンポーネントが受け取るインプット名は、**命名の一致**に依存している。不一致を静的型チェックで発見するには工夫が必要だ。

たとえば次のようなユーティリティ型を検討してみよう。`user-profile.resources.ts` にリソース宣言型と関数をまとめ、`satisfies` でリソース名と型の一致をチェックする。ルート設定ではその関数を参照し、コンポーネント側では、宣言側で導出した `UserProfileResourceInputs` をインポートして実装する。これで、リソース宣言の名前を間違えた場合は `satisfies` が、コンポーネント側で `userResource` を宣言し忘れたり別の名前や型にした場合は `implements` がエラーにする。ただし、チェックできるのはクラスのプロパティ名と型までであり、インプットに別名を付ける `alias` や、ルートに指定したコンポーネントとの対応の正しさまでは検証できない。

```typescript
// router-resource.types.ts
import type { InputSignal, Resource } from '@angular/core';

export type RouteResource<T> = Resource<T> & { reload(): boolean };

export type ResourceInputs<
  Blocking extends { [K in keyof Blocking]: Resource<unknown> },
  NonBlocking extends { [K in keyof NonBlocking]: Resource<unknown> },
> = {
  readonly [K in keyof Blocking]: InputSignal<ReturnType<Blocking[K]['value']>>;
} & {
  readonly [K in keyof NonBlocking]: InputSignal<NonBlocking[K]>;
};

// user-profile.resources.ts
import { inject, resource } from '@angular/core';
import { nonBlocking } from '@angular/router';
import type { ResourceContext } from '@angular/router';
import type { ResourceInputs, RouteResource } from './router-resource.types';
import { UserService } from './user.service';
import type { User } from './user.service';

export type UserResource = RouteResource<User | undefined>;

interface UserProfileBlockingResources {
  user: UserResource;
}

interface UserProfileNonBlockingResources {
  userResource: UserResource;
}

type UserProfileResources =
  UserProfileBlockingResources & UserProfileNonBlockingResources;

export type UserProfileResourceInputs = ResourceInputs<
  UserProfileBlockingResources,
  UserProfileNonBlockingResources
>;

const userResource = (ctx: ResourceContext) => {
  const userService = inject(UserService);
  return resource({
    params: () => ctx.params()['id'] as string,
    loader: ({ params: id }) => userService.getUser(id),
  });
};

export const userProfileResources = (ctx: ResourceContext) => ({
  user: userResource(ctx),
  userResource: nonBlocking(userResource(ctx)),
} satisfies UserProfileResources);

// app.routes.ts
import type { Routes } from '@angular/router';
import { UserProfile } from './user-profile';
import { userProfileResources } from './user-profile.resources';

export const routes: Routes = [
  {
    path: 'users/:id',
    component: UserProfile,
    resources: userProfileResources,
  },
];

// user-profile.ts
import { Component, input } from '@angular/core';
import type { UserProfileResourceInputs, UserResource } from './user-profile.resources';
import type { User } from './user.service';

@Component({
  template: `
    @if (user(); as user) {
      <p>ID: {{ user.id }}</p>
    }
    @let res = userResource();
    @if (res.isLoading()) {
      <p>Loading...</p>
    } @else if (res.error()) {
      <p>Failed to load user.</p>
    } @else if (res.value(); as user) {
      <h2>{{ user.name }}</h2>
    }
  `,
})
export class UserProfile implements UserProfileResourceInputs {
  readonly user = input.required<User | undefined>();
  readonly userResource = input.required<UserResource>();
}
```

## まとめ

実際にユースケースを考えてみて理解したのは、Router Resourcesによってコンポーネントからデータの取得経路についての関心を外に出せるということだ。どのように取得されるかの知識を持たずに、リソースとして抽象化されたデータとその取得状態を扱えるようになる。

開発者プレビューとして実装された22.2.0の時点でも、すでにデータリゾルバーから置き換える利点は多くあり、Signalベースでアプリケーションを設計するなら欠かせない要素になるだろう。まだ機能不足な部分もあるが、むしろ積極的に利用してフィードバックしていくことでフレームワークをより洗練されたものにできるはずだ。

今回のサンプルコードは実際に動く形でGitHubに公開している。

https://github.com/lacolaco/angular-router-resources-sandbox

