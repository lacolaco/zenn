---
title: 'AngularのSignal Forms（プロトタイプ）をチラ見する'
published_at: '2024-12-25 00:00'
topics:
  - 'angular'
  - 'signals'
  - 'forms'
published: true
source: 'https://www.notion.so/Angular-Signal-Forms-14d3521b014a803ea815c7030c8e4287'
type: 'tech'
emoji: '✨'
---

これはAngularアドベントカレンダー 25日目の記事です。昨日はAKAIさんでした。

https://qiita.com/advent-calendar/2024/angular

シグナルベースの新しいフォームAPIはAngularのロードマップにおいても注目されています。それがいったいどんなものになるのか、2025年に予想される動きをチラ見して期待を高めておくことにしましょう。

## Signal Forms

実は現在、AngularレポジトリでSignal FormsのAPIをどのようにデザインするか実験するためのブランチができています。このブランチではプロトタイプをいくつか作成し、最初の草案を作成することを目指しています。ここである程度固まったアイデアを元に、コミュニティからのフィードバックを募るRFCが作られる見込みです。

https://github.com/angular/angular/blob/prototype/signal-forms/packages/forms/experimental/README.md

では具体的なアイデアを見てみましょう。

### 1. スキーマロジック関数によるフォーム構築

[https://github.com/angular/angular/blob/prototype/signal-forms/packages/forms/experimental/src/prototype1/README.md](https://github.com/angular/angular/blob/prototype/signal-forms/packages/forms/experimental/src/prototype1/README.md)

このアイデアでは、フォーム全体の構造を組み立てるための部品となる、スキーマロジック関数を導入しています。

もっとも基本的なパーツは、`field()` や`group()` といったフォームの構造を決定する関数です。リアクティブフォームにおける`FormControl`や`FormGroup`を想像すればわかりやすいでしょう。

```typescript
const nameSchema = group({
  first: field(''),
  last: field(''),
});
```

`group()` や `field()` によって生成されるそれぞれのパーツには `disabled()` や `validate()` などのロジックを指定するメソッドがあります。これらのメソッドは現在の値をシグナルとして受け取って結果を返す関数の形を取ります。次の例では、`validate()`メソッドの引数として渡される関数は内部的に`computed()`で処理されるため、`value()`シグナルに更新があるたびにバリデーションが実行されるということでしょう。

```typescript
field(0).validate((value) => (value() > 9 ? 'too big' : null));
```

`xlink()`という特別なメソッドは別のフィールドの値に依存したロジックを定義するためのものです。パスワードの確認フィールドなどが想定されますね。次の例ではファーストネームとラストネームが同じであるときにエラーにしています。

```typescript
const nameSchema = group({
  first: field(''),
  last: field(''),
}).xlink({
  last: (schema, form) =>
    schema.validate((value) =>
      form.first.$() === value() ? 'cannot be the same as your first name' : '',
    ),
});
```

定義済みのスキーマは別のスキーマの定義にマージすることもできるようです。

```typescript
const userSchema = group({
  name: nameSchema,
  address: group({
    street: field(''),
    city: field(''),
    state: field(''),
    zip: field(''),
  }),
});
```

ここまではスキーマを定義しただけで、スキーマは値の保持などを行いません。次の`form()`関数にスキーマを与えることによって状態を含むフォームモデルとして完成します。

```typescript
const nameForm = form(nameSchema, { first: 'John', last: 'Doe' });
```

今のプロトタイプでは現在の入力値を取り出すシグナルは `.$` というシグネチャのようです。フォームモデルはスキーマの各パーツごとに状態をシグナルとして取り出すことができます。次の例だと、`nameForm.$`も取得できますし、`nameForm.first.$`も取得できます。それぞれのシグナルには書き込みもできて、シグナルに値を書き込むとフォームモデルも更新されます。

```typescript
const nameSignal = nameForm.$;
const firstNameSignal = nameForm.first.$;
nameSignal(); // => {first: 'John', last: 'Doe'}
nameSignal.set({ first: 'Bob', last: 'Loblaw' });
firstNameSignal(); // => 'Bob'
```

ざっと見てきましたが、このアイデアの特徴は次の点です。

- `group()` や `field()` といった部品を組み合わせて**フォームスキーマ**を定義する。
- `form()` 関数にフォームスキーマを渡すことでフォームモデルを作成する
- フォームモデルは内部の各コントロールの値や状態をシグナルで提供する（上記コードでは `$` が値の取得を表している）

ざっくりいえば、関数の合成によってスキーマを組み立てるのがこのアイデアです。考え方としては[zod](https://github.com/colinhacks/zod)のようなライブラリと似ています。スキーマはフォームモデルは内部で生成するシグナルの構造を決定します。つまり、入力値をシグナルとして管理する責任はアプリケーション側ではなくフォームモデル側が持っています。

また、このフォームモデルをテンプレートとDOMにどのように紐づけるのかはまだ未知数です。

### 2.フォームフィールドによるシグナルの紐づけ

[https://github.com/angular/angular/blob/prototype/signal-forms/packages/forms/experimental/src/idea2/README.md](https://github.com/angular/angular/blob/prototype/signal-forms/packages/forms/experimental/src/idea2/README.md)

このアイデアはさきほどのスキーマ方式とは対照的に、 `ngField` というディレクティブを中心とするテンプレートベースのアプローチです。

> Main idea: have a directive `ngField` that sets a field as the current field for all controls beneath it. controls can then inject the current field and register themselves to control its value and/or use some of the field's values in its bindings. To facilitate binding all of the relevant properties/attributes, another directive `ngBindField` binds all applicable bindings for common native controls.

```typescript
import { Component, signal } from '@angular/core';
import { NativeInput } from './native-controls';
import { FormField, NgBindField, NgField } from './ngfield';

@Component({
  selector: 'app-root',
  template: `
    <div *ngField="field">
      <label ngBindField></label>:
      <input ngBindField />
    </div>
    <input [ngField]="field" ngBindField />
    <!-- could have input[ngField] auto-bind -->
  `,
  imports: [NgField, NgBindField, NativeInput],
})
export class App {
  field = new FormField(signal('value'), signal('label'));
}
```

`FormField` クラスのインスタンスはひとつのフォーム上のフィールドに対応し、値とラベルをそれぞれシグナルで渡して初期化しています。そのインスタンスを `ngField` ディレクティブに紐づけます。

このアプローチの肝は、入力値を管理するシグナルを作成する責任がコンポーネント側にあることです。`FormField` クラスや`NgField`ディレクティブは受け取ったシグナルをDOMと橋渡しするだけで、シグナルの作成はしていません。シグナルの作成と管理についてアプリケーション側で自由にできます。

## 現状のプロトタイプへの所感

今のAngularにはテンプレート駆動とリアクティブフォームの2つのフォームAPIがありますが、現状のプロトタイプでいえばテンプレート駆動はアイデア2の`FormField`、リアクティブフォームはアイデア1のスキーマロジック関数と通じるところがあります。

スキーマロジック関数はなかなか複雑です。リアクティブフォームからRxJSを抜いてシグナルAPIベースにしたものと考えると、リアクティブフォームと同じく、そもそも複雑なフォームを構築するための多機能なAPIとして考えたほうがよさそうです。少なくとも今のままではAngularを学び始めた段階の人には難しすぎるだろうと思います。

一方、`FormField` のほうはシグナルネイティブで再設計されたというだけで、やっていることは現状の`ngModel`とそれほど大した違いはないし、このままの路線ならむしろ`ngModel`よりも軽量な実装になると思われます。アプリケーションのバンドルサイズにシビアな環境でも最低限のフォーム構築支援を行うという路線ならこれでもアリかもしれないです。また、このレベルならギリギリでチュートリアルに載せてもいいんじゃなかろうかと思います。

シグナルベースのフォームAPIもこれまでと同じく2種類のアプローチを提供するのか、統一された1つのアプローチにするのかはわかりませんが、今のところどちらのAPIもいまいちまだハマってない気がしています。今後のさらなるプロトタイピングに期待したいと思います。

---

Angularアドベントカレンダーに参加してくださったみなさん、ありがとうございました！また来年も知見を交換していきましょう。よいお年を！

https://qiita.com/advent-calendar/2024/angular
