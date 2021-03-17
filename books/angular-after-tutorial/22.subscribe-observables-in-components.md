---
title: 第2章 Effective RxJS - コンポーネントにおけるObservableの購読
---

このページではAngularコンポーネントにおいてどのようにObservableを購読すべきなのかについて学びます。単純なsubscribeからはじめ、段階的にAsyncパイプを使ったリアクティブなパターンの使い方へステップアップしていきます。

Angularのコンポーネントの基本とRxJSの基本を習得したら、次に学ぶのは実際にどうやってObservableとコンポーネントを組み合わせるかというプラクティスです。うまくObservableを利用することで、ユーザーインタラクションとリアクティブに協調するコンポーネントを簡単に実装できるようになるでしょう。

## 明示的な購読

最初に解説する方法は**明示的な購読**です。これはObservableの使い方の中でもっとも基本的で単純な方法です。これは公式チュートリアルの中でも、HeroServiceから値を取得するために学んだはずです。

コンポーネントを実装する前に、まずはサンプル用の `DataService` を用意します。これは[BehaviorSubject](http://reactivex.io/rxjs/manual/overview.html#behaviorsubject)を持つ単純なAngularのサービスです。`setValue` メソッドが `valueSubject` に値を流し、 `valueChanges` getterが `valueSubject` をObservableとして外部に公開します。  


```typescript:data.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private valueSubject = new BehaviorSubject<any>('initial');

  get valueChanges() {
    return this.valueSubject.asObservable();
  }

  setValue(value: any) {
    this.valueSubject.next(value);
  }
}
```

そして AppComponentには新たな値を流すためのボタンを用意します。ここをスタートとして改めて学んでいきましょう。

```typescript:app.component.ts
import { Component } from '@angular/core';
import { DataService } from './data.service';

@Component({
  selector: 'my-app',
  template: `
  <button (click)="updateValue()">Update Value</button>
  `,
})
export class AppComponent {

  constructor(private dataService: DataService) { }

  updateValue() {
    const value = new Date().toISOString();
    this.dataService.setValue(value);
  }
}

```

まずは DataServiceの値を表示するためのコンポーネントを作成します。  明示的なsubscribeをおこなう `ExplicitSubscribeComponent` クラスは、次のように記述します。`value` フィールドを持っていて、テンプレート内で補間構文 `{{ value }}` を使って表示しています。`value` フィールドの更新は、 `valueChanges.subscribe` メソッドに渡されたコールバック関数で行われています。

:::message
`subscribe` メソッドはコンストラクタ内で呼び出してはいけません。Angularのコンポーネントインスタンスが作成されるタイミングと、実際にコンポーネントがビューに配置されるタイミングは一致しません。予期しない挙動やエラーを防ぐために、`ngOnInit` よりも後のタイミングで呼び出しましょう。
:::

```typescript:explicit-subscribe.component.ts
import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';

@Component({
  selector: 'app-explicit-subscribe',
  template: `<div>{{ value }}</div>`,
})
export class ExplicitSubscribeComponent implements OnInit {
  value: any;

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.dataService.valueChanges.subscribe(value => {
      this.value = value;
    });
  }
}
```

`subscribe` メソッドを使う方法はシンプルに見えますが注意点があります。[Observableのライフサイクル](2-1-observable-lifecycle#無限のbservable) で述べたように、購読解除をしなければコンポーネントが破棄されたあとにメモリリークが発生します。おそらく、`ngOnDestroy` ライフサイクルフックメソッドを使って次のように `unsubscribe` メソッドを呼ぶ方法をまず最初に思いつくでしょう。

```typescript:explicit-subscribe.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataService } from '../data.service';

@Component({ ... })
export class ExplicitSubscribeComponent implements OnInit, OnDestroy {
  value: any;
  private subscription: Subscription;

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.subscription = this.dataService.valueChanges.subscribe(value => {
      this.value = value;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
```

この方法はクラスフィールドとして `Subscription` オブジェクトを保持する必要があります。`subscribe` メソッドの戻り値を使うことになりますが、コンポーネントが購読する Observableが複数になると、煩雑なコードになってしまうのが欠点であり、購読解除忘れも発生しがちです。

ところで、[Observableのライフサイクル](2-1-observable-lifecycle#有限のobservable) で説明したとおり、Observableが完了するとその時点ですべての購読が自動的に解除されます。それを利用して、購読を開始する前の段階で、自動的に完了するように仕込んでおくことで購読解除忘れを防ぐことができます。

次の例では、`ngOnDestroy` ライフサイクルフックのタイミングで発行される `onDestroy$` Subjectを作成し、 `valueChanges` には`takeUntil` オペレーターを追加します。`takeUntil` オペレータは、引数に指定したObservableに値が流れたときに、オペレーターが適用されたObservableを強制的に完了します。このように実装すると、複数のObservableになったときもクラスフィールドを増やすことなくそれぞれに `takeUntil` オペレーターを追加するだけです。

```typescript:explicit-subscribe.component.t
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataService } from '../data.service';

@Component({
  selector: 'app-explicit-subscribe',
  template: `<div>{{ value }}</div>`,
})
export class ExplicitSubscribeComponent implements OnInit, OnDestroy {
  value: any;
  private onDestroy$ = new Subject();

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.dataService.valueChanges
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(value => {
        this.value = value;
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
  }
}
```

## Asyncパイプを使う

ここまで明示的な購読をどのようにうまく書くかについて解説しましたが、そもそも明示的に購読しなければ、購読解除について考える必要もありません。ここからは Observableで提供されるデータをテンプレートにバインディングするときに使える **Async パイプ** を紹介します。基本的な方針として、Asyncパイプで解決できるケースでは常にAsyncパイプを利用し、 **明示的な購読は最低限に留めましょう。** Observableをコアにしたリアクティブなアプリケーション設計を進める上で Asyncパイプは必需品です。

先ほどの `ExplicitSubscribeComponent` と同じことを Asyncパイプで実装するコンポーネントを、 `AsyncPipeComponent` という名前で次のように作成します。

```typescript:async-pipe.component.ts
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '../data.service';

@Component({
  selector: 'app-async-pipe',
  template: `<div>{{ value$ | async }}</div>`,
})
export class AsyncPipeComponent {
  value$: Observable<any>;

  constructor(private dataService: DataService) {
    this.value$ = this.dataService.valueChanges;
  }
}
```

びっくりするほどコードがスッキリしました。購読や購読解除に関するコードはなくなりました。同期的な`value` フィールドを廃止して、Observable型の `value$`  フィールドに変更しています。`value$` フィールドには`valueChanges` を代入し、テンプレートで `{{ value$ | async }}` のように Asyncパイプを適用しています。

なぜこれほどコンポーネントのコードが少なくなったかというと、明示的な購読の例で記述していた `subscribe` メソッドの呼び出しや `unsubscribe` メソッドの呼び出しを Asyncパイプが肩代わりしているからです。 Asyncパイプが適用されたObservableは、そのコンポーネントのライフサイクルに合わせて自動的に購読・購読解除がおこなわれます。これにより、**開発者は面倒なRxJSのお作法から解放され、ビジネスロジックだけに集中できます**。たとえば、`valueChanges` で流れてくる値を操作したいと思ったときには、`this.value$` へ代入する際にオペレーターを追加するだけでいいのです。

```typescript
this.value$ = this.dataService.valueChanges.pipe(
  map(value => `Value: ${value}`)
);
```

もうひとつの良いところは、 **`this.value$` の初期化をコンストラクタで完結できることです。** 購読を開始しているわけではないため、クラスフィールドへの代入は `ngOnInit` まで待たなくてもよいのです。

:::message
Asyncパイプは、コンポーネントの初期化時にフィールドとして存在する、無限なObservableにのみ使われるべきです。つまりユーザーインタラクションなどによって後から発生するHTTPリクエストのような有限のObservableは、Asyncパイプを使うのに適していません。
:::

## Single State Streamパターン

Asyncパイプを使うときに注意するのは、同じObservableに複数回 Asyncパイプを適用してしまうことです。たとえば次のようなテンプレートを書いてしまうと、同じObservableを2度購読することになります。少しなら影響はありませんが、購読の数が増えるのはメモリ使用量が上昇し、本来不要な変更検知処理も実行されるので、パフォーマンスに悪影響があります。さらに、Asyncパイプの処理タイミングが別なので、2つのデータバインディングの解決が常に完全に同時であることは保証されません。

```html
<div>1. {{ value$ | async }}</div>
<div>2. {{ value$ | async }}</div>
```

この問題を解決するのが、筆者が **Single State Streamパターン**^[https://blog.lacolaco.net/2019/07/angular-single-state-stream-pattern/] と呼んでいる実装パターンです。テンプレートから参照するコンポーネントの状態を単一のストリームに合成し、Asyncパイプをテンプレートの先頭で1回だけ使うことで、その内側をあたかも同期的なテンプレートのように記述できます。


```html
<ng-container *ngIf="state$ | async as state" >
   <!-- 同期的に記述できる -->
    <div>1. {{ state.value }}</div>
    <div>2. {{ state.value }}</div>
</ng-container>
```

Single State Steamパターンを構成する重要な要素は **`ng-container` タグと `ngIf-as` 構文**です。まずはこれらを順番に紐解いていきましょう。

### ng-containerタグ

`<ng-container>` タグはAngularのテンプレート内でだけ使える特殊なタグです。このタグはテンプレート内で任意の範囲をブロック化するために使いますが、**実際にDOMへレンダリングされるときには除去されます**。

`*ngIf` や `*ngFor` のような[構造ディレクティブ](https://angular.jp/guide/structural-directives#ng-container-to-the-rescue)を使うときに、テンプレート内の階層構造をうまく表現するためのタグとしてよく用いられる擬似的なタグです。

### ngIf-as 構文

`*ngIf` の `as` 構文は、`*ngIf` に渡された式の評価結果を、テンプレート内で新しい変数に代入する機能です。同期的な `*ngIf` では使い所はありませんが、 Asyncパイプを併用すれば、Asyncパイプで得られた値が `*ngIf` に渡されるタイミングで、値を変数化できるのです。

```html
<ng-container *ngIf="user$ | async as user">
  {{ user.name }}
</ng-container>
```

しかしこのテンプレートには問題があります。`user$` がnullを返したとき、 `*ngIf` の評価はfalseとなるため、内側のブロック全体が表示されなくなります。これを解決するには、次のようにfalseだったときのテンプレートを指定できる`*ngIf` の `else` 構文を使う必要があります。

```html
<ng-container *ngIf="user$ | async as user; else nullUser">
  {{ user.name }}
</ng-container>
<ng-template #nullUser>
  User is null
</ng-template>
```

### Single State Streamの合成

値がnullだったときの表示は `else` 構文でカバーすることもできますが、テンプレートが肥大化しがちです。そもそもの原因は Observableがnullを流したときに `*ngIf` の評価結果が falseになってしまうことです。つまり、**常にtrueになるような評価式**にしておくことで `else` 構文を使わなくても常に同じテンプレートで Observableのデータを描画できます。

その解決法として、テンプレートが必要とする**状態を単一のストリーム**（Observable）に合成します。筆者はこのストリームを **Single State Stream** と呼んでいます。ストリームの合成にはRxJSの **`combineLatest` 関数**^[https://rxjs.dev/api/index/function/combineLatest]を利用します。はじめに合成されるストリームの型を `State` 型として定義し、コンポーネントが `state$: Observable<State>` フィールドを持つようにします。


```typescript:async-pipe.component.ts
import { combineLatest } from 'rxjs';

type State = {
  value: any;
};

@Component({})
export class AsyncPipeComponent {
  // Single State Stream
  readonly state$: Observable<State>;

  constructor(private dataService: DataService) {    
    this.state$ = combineLatest(
      [this.dataService.valueChanges], // 必要なストリームを合成する
      ([value]) => ({ value }), // 配列からオブジェクトに変換する
    );
  }
}
```

 今回の例では `valueChanges` にしか依存していませんが、複数のストリームをここで合成できます。`readonly` を付与しているため、この `state$` フィールドの値はコンストラクタ以外で変更されません。つまりコンポーネントのインスタンスが破棄されるまで同一のObservableオブジェクトを保持することを保証します。

こうして作成したSingle State Streamを、テンプレートの先頭で`ng-container` タグの `ngIf-as` 構文を使って購読します。結果として、 `value$ | async` という式で得られていた値が、 `state.value` という形でアクセスできるようになります。 `state` は常に `State` 型のオブジェクトですから、 `*ngIf` の評価がfalseになることはありません。

```html
<ng-container *ngIf="state$ | async as state">
  <div>1. {{ state.value }}</div>
  <div>2. {{ state.value }}</div>
</ng-container>
```

nullやundefined、`0` や `""` のような `*ngIf` の評価結果がfalseになってしまう値を Asyncパイプで扱うときには、Single State Streamパターンを使うのが便利です。そうでない場合にも、テンプレートでのAsyncパイプの使い方を統一できる利点もあり、ほとんどのコンポーネントに適用できる実用的な実装パターンです。

