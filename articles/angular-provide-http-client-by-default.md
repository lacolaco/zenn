---
title: 'Angular: provideHttpClient はもう不要（でも必要）'
published_at: '2025-12-25 01:12'
topics:
  - 'angular'
  - 'アドベントカレンダー'
published: true
source: 'https://www.notion.so/Angular-provideHttpClient-2d33521b014a80b6b3aed7578424fcc0'
type: 'tech'
emoji: '✨'
---

[Angularアドベントカレンダー](https://qiita.com/advent-calendar/2025/angular) 25日目です。参加いただいた皆さんありがとうございました！コミュニティを代表して超感謝です。気づかないうちに2枚目まであふれており、派手さはなくともAngularコミュニティのふつふつと沸き立つ熱を感じる2025年末でした。

https://qiita.com/advent-calendar/2025/angular

さて、25日の担当で何を書くかというと、仰々しい締めの内容ではなく、Angular v21のTipsです。クリスマスプレゼントだと思ってください。

---

実はAngular v21から、`HttpClient`が最初からルートスコープで提供されるようになっています。つまり、`providedIn: 'root'`になっているということです。

https://github.com/angular/angular/commit/4bed062bc9f2a0a66c9af3cb8aeb42ee023c6393

これが意味することは、AngularアプリケーションでHttpClientを使うのにわざわざ`provideHttpClient()`でプロバイダーの用意をしなくてよいということです。次のコードは`HttpClient`を利用する`App`コンポーネントを使ってアプリケーションを起動していますが、どこにも追加のDIプロバイダーがありません。これだけで動きます。

```typescript
@Component({
  selector: 'app-root',
  template: `
    @for(user of users(); track user.id) {
      <p>{{ user.id }}: {{ user.name }}</p>
    }
  `,
})
export class App {
  readonly #http = inject(HttpClient);
  readonly users = signal<User[]>([]);

  ngOnInit() {
    this.#http
      .get<User[]>('https://jsonplaceholder.typicode.com/users')
      .subscribe((users) => {
        this.users.set(users);
      });
  }
}

bootstrapApplication(App);
```

`httpResource`を使い `HttpClient`を直接呼び出さないケースでも、内部では`HttpClient`に依存しているため、v20まではプロバイダーが必要でしたが、これも不要になりました。

```typescript
@Component({
  selector: 'app-root',
  template: `
    @for(user of users(); track user.id) {
      <p>{{ user.id }}: {{ user.name }}</p>
    }
  `,
})
export class App {
  readonly #usersResource = httpResource<User[]>(
    () => `https://jsonplaceholder.typicode.com/users`
  );
  readonly users = computed(() => this.#usersResource.value());
}

bootstrapApplication(App);
```

ちょっとコードが減りました。めでたしめでたし

## `provideHttpClient`は引き続き必要

原理的には明示的なプロバイダーは不要になりましたが、実用上は引き続き必要です。なぜかというと大抵のプロジェクトではインターセプター機能を利用しているからです。

`HttpClient`のインターセプター機能を利用するには`provideHttpClient`のオプションが必要です。関数を渡す`withInterceptors`を使うにせよ、DI経由でクラスを渡す`withInterceptorsFromDi`を使うにせよ、どちらにしろ`HttpClient`の明示的な設定がなければ使えません。

https://angular.jp/guide/http/interceptors

`provideHttpClient`関数に何らかの引数を渡して設定を加えている場合は、それを消すことはできません。今までどおり残しておきましょう。

## プロトタイプの簡略化

実用的には消せませんが、それでもAngularアプリケーションをサクッと作ってプロトタイピングする際に、HTTPリクエストを送る機能を実装するためのステップが減るのは明確な利点です。特にAngularチームはSignalベースの`httpResource`を推していきたいところですから、設定ゼロのデフォルト状態で機能を使えるようにしたかったのでしょう。

## テストにおける利点

`provideHttpClient`が不要になったことは実はユニットテストにおいて地味に便利です。`HttpClient`や`httpResource`への依存があるコンポーネントやサービスを`TestBed`でテストするとき、そのテストでHTTPリクエストが発生しないとしても依存関係を解決するためだけに`provideHttpClient`をセットせずに済みます。

とはいえこのケースは v21からデフォルト設定となった `@angular/build:unit-test` によるテスト実行（Vitestランナー）であれば、`angular.json`で`providersFile`にテスト用のグローバル設定を指定できるため、利点としてはありがたみが薄くなりそうです。

```typescript
// src/test-providers.ts
import { Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
const testProviders: Provider[] = [
  provideHttpClient(),
  provideHttpClientTesting(),
];
export default testProviders;
```

[https://angular.jp/guide/testing#global-test-setup-and-providers](https://angular.jp/guide/testing#global-test-setup-and-providers)

## まとめ

Angular v21から`HttpClient`が`providedIn: 'root'`になったことで、プロトタイピングやシンプルなHTTPリクエストの実装がより簡単になりました。実用上はインターセプターの設定のために`provideHttpClient`を使い続けることになりますが、設定が不要なデフォルト状態でも動作するという改善は、Angularの学習コストを下げる上でも意味のある変更だと言えるでしょう。

それではみなさん良いお年を！

