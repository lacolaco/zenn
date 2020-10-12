---
title: "第1章 4. フォームと状態管理"
---

前のページではユーザーリストを表示するための配列をRxJSの `BehaviorSubject` で管理しました。このページでは、ユーザーリストにフィルター機能を追加する中での、少し複雑になった状態を管理する設計パターンについて見ていきましょう。

## 配列のフィルタリング

今回実装するユーザーリストのフィルタリングは、以下の要件を満たすものとします。

* フィルタリング用のテキストフィールドをひとつ表示する
* テキストフィールドに入力された文字列を名前に含むユーザーだけをリストに表示する
* フィルタリングはテキストフィールドの変更にリアルタイムに反応する

これを実現するために、アプリケーションが管理する状態の型を次のように定義します。`userList.items` にはユーザーの配列を保持します。名前でフィルタリングするための文字列は `userList.filter.nameFilter` に保持します。

```typescript:state.ts
export interface UserListFilter {
  nameFilter: string;
}

export interface State {
  userList: {
    items: User[];
    filter: UserListFilter;
  };
}
```

今後文字列以外にも年齢や性別のような属性でフィルタリングをおこなうような変更に備えるため、フィルタリングに関する状態は `userList.filter` に集約しています。

この状態を管理するためのStoreサービスを作成します。これまでは `UserService` がユーザーに関するデータ取得、状態の管理という責務を集約していましたが、アプリケーション全体の状態の管理をおこなうためのサービスを作り、そこに既存の状態管理も移譲します。

まずはアプリケーションの初期状態を定義します。 `state.ts` に `inistalState` 変数を宣言します。

```typescript:state.ts
export const initialState = {
  userList: {
    items: [],
    filter: {
      nameFilter: '',
    }
  },
};
```

## Store

状態管理をおこなうStoreサービスを作成します。状態を保持するための `BehaviorSubject` と、状態を更新するための `update` メソッド、そして状態を購読するための `select<T>` メソッドを実装しています。

:::message info
このサンプルではサードパーティライブラリに依存しないために独自にStoreを実装していますが、通常のアプリケーションでは ngrx/store や Akita のようなライブラリを使うことをおすすめします。
:::

