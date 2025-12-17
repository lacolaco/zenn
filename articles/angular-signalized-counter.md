---
title: 'Angular: ドメインロジックをシグナル化する（カウンター編）'
published_at: '2024-12-03 00:00'
topics:
  - 'angular'
  - 'signals'
published: true
source: 'https://www.notion.so/Angular-14d3521b014a80599134c652a0a858c2'
type: 'tech'
emoji: '✨'
---

これはAngularアドベントカレンダー 3日目の記事です。昨日はaerealさんでした。

https://qiita.com/advent-calendar/2024/angular

しっかりしたのは25日に向けて書くので、今回は軽めのネタです。Signalをそのまま使うのではなく、ある特定のルールを持った値を「**シグナル化**」する試みを出していこうと思います。第一弾として、いわゆるカウンターをシグナル化してみます。

## Signalized counter

というわけで完成形です。

```typescript
import { Signal, signal } from '@angular/core';

export type CounterSignal = Signal<number> & {
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  asReadonly: () => Signal<number>;
};

export function counterSignal(initialValue = 0): CounterSignal {
  const counter = signal(initialValue);
  return Object.assign(counter.asReadonly(), {
    increment: () => counter.update((v) => v + 1),
    decrement: () => counter.update((v) => v - 1),
    reset: () => counter.set(initialValue),
    asReadonly: () => counter.asReadonly(),
  });
}
```

`CounterSignal`はシグナルとして読み取り用のインターフェースを備えつつ、書き込みについては専用のメソッドだけが公開されており、通常の`WritableSignal`にある`set()`や`update()`は持っていません。これにより、カウンターとしてのルールに従った方法でのみ値が更新されうるシグナルオブジェクトを作ることができます。`asReadonly()`は書き込み操作を不能にするためのお作法です。

実際に使うとこんな感じです。自身の更新ロジックを内包しているので利用側はメソッドを呼ぶだけです。

```typescript
import { counterSignal } from './signalized';

@Component({
  selector: 'app-root',
  template: `
  <p>{{ counter() }}</p>
  <div>
    <button (click)="counter.increment()">++</button>
    <button (click)="counter.decrement()">--</button>
    <button (click)="counter.reset()">RESET</button>
  </div>
  `,
})
export class App {
  readonly counter = counterSignal();
}
```

こんな感じで、組み込みのシグナルAPIを直接使うだけでなく、ビジネスロジックやドメインモデルを「**シグナル化**」するというアプローチはけっこう面白いと思っているので、思いついたらまた記事を書きます。

実際に動作するサンプルコードはこちらです。

@[stackblitz](https://stackblitz.com/edit/stackblitz-starters-km7hri?ctl=1&embed=1&file=src%2Fsignalized.ts)

ありがとうございました。Angularアドベントカレンダー、明日はtakataroさんです。

https://qiita.com/advent-calendar/2024/angular

