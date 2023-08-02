---
title: 'Angular Signalsとコンポーネント間通信'
published_at: '2023-08-02 12:02'
topics:
  - 'Angular'
  - 'Signals'
published: true
source: 'https://www.notion.so/Angular-Signals-9de77b78554f4e23b970c8ff5a57d2ce'
type: 'tech'
emoji: '✨'
---

Angularアプリケーションの実装でSignalsを使う場面が増えたので、コンポーネント間の通信において手に馴染む実装パターンがわかってきた。それをいくつかメモしておく。

## Plain Input/Output

子コンポーネントのほうは何の変哲もない、普通のInput/Outputを持っている。親はInput/Outputに対するバインディングにSignalを直接割り当てる。いままでのAngularと大きく変わらないSignalの使い方だと思われる。これだと単に親コンポーネントの状態管理がRxJSのSubjectからSignalに置き換わっただけだという感触。

```typescript
@Component({
  selector: 'app-sushi-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select [ngModel]="value" (ngModelChange)="valueChange.emit($event)">
      <option *ngFor="let option of sushiOptions" [ngValue]="option">
        {{ option }}
      </option>
    </select>
  `,
})
export class SushiSelectorComponent {
  @Input() value: SushiType = 'tuna';
  @Output() valueChange = new EventEmitter<SushiType>();

  readonly sushiOptions = sushiOptions;
}

@Component({
  selector: 'my-app',
  standalone: true,
  imports: [CommonModule, SushiSelectorComponent],
  template: `
    <app-sushi-selector
      [value]="$selectedSushi()"
      (valueChange)="$selectedSushi.set($event)"
    />
    <p>Selected Sushi: {{ $selectedSushi() }}</p>
  `,
})
export class App {
  readonly $selectedSushi = signal<SushiType>('tuna');
}
```

@[stackblitz](https://stackblitz.com/edit/angular-yscmpy?ctl=1&embed=1&file=src/main.ts)

ところで、Signalの変数名に `$` プレフィックスをつけるアイデアは以下の記事を真似してみている。記号的に SignalのSに似てもいるので、悪くないように思うが別になくても困りはしない。

https://dev.to/oz/application-state-management-with-angular-signals-1371

## Signalized Input/Output

子コンポーネントの内部でもSignalを使うパターンとして、まずはInput/Outputのインターフェースはそのままに、内部の状態保持をSignalizeしたもの。クラスフィールドとして `$value` Signalを持ち、InputはこのSignalへの入力に、OutputはこのSignalからの出力に接続する。

親コンポーネントとのインターフェースにだけプレーンなオブジェクトを使い、内部ではすべてSignalを中心に実装する。これは現段階のSignals APIで可能なアプローチの中ではけっこう気に入っている。Signalをどう使ったらいいか迷っている人はとりあえず真似してみてもよいと思う。

```typescript
@Component({
  selector: 'app-sushi-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select [ngModel]="$value()" (ngModelChange)="$value.set($event)">
      <option *ngFor="let option of sushiOptions" [ngValue]="option">
        {{ option }}
      </option>
    </select>
  `,
})
export class SushiSelectorComponent {
  protected readonly $value = signal<SushiType>('tuna');

  @Input() set value(v: SushiType) {
    this.$value.set(v);
  }
  @Output() valueChange = toObservable(this.$value);

  readonly sushiOptions = sushiOptions;
}
```

@[stackblitz](https://stackblitz.com/edit/angular-xymevb?ctl=1&embed=1&file=src/main.ts)

## Direct Signal Input

最後のパターンは、親コンポーネントが持っているSignalオブジェクトをそのままInputとして渡すアプローチで、たしかにこれは簡潔さでいえばもっとも簡潔になる。SignalというオブジェクトそのものがInputとOutputの機能を持っているわけなので、わざわざコンポーネントにOutputを定義しなくても子がSignalの値を更新すれば親はその通知を受けられるというわけである。

これは簡潔ではあるものの、まだ積極的に取り入れるには早いように思う。メンタルモデルとして、AngularコンポーネントのInputというのはこれまで値渡しであることがほぼ常であり、子から親へのメッセージはイベントによって表現されてきた。その定石を崩し、Inputに渡したSignalの中身が子によって書き換えられると親のほうに直接逆流するようになるのは、リアクティブプログラミングとしては直感的だが、状態の変更経路が予測しづらくなる点に注意が必要だ。正直まだおすすめできない。

```typescript
@Component({
  selector: 'app-sushi-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select [ngModel]="$value()" (ngModelChange)="$value.set($event)">
      <option *ngFor="let option of sushiOptions" [ngValue]="option">
        {{ option }}
      </option>
    </select>
  `,
})
export class SushiSelectorComponent {
  @Input() $value: WritableSignal<SushiType> = signal('tuna');

  readonly sushiOptions = sushiOptions;
}

@Component({
  selector: 'my-app',
  standalone: true,
  imports: [CommonModule, SushiSelectorComponent],
  template: `
    <app-sushi-selector [$value]="$selectedSushi" />
    <p>Selected Sushi: {{ $selectedSushi() }}</p>
  `,
})
export class App {
  readonly $selectedSushi = signal<SushiType>('tuna');
}
```

@[stackblitz](https://stackblitz.com/edit/angular-2fgxwr?ctl=1&embed=1&file=src/main.ts)

こうなってくるとそのInputがSignalの参照を要求し、親子間で直接的なデータの同期をするためのものであることを示すのに `$` プレフィックスは役立ちそうな予感はする。

ちなみにこのような双方向バインディングについては `model` APIで検討されているため、このメンタルモデルに慣れておくと将来的にはSignalをより使いこなす準備とも言えるかもしれない。

[https://github.com/angular/angular/discussions/49682](https://github.com/angular/angular/discussions/49682)
