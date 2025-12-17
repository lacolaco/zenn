---
title: 'Angular: Selectorlessがもうすぐやってくる'
published_at: '2025-04-09 23:13'
topics:
  - 'angular'
published: true
source: 'https://www.notion.so/Angular-Selectorless-1d03521b014a8070af87dfbe63ce9c9a'
type: 'tech'
emoji: '✨'
---

この記事では、Angularフレームワークに導入が検討されている新たな概念、"**Selectorless**" について解説する。 Angularは常に開発者の体験向上とアプリケーションの効率化を目指し進化を続けている。その最新の潮流の一つが Selectorless である。これは、Angular v14で導入されたStandalone Componentの思想をさらに推し進め、Angular開発のあり方を大きく変える可能性を秘めている。

## 背景

従来のAngular開発においては、コンポーネントやディレクティブはNgModuleというモジュールに属する必要があり、コンパイラが依存関係を解析する上で複雑さの一因となっていた。Angular v14におけるStandalone Componentの導入は、このNgModuleの抽象化を解消し、コンポーネント自身が依存関係を直接管理できるようにすることで、ビルド効率の向上に貢献した。

https://blog.angular.dev/the-future-is-standalone-475d7edbc706

しかし、Standalone Componentにおいても、テンプレート内でコンポーネントやディレクティブを参照する際には、HTML要素のセレクタを使用する必要がある。TypeScriptファイルでクラスをimportしているにも関わらず、セレクタと対応するクラスの関連性はコンポーネントファイルだけでは明確にならず、コンパイラはセレクタの定義を探しに行く必要がある。これは、単一ファイルコンパイルの理想を妨げ、ビルドの並列化を阻害する要因となっている。

さらに、ランタイムにおいても、セレクタによるコンポーネントやディレクティブのマッチング処理はパフォーマンス上のオーバーヘッドとなり、テンプレートを見ただけではどのコンポーネントやディレクティブが適用されているのかが分かりにくいという開発者体験上の課題も存在している。

## Selectorless: テンプレートでのクラス直接参照

これらの課題を解決するために検討されているのが "Selectorless" というアプローチである。これは、**テンプレート内でHTMLセレクタを使用する代わりに、コンポーネントやディレクティブのクラス名を直接参照する** というシンプルなアイデアに基づいている。これは、TypeScriptのコード内でimportしたクラスを直接利用するのと同じ直感的なアプローチである。

Angularの公式ロードマップでも、SelectorlessはStandalone Componentのエルゴノミクス向上とボイラープレート削減を目指すものとして以前から掲げられていた。

> Selectorless
> To reduce boilerplate and improve the ergonomics of standalone components we are now designing a solution that will make selectors optional. To use a component or directive you'll be able to import it and directly use it in a component's template.
> We're still in early stages of planning selectorless. We'll share a request for comments when we have an early design and we're ready for next steps.

[https://angular.dev/roadmap#future-work-explorations-and-prototyping](https://angular.dev/roadmap#future-work-explorations-and-prototyping)

Selectorlessのコンセプトをサンプルコードで理解しよう。次のようなコンポーネントを想像してほしい。

```typescript
@Component({
  selector: 'app-greeting',
  template: `<p>Hello, {{ name }}!</p>`,
})
export class Greeting {
  name = input('World');
}
```

上述の通り、Standalone Componentの導入でNgModuleの記述は不要になったが、テンプレート内での利用には依然としてセレクタが必要であった。この`Greeting`コンポーネントを利用する親コンポーネントでは、`imports`配列にコンポーネントを読み込んだうえでテンプレート中では`<app-greeting>`セレクタで参照する必要がある。

```typescript
import { Greeting } from './greeting';

@Component({
	selector: 'app-root',
  imports: [Greeting],
  template: `
    <app-greeting name="World" />
  `,
})
export class App {}
```

Selectorlessの具体的なシンタックスは今後のRFCで提案される見込みだが、現在検討中の案では次の例のように、テンプレート内でクラス名を直接参照できるようになる見込みだ。このように、セレクタの記述が不要になることで、より簡潔で直感的なテンプレート記述が期待される。

```typescript
import { Greeting } from './greeting';

@Component({
	selector: 'app-root',
  imports: [Greeting],
  template: `
    <Greeting name="World" />
  `,
})
export class App {}
```

現在、Selectorlessはまだ初期計画段階にあり、プロトタイプの実装が進められている。

https://github.com/angular/angular/pull/60724/files#diff-6398e1ffddbcd90e365c15608a4652a0eac83e7c442afe05cc70debcc93e5322

これらの実装はあくまでもプロトタイプで、未確定のデザインに基づくものであり、具体的な設計はこれから進められる。Signalsなど過去の提案と同じように、Angularチームは Request for Comments (RFC) を公開し、コミュニティからのフィードバックを求める予定だ。

## まとめ

Selectorlessは、Angular開発における新たなコンポーネント実装のコンセプトである。Standalone Componentの定着によりフレームワークが解決すべき課題が次のステージへ進んでいるとも言える。セレクタという抽象化を取り除くことで、開発効率やアプリケーションのパフォーマンス、そしてコードの可読性を向上させることが期待される。おそらく5月にリリースされるAngular v20の期間には、もっと具体的な姿が見えてくるだろう。今後の動向にぜひ期待しよう。