:::message alert
`update`メソッドではRxJSの[`queueScheduler.schedule`](https://rxjs-dev.firebaseapp.com/api/index/const/queueScheduler) メソッドを使っています。これは引数に渡した関数を非同期的に実行するものです。同期的に`this._state$.next` を呼び出すとその更新が別の購読に即座に影響を与えるため、Angularの変更検知の整合性チェックでエラーが起きます。
:::

```typescript:store.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, queueScheduler } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { State, initialState } from '../state';

@Injectable({ providedIn: 'root' })
export class Store {

  private _state$ = new BehaviorSubject<State>(initialState);

  update(fn: (state: State) => State) {
    const current = this._state$.value;
    queueScheduler.schedule(() => {
      this._state$.next(fn(current));
    });
  }

  select<T>(selector: (state: State) => T) {
    return this._state$.pipe(
      map(selector),
      distinctUntilChanged(),
    );
  }
}
```

このStoreを使うように、`UserService` を変更します。 `AppComponent` から見た `UserService` のインターフェースは変えず、内部実装だけを変更します。これにより、状態管理の責務が `UserService` から切り離されます。同時に、`fetchUsers` メソッドは async関数を使いシンプルに書き直します。HTTPリクエストのObservableはリクエストが完了すると同時に自動でcompleteするため、Subscriptionを使ったキャンセルをしないのであればPromiseと大きな違いはありません。（[「Observableのライフサイクル」](https://app.gitbook.com/@lacolaco/s/angular-after-tutorial/season-2-effective-rxjs/observable-lifecycle)を参照）
ここではコールバックネストを減らして可読性を高めるためにasync関数を利用しました。


```typescript:user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { map } from "rxjs/operators";
import { Store } from './store.service';
import { User } from '../user';

@Injectable({ providedIn: 'root' })
export class UserService {

  get users$() {
    return this.store.select(state => state.userList.items);
  }

  constructor(private http: HttpClient, private store: Store) { }

  async fetchUsers() {
    const users = await this.http
      .get<{ data: User[] }>("https://reqres.in/api/users")
      .pipe(map(resp => resp.data))
      .toPromise();

    this.store.update(state => ({
      ...state,
      userList: {
        ...state.userList,
        items: users
      }
    }));
  }
}
```

## UserListUsecase

ここに、フィルタリングのための機能を追加していきます。ところで、`UserService` の責務はユーザーリストを表示するためのビジネスロジックを集約することですから、フィルタリングのための処理も `UserService` に記述します。ただし名前が実態に合っていないため、ここで名前を `UserListUsecase` に変更します。また次のように、フィルター条件をセットする `setNameFilter` メソッドを実装し、 `users$` ゲッターはフィルタリングを適用した結果の配列を返すように変更します。

```typescript:user-list.usecase.ts
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject } from "rxjs";
import { filter, map } from "rxjs/operators";
import { Store } from "../service/store.service";
import { User } from "../user";

@Injectable({ providedIn: 'root' })
export class UserListUsecase {

  get users$() {
    return this.store
      // state.userListに変更があったときだけ後続のpipeが実行される
      .select(state => state.userList)
      .pipe(
        map(({ items, filter }) =>
          items.filter(user =>
            (user.first_name + user.last_name).includes(filter.nameFilter)
          )
        )
      );
  }

  get filter$() {
    return this.store.select(state => state.userList.filter);
  }

  constructor(private http: HttpClient, private store: Store) { }

  async fetchUsers() {
    const users = await this.http
      .get<{ data: User[] }>("https://reqres.in/api/users")
      .pipe(map(resp => resp.data))
      .toPromise();

    this.store.update(state => ({
      ...state,
      userList: {
        ...state.userList,
        items: users
      }
    }));
  }

  setNameFilter(nameFilter: string) {
    this.store.update(state => ({
      ...state,
      userList: {
        ...state.userList,
        filter: {
          nameFilter
        }
      }
    }));
  }
}
```

## フィルターの追加

必要なビジネスロジックが揃ったので、ビューの変更をおこないましょう。フィルタリング設定のフォームを表示するための `UserListFilterComponent` を作成します。テンプレートはReactve Formにひとつのinput要素だけがあるシンプルはフォームです。コンポーネントクラスでは、Inputとして渡された状態をフォームにセットし、フォームの更新をOutputで親クラスに通知しています。フォームの入力値が更新されるたびに `valueChange` Outputのイベントが発火します。

:::message
Reactive Formを使うためには、`AppModule`の `imports` メタデータに`ReactiveFormsModule` を追加する必要があります。
:::

:::message
`setFormValue` メソッドでセットした値がまた `valueChanges` イベントを発火してしまわないように `emitEvent` フラグをオフにしています。指定しないと、Storeから渡された値がvalueChangesを発火し、それがまたStoreを更新するというループに陥ります。

同じ値でStoreを更新してしまうのが原因なので、Storeを更新するまでの間のどこかで同値チェックができればこの問題は解決します。
:::

```html:user-list-filter.component.html
<form [formGroup]="form">

    <label>
    Name Filter:
    <input formControlName="nameFilter" >
  </label>

</form>
```

```typescript:user-list-filter.component.ts
import { Component, Input, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { UserListFilter } from '../../state';

@Component({
  selector: 'user-list-filter',
  templateUrl: './user-list-filter.component.html',
  styleUrls: ['./user-list-filter.component.css']
})
export class UserListFilterComponent implements OnDestroy, OnInit {
  @Input() set value(value: UserListFilter) {
    this.setFormValue(value);
  }
  @Output() valueChange = new EventEmitter<UserListFilter>();

  form: FormGroup;

  private onDestroy = new EventEmitter();

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      nameFilter: ['']
    });
  }

  ngOnInit() {
    this.form.valueChanges.pipe(takeUntil(this.onDestroy)).subscribe(value => {
      this.valueChange.emit(value);
    });
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

  private setFormValue(value: UserListFilter) {
    this.form.setValue(value, { emitEvent: false });
  }
}
```

`AppComponent` を変更し、`UserListFilterComponent` とのコミュニーケーションをおこないます。フォームから発火されたフィルター条件の更新は、`UserListUsecase` 経由で保存され、ユーザーリストの表示に影響します。

```html:app.component.html
<user-list-filter 
  [value]="userListFilter$ | async" 
  (valueChange)="setUserListFilter($event)">
</user-list-filter>
<user-list [users]="users$ | async"></user-list>
```

```typescript:app.component.ts
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from './user';
import { UserListFilter } from './state';
import { UserListUsecase } from './usecase/user-list.usecase';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  users$ = this.userList.users$;
  userListFilter$ = this.userList.filter$;

  constructor(private userList: UserListUsecase) { }

  ngOnInit() {
    this.userList.fetchUsers();
  }

  setUserListFilter(value: UserListFilter) {
    this.userList.setNameFilter(value.nameFilter);
  }
}
```

これでユーザーリストのフィルタリング機能が実装できました。

@[stackblitz](https://stackblitz.com/edit/angular-jaztzn?embed=1&file=src/app/app.component.ts)

このページでは以下のように設計と実装をおこないました。

* 要件に必要なアプリケーションの状態を型として定義しました
  * フィルタリングの仕様変更を考慮し、ユーザーの配列とフィルター条件の状態を分離しました
* アプリケーションの初期状態を定義しました
* 状態管理だけをおこなう Store を作成し、 `UserService` から責務を切り離しました
* `UserService` を `UserListUsecase` にリネームし、フィルタリングに関するビジネスロジックを集約しました
* `UserListFilterComponent` を作成し、リアクティブフォームを使ってInput/Outputベースのフォームを実装しました

アプリケーションの基本的な構成が固まってきました。次の最後のページでは、ユーザーの詳細画面へルーティングする機能を実装し、複数ページにおける設計パターンを見ていきます。

