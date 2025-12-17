---
title: 'Angular: Model Inputsで何が変わるのか'
published_at: '2024-02-24 12:18'
topics:
  - 'angular'
  - 'signals'
published: true
source: 'https://www.notion.so/Angular-Model-Inputs-fc06702ae32a483ea5464ed5b9c3b702'
type: 'tech'
emoji: '✨'
---

Angular v17.2にて、新しいSignal関連APIの**Model Inputs**が実装された。これはv17.0で実装されたSignal Inputsをベースにして拡張されたものだ。Model Inputsにより、これまで以上に幅広いユースケースでSignalベースのコンポーネントが作りやすくなった。この記事ではModel Inputsが開発者体験に与える具体的な影響をかいつまんで紹介する。

Signal Inputsについての解説は以前に書いたため、先に読んでいることを前提とする。

https://zenn.dev/lacolaco/articles/angular-signal-inputs

## Model Inputsとは

Model InputsはSignals RFCのSignal-based Componentsのセクションで提案されている。

https://github.com/angular/angular/discussions/49682

> Signal-based components additionally have access to a new type of input, **model inputs**.

> The `model` function defines a special kind of input that establishes a contract between parent component and child component. A model input gives you a `WritableSignal`, which propagates its value back to the source. This lets you create two-way bindings without any additional requirements.

Model Inputsの機能は`model`関数で提供される。これはSignal Inputの特殊なバージョンで、`input()`で作られたSignal Inputが読み取り専用なのに対して、`model()`で作れるModel Inputは書き込み可能な`WritableSignal`になる。このSignalの値が変更されたとき、自動的にその変更をコンポーネントのアウトプットとして出力できる。

次の`NameInputComponent`を例にしよう。このコンポーネントは親コンポーネントから入力値を受け取る`value`インプットを持っている。これは`model()`で作られたModel Inputなので親から値を受け取るだけでなく、`NameInputComponent`自身が値を更新できる。この例ではテキストフィールドの入力値を`value`フィールドに反映している。実は、**v17.2からは双方向バインディングに**`WritableSignal`**をそのまま渡すこともできるようになった**。そのため、`[(ngModel)]`にModel Inputのフィールドを渡すだけで、値の書き込みとユーザー入力からの反映を実現できる。双方向どちらに向けても変更の伝播のためのコードは一切必要ない。

```typescript
import { Component, model } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'name-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <label>Full Name: </label>
    <input type="text" name="fullname" [(ngModel)]="value" >
  `,
})
export class NameInputComponent {
  value = model(''); // Define a model input
}
```

親コンポーネントから見ると、Model Inputsはそのプロパティに対応する`**Change`アウトプットを内部的に生成している。この例の場合、`value`インプットに対応した`valueChange`アウトプットが存在しているとみなされ、Model Inputの値が更新されると`valueChange`で購読可能なイベントが発行される。

したがって、親コンポーネントは次のように双方向バインディングの構文`[(value)]`を使える。また、親コンポーネントが`WritableSignal`で値を持っていれば、**Signal-to-Signalの双方向バインディング**によって、親子コンポーネント間で値が同期される。もちろん`[value]`と`(valueChange)`を別々に使うこともできる。

```typescript
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NameInputComponent],
  template: `
		<!-- one-way binding -->
    <name-input [value]="name" /> 

		<!-- one-way listening -->
    <name-input (valueChange)="onChange($event)" /> 

		<!-- 2-way binding -->
    <name-input [(value)]="name" /> 

		<!-- signal-to-signal 2-way binding -->
    <name-input [(value)]="nameSignal" />
  `,
})
export class App {
  name = 'Angular';
  nameSignal = signal('Angular');
}
```

@[stackblitz](https://stackblitz.com/edit/angular-rmu4sg?ctl=1&embed=1&file=src/main.ts)

## Model Inputsで何が変わるのか

Model InputsはSignal Inputsの拡張版であるため、Signal Inputsが持つ利点はすべてModel Inputsにも共通する。それに加えて、Model Inputsによって次のような点で開発者体験に影響を与えるだろう。

### 双方向バインディングサポートのためのアウトプット宣言が不要になる

自作のコンポーネントのプロパティで双方向バインディングをサポートするためには`foo`インプットと`fooChange`アウトプットの両方を宣言しておく必要があった。単純にクラスフィールドが2つ必要で面倒だということもあるが、**フィールド名の暗黙的なルール**によって実現する機能なので、もしインプットかアウトプットのどちらかだけをリネームしてしまったら親コンポーネント側のテンプレートがコンパイルエラーになる。

Model Inputsであれば開発者が宣言するのは`model()`関数で生成されるフィールドひとつだけなので、コードの量が減るだけでなく、アプリケーションをより安定したものにできる。たまたま名前が一致して双方向バインディングが可能になっていたわけではなく、そのために宣言されているプロパティであるという意図を明確にできる。

### 変更通知のタイミングを考えなくてよい

親からインプットで与えられた値と、自身が更新する値の両方によって状態が更新されるようなケースでは、状態の変更を通知するタイミングや条件を誤ると状態が不整合になる。たとえば値が更新されたときに親コンポーネントやサービスなどに変更を通知するケースを考えよう。同期的なフィールドで状態を管理していると「**値が変更されたとき**」というイベントが無いため、リアクティブな宣言的記述はできない。状態を変更しうるすべての場所に変更通知用の処理を追記することになり、当然書き漏れる可能性が高い。RxJSのBehaviorSubjectなどを使って宣言的な記述をできるようにしているケースも多いが、Signalと比較すれば実現したいことに対して複雑すぎるアプローチだろう。

Model Inputsであれば値を更新するだけでそのSignalを購読している別の派生SignalやEffectだけでなく親コンポーネントへのアウトプットにも自動的に通知されるため、通知が漏れる心配はない。特に、親コンポーネントでもSignalで状態を管理しており、Signal-to-Signalの双方向バインディングを使う場合は、複数のコンポーネント間で簡単に状態が同期される。状態の伝播に失敗してアプリケーションの一部分が不整合に陥ることは減るだろう。

また、テキストフィールドのようなフォーム要素を内包するコンポーネントは、変更検知戦略をOnPushにしている場合にコンポーネント内部での状態の更新によって変更検知がトリガーされないことで、明示的な`markForCheck`を行っているケースもあるだろう。そういったテクニックも、Signalであれば不要になる。

## まとめ

Model Inputsの導入により、より多くのユースケースにおいてコンポーネント内の状態をSignalに置き換えられるようになった。同時に実装された双方向バインディングのSignalサポートは特に画期的で、これまでとは違うレベルでのコンポーネント間の状態の同期を可能にするだろう。Input Signalsとあわせてぜひ取り入れていきたい。

## 参考リンク

https://netbasal.com/angulars-model-function-explored-a-comprehensive-overview-4481d023c822

https://angular.io/api/core/model

