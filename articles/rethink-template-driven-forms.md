---
title: 'Angular: テンプレート駆動フォーム再考'
published_at: '2023-05-07 09:41'
topics:
  - 'angular'
  - 'forms'
published: true
source: 'https://www.notion.so/Angular-4e8bcf7e4c2c4d31806bff592edf4232'
type: 'tech'
emoji: '🔍'
---

Angular のフォームAPIにはテンプレート駆動フォームとリアクティブフォームの2種類があり、リリース当初からその使い分けは常に議論の種になってきた。Angular v14から導入された Typed Forms が現状はリアクティブフォームだけに適用されることもあり、歴史的にはリアクティブフォームのほうが好まれてきたように思う。だがその評価がなんとなくの惰性によるものになっているような感覚がある。ここでは、Angular v16 を前提にしてあらためてテンプレート駆動フォームを評価してみたい。

## リアクティブフォームの利点だと考えられているもの

[公式ドキュメント](https://angular.jp/guide/forms-overview#choosing-an-approach) では、2つのアプローチを使い分ける理由が次のようにまとめられている。

> **Reactive forms** provide direct, explicit access to the underlying forms object model. Compared to template-driven forms, they are more robust: they're more scalable, reusable, and testable. If forms are a key part of your application, or you're already using reactive patterns for building your application, use reactive forms.

> **Template-driven forms** rely on directives in the template to create and manipulate the underlying object model. They are useful for adding a simple form to an app, such as an email list signup form. They're easy to add to an app, but they don't scale as well as reactive forms. If you have very basic form requirements and logic that can be managed solely in the template, template-driven forms could be a good fit.

リアクティブフォームはフォームモデルを明示的に扱うことで、テンプレート駆動と比べて堅牢であり、スケーラブルで、再利用しやすく、テストしやすい。このように書かれている。一方、テンプレート駆動はその名のとおりテンプレートを通じてフォームモデルにアクセスするため、導入はしやすいがスケールしにくいとある。

果たして、リアクティブフォームがテンプレート駆動と比べて優れているらしい点は、本当にそうなのだろうか。再考してみよう。

## フォームのスケーラビリティ

そもそもフォームにおけるスケーラビリティとはどのような性質を指すのか、[公式ドキュメント](https://angular.jp/guide/forms-overview#scalability)ではこう書かれている。

> If forms are a central part of your application, scalability is very important. Being able to reuse form models across components is critical.  
> Reactive forms are more scalable than template-driven forms. They provide direct access to the underlying form API, and use [synchronous data flow](https://angular.jp/guide/forms-overview#data-flow-in-reactive-forms) between the view and the data model, which makes creating large-scale forms easier. Reactive forms require less setup for testing, and testing does not require deep understanding of change detection to properly test form updates and validation.  
> Template-driven forms focus on simple scenarios and are not as reusable. They abstract away the underlying form API, and use [asynchronous data flow](https://angular.jp/guide/forms-overview#data-flow-in-template-driven-forms) The abstraction of template-driven forms also affects testing. Tests are deeply reliant on manual change detection execution to run properly, and require more setup.

リアクティブフォームはテンプレートから独立したフォームモデルを TypeScript コードで直接扱うため、特定のコンポーネントに依存しない再利用性の高いモジュールに切り出すことが簡単である。これが第一のスケーラビリティであるようだ。つまり、アプリケーションが大きくなり、同じようなフォームを構築する場面が増えた時にもフォームに関する部分を再利用できるというDRYの観点である。

ただし、ここで述べられているスケーラビリティはそれだけではない。もうひとつの観点として、同期的なデータフローであることが大規模なフォームを構築するのに役立つと書かれている。これはどういうことか。フォームモデルの状態を変化するためにテンプレートの変更検知を介さないことで、フォームの状態がいつどのように変更されるのかを管理しやすいということだろう。

加えて、テストの観点についてもリアクティブフォームの優位性が書かれている。リアクティブフォームはテンプレート駆動と比べてテストのセットアップが少なく変更検知に関する深い理解が求められない、ということらしい。

だが、実際のところこれらの特徴はリアクティブフォームだけのものなのか、仮にそうだとしても、利点となりうるような特徴なのだろうか？

### フォームの再利用性

リアクティブフォームはテンプレートから独立してフォームモデルを構築するといっても、アプリケーションのUIと組み合わせるためには結局 `[formGroup]` や `[formControl]` といったディレクティブで DOM 要素と接続しなければならない。また、フォームグループやフォーム配列などの構造化されたフォームは、その構造を DOM 構造と対応付けることになる。つまり、テンプレート上でフォームモデルを組み立てないというだけで、動作する基盤は当然ながらDOMを構築するテンプレート上にある。この点で、フォームモデルの再利用性という観点には疑問符が付く。

最小単位の入力コントロールを再利用する手段は `ControlValueAccessor` で確保されている。これはリアクティブフォームもテンプレート駆動フォームも変わらない。そうではなく `FormGroup` や `FormArray` といった構造を伴うフォームモデルを再利用するとき、それがテンプレートと切り離されることにどれだけ利点があるだろうか？フォームモデルだけを切り出したところで、同じような構造のテンプレートを再利用する場所ごとに書くことになる。DRYを重視するというのであれば、テンプレートを含めたコンポーネントの単位で再利用するのが筋ではないだろうか？この点で、フォームモデルを再利用しやすいという特徴は、そもそもの効用に疑う余地がある。

### データフロー

リアクティブフォームでは、明示的な `setValue()` や `patchValue()` によって即時に状態をまとめて変更できるが、テンプレート駆動フォームではテンプレート評価のタイミングを待たなくてはならない。これは確かに差異ではあるが、このためにリアクティブフォームを選択するほどの特徴にはならないように思う。特に、v16からはSignalsの導入によってリアクティブな値を表現するプリミティブな方法が与えられた。 `ngModel` と合わせる形で Signals を使えば、これまでは同期的なクラスフィールドでしか使えなかったユースケースで、リアクティビティを確保できる。

v16.0 時点ではまだ `[(ngModel)]="signal"` という記述はできないが、Signals の RFC で提案されていたように、これも時間の問題である。現状でも getter と setter を分離すれば問題なく組み込むことができる。

```typescript
@Component({
  selector: 'my-app',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1>Signals with template-driven forms</h1>

    <form #form="ngForm" (ngSubmit)="onSubmit()">
      <input
        name="message"
        [ngModel]="message()"
        (ngModelChange)="message.set($event)"
      />

      <button [disabled]="!form.valid">submit</button>
    </form>
  `,
})
export class App {
  readonly message = signal('Hello');

  constructor() {
    effect(() => {
      console.log(`message changed`, this.message());
    });
  }

  onSubmit() {
    console.log(this.message());
  }
}
```

@[stackblitz](https://stackblitz.com/edit/angular-tck8xj?ctl=1&embed=1&file=src/main.ts)

### テスト容易性

この観点は `TestBed` を使ったテストの変更検知に依存するテスト全てに言えるが、Signals を前提にしたリアクティビティを確保されれば課題は一気に解決する。すぐには解決しないかもしれないが、時間の問題だろう。

また、コンポーネントをクラスインスタンスではなくDOMでテストすることを前提にすれば、そのDOMに紐付いているフォームモデルがどのように構築されているかは知らなくていい知識のはずである。テンプレート駆動であってもリアクティブフォームであっても関係なく、フォームが期待通りに振る舞うようなテストこそが必要ではないだろうか？

### バリデーターの定義

カスタムバリデーターの定義が関数で記述できるというのはリアクティブフォームの特徴として語られることが多い。実際に、テンプレート駆動フォームにバリデーターを適用するにはバリデーターもテンプレート上で呼び出せるようディレクティブである必要はある。だが、教科書どおりに1バリデーターにつき1ディレクティブを作らないといけない理由はどこにもない。

次の例ではリアクティブフォームと同じく関数形式で作成したカスタムバリデーターを、 `WithValidators` というディレクティブを通じて適用している。カスタムバリデーターを関数で書けさえすればいいのなら、この方法でもなんら変わらないはずだ。

@[stackblitz](https://stackblitz.com/edit/angular-zr2659?ctl=1&embed=1&file=src/main.ts)

## テンプレート駆動フォームで何が困るのか？

このように見ると、リアクティブフォームでしか得られない大きな利点というのは Signals の登場によってなくなってきているように感じられる。とはいえ、ゼロではない。次の点はまだ確かにリアクティブフォームでしか得られない恩恵があるだろう。

- Typed Forms: テンプレート駆動フォームにはまだ厳密な型推論の恩恵が受けられず、テンプレート上のインターフェースには `any` が残る。
  - 特に `nonNullable` の恩恵は大きい。
  - だが、Typed Forms のRFC での議論を見るに、これも時間の問題である。
- Observable パイプラインとの接続: RxJS による Observable パイプラインによってアプリケーションのデータフローを構築する場合は、 リアクティブフォームの `valueChanges` といったインターフェースに利点がある。
  - とはいえ Signals には RxJS との相互運用 API もあるため、大した違いではなさそうだ。

このような状況でリアクティブフォームを使うなら、これまでとは違う惰性ではない理由付けが必要だ。軽い用途にはテンプレート駆動、プロダクション用途ならリアクティブフォームという安直な評価はもはやできそうにない。それぞれのアプリケーションにとって、Signalsを得てもなおリアクティブフォームを選択することで何が得られるのかをもう一度考えるべきだろう。
