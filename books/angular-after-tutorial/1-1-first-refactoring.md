---
title: "第1章 1. はじめてのリファクタリング"
---

第1章では、ユーザーリストを表示する簡単なアプリケーションを例に、リファクタリングを通して Angularアプリケーションの設計について考えていきます。

まずはじめに、リファクタリングの対象となるサンプルアプリケーションを作成します。

## ユーザーリストの取得と表示

この章のサンプルアプリケーションでは、[https://reqres.in/](https://reqres.in/)の ユーザーAPI^[https://reqres.in/api/users]で取得したユーザーを一覧して表示します。

最初の状態では、すべての処理を `AppComponent` だけでおこないます。サービスへの分割も、コンポーネントの分割もまだ何もおこなっていません。

```typescript:app/user.ts
export interface User {
  id: string;
  first_name: string;
  last_name: string;
}
```

```typescript:app/app.component.ts
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from './user';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  users: User[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http
      .get<{ data: User[] }>('https://reqres.in/api/users')
      .subscribe((resp) => {
        this.users = resp.data;
      });
  }
}
```

```html:app/app.component.html
<ul>
  <li *ngFor="let user of users">
    #{{ user.id }} {{ user.first_name }} {{ user.last_name }}
  </li>
</ul>
```

次の画像のようにユーザーリストが表示される状態を用意します。

![ユーザーリストの表示](https://storage.googleapis.com/zenn-user-upload/fxe08aphixf79glw06ny9vizggcw)

@[stackblitz](https://stackblitz.com/edit/angular-i8x98w?embed=1&file=src/app/app.component.html)

次のページからは、このアプリケーションを段階的にリファクタリングしていきます。
