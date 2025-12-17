---
title: 'Angular v19: linkedSignal() の解説'
published_at: '2024-10-28 23:10'
topics:
  - 'angular'
  - 'signals'
published: true
source: 'https://www.notion.so/Angular-v19-linkedSignal-12d3521b014a80f395ffd9c289dd689e'
type: 'tech'
emoji: '✨'
---

この記事ではAngular v19で新たに追加されるSignal関連の実験的API `linkedSignal()` について解説する。なお、書いている時点で最新の `v19.0.0-next.11` をベースにしているため、正式リリースまでに変更される可能性はある。また、そもそも実験的APIなのでリリース後にも変更されている可能性はあることに注意してほしい。

## `linkedSignal()` とは何か？

`linkedSignal()` を一言で説明すると、`computed()`と`signal()` を足して2で割ったようなものだ。言い換えれば、`signal()`のように書き換え可能な`WritableSignal`型でありつつ、`computed()`のように別のシグナルの変更から派生した値を生成できる性質もある。

具体的なコード例で考えてみよう。ユーザーがセレクトボックスからアイテムを選択できるUIがあり、どのアイテムが選択されたのかを状態として保持する必要があるとする。次の例では `FavoriteFoodSelector` コンポーネントが、親コンポーネントからインプットとして与えられる`options`シグナルの値（選択候補）をセレクトボックスに表示している。そして、選択中の値を`selectedFood`シグナルで管理している。セレクトボックスからアイテムが選択されると、`selectFood`メソッドを通じて値が更新される。

```typescript
const initialOptions = ['apple', 'banana', 'cheese'];

@Component({
  selector: 'app-favorite-food-selector',
  template: `
  <select #select [value]="selectedFood()" (change)="selectFood(select.value)">
    <option value="">--</option>
    @for(option of options(); track option) {
      <option [value]="option">{{ option }}</option>
    }
  </select>
  @if(selectedFood()) {
    <p>{{ selectedFood() }} is selected</p>
  } @else {
    <p>Select your favorite food </p>
  }
  `,
})
export class FavoriteFoodSelector {
  options = input(initialOptions);
  
  selectedFood = /* ??? */
  
  selectFood(food: string) {
    this.selectedFood.set(food); 
  }
}
```

さて、このような実装で、`selectedFood`シグナルはどのように作成できるだろうか。単純に考えれば、次のように`signal()`によって書き換え可能な`WritableSignal`を作ることになるだろう。

```typescript
export class FavoriteFoodSelector {
  options = input(initialOptions);
  
  selectedFood = signal<string|null>(null);
  
  selectFood(food: string) {
    this.selectedFood.set(food); 
  }
}
```

ただし、ここで追加の要件がある。親コンポーネントから渡される`options`が更新されたら、その時点で選択中の値は破棄して未選択状態にリセットしなければならないとしよう。どうすればそれが実現できるだろうか？まずは`effect()`を使う方法が思い浮かぶかもしれない。`options`の値が変わったことをトリガーにして非同期的にリセットする方法だ。だがこの方法には問題があることは[以前書いた記事で説明している](https://zenn.dev/lacolaco/articles/angular-v19-effect-changes)。

```typescript
export class FavoriteFoodSelector {
  options = input(initialOptions);
  
  selectedFood = signal<string|null>(null);
  
  constructor() {
	  effect(() => {
	    this.options(); // 変更の購読のためのgetter呼び出し
	    this.selectedFood.set(null);
	  })
  }
  
  selectFood(food: string) {
    this.selectedFood.set(food); 
  }
}
```

したがって、`effect()`を使わずに`computed()`を使った書き方によって実現するのが、v18までのプラクティスである。しかしこのシグナルを返すシグナルという方法はパターンとして知っていないと普通は思いつかないと思われるし、知っていたとしても複雑で直感的ではない。

```typescript
export class FavoriteFoodSelector {
  options = input(initialOptions);
  
  selectedFood = computed(() => {
	  this.options(); // 変更の購読のためのgetter呼び出し
	  return signal<string|null>(null);
  });

  selectFood(food: string) {
    this.selectedFood().set(food); 
  }
}
```

前置きが長くなったが、ここで`linkedSignal()`が登場する。`linkedSignal()`はこの`computed()`を使って派生的に`WritableSignal`を生成するパターンを標準化したAPIである。つまり、上記の例は次のように書き換えられる。

```typescript
export class FavoriteFoodSelector {
  options = input(initialOptions);
  
  selectedFood = linkedSignal({
    source: this.options,
    computation: (): string | null => null, // Unselect on input change
  });
  
  selectFood(food: string) {
    this.selectedFood.set(food); // Linked signal is writable
  }
}
```

`linkedSignal()`は引数にオブジェクトを受け取る。`source`フィールドはそのシグナルが派生元として依存する上流のシグナルを渡す。そして`computation`フィールドには`source`のシグナルに変更があったときに値を生成する算出式を渡す。この場合だと`options`シグナルが変更されると、`computation`関数を呼び出した結果として値がnullにリセットされることになる。

一見すると`computed()`と同じように感じるが、`linkedSignal()`が返すのは`WritableSignal`である。つまり、`selectFood()`メソッドで値を更新できる。普段は`signal()`で生成された普通の`WriableSignal`として振る舞いつつ、上流のシグナルが変更されたときには自動計算によって値が更新されるわけである。

上述のように、あるコンポーネント内部の状態値が、コンポーネント内部での変更だけでなく上位の状態にも影響を受けて変更されるのであれば、`linkedSignal()`がマッチするだろう。上流から与えられた初期値に対して、ユーザー操作により変更が加えられるようなケースでは、これまでの`signal()`と`computed()`よりもかなり簡潔な記述ができるようになる。

## まとめ

- `linkedSignal()`は、`signal()`と`computed()`の特性を組み合わせた新しいAPIである。
- 書き換え可能な`WritableSignal`でありながら、他のシグナルの変更から派生した値を生成できる。
- コンポーネント内部の状態が、内部での変更と上位の状態両方の影響を受ける場合に特に有用。
- 従来の`signal()`と`computed()`の組み合わせよりも、より簡潔で直感的な記述が可能。
- 実験的APIであるため、正式リリース前後で変更される可能性がある点に注意が必要。

https://github.com/angular/angular/pull/58189

今回のサンプルコードはStackblitzに置いてあるので自由に使ってほしい。

@[stackblitz](https://stackblitz.com/edit/stackblitz-starters-fmerva?ctl=1&embed=1&file=src%2Fmain.ts)

