---
title: 'Angular v22.1: CSS変数のネームスペース化'
published_at: '2026-08-04 11:25'
topics:
  - 'angular'
  - 'css'
published: true
source: 'https://app.notion.com/p/Angular-v22-1-CSS-3b13521b014a80219d1ce585fc92df77'
type: 'tech'
emoji: '✨'
---

https://github.com/angular/angular/pull/68846

Angular v22.1でCSS変数をネームスペース化する新しい機能が追加された。その使い方について紹介する。

## Namespaced CSS Variables

**CSS変数のネームスペース化**とは、あるAngularアプリケーションのコンポーネントCSS内で宣言されたCSS変数を、別のアプリケーションやライブラリのCSS変数と衝突させないために名前空間で隔離するものだ。たとえば、`--primary-color`のようなよくある名前のCSS変数はアプリケーションで使うとサードパーティのUIライブラリと衝突することがよくある。この問題を回避するため、変数名に特定のprefixを付けて名前空間を分ける運用が一般的だが、今回の機能はそれを自動化してくれるものだ。

CSS変数のネームスペース化はオプトインの機能となっており、有効にしない限りこれまでの振る舞いが変わることはない。有効にするには、アプリケーションコンフィグに`provideCssVarNamespacing`プロバイダーを追加する。

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideCssVarNamespacing } from '@angular/platform-browser'; // ADD

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideCssVarNamespacing(), // ADD
  ]
};

```

デフォルトではアプリケーションの`APP_ID`でネームスペース化される。次のようなコンポーネントCSSは、画像のとおり`--ng_` というprefixが自動的に挿入される。

```typescript
@Component({
  selector: 'app-root',
  template: `<p>Component Scope Text</p>`,
  styles: `
    :host {
      --text-color: blue;
    }

    p {
      color: var(--text-color);
    }
  `,
})
export class App {}

```

![image](/images/angular-css-var-namespacing/CleanShot_2026-08-04_at_07.45.572x.875f648658105d02.png)

`provideCssVarNamespacing`関数に引数を渡すことで、任意の文字列を使ってネームスペース化することもできる。

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideCssVarNamespacing('app'),
  ]
};
```

![image](/images/angular-css-var-namespacing/CleanShot_2026-08-04_at_07.48.302x.278a376db158f1b1.png)

## Using Global CSS Variables

このネームスペース化を有効化すると、コンポーネントCSS内ではグローバルのCSS変数を利用することもできないし、値を変更することもできないように思えるが、ちゃんとそのための方法も用意されている。

たとえば、グローバルCSSにも`--text-color`変数が宣言されているとしよう。なにもしなければ、コンポーネント内のpタグに適用されているのはネームスペース化された変数なので、グローバルCSSの影響は受けず、色は変わらない。

```css
/* styles.css */

:root {
  --text-color: red;
}

p {
  color: var(--text-color);
}
```

![image](/images/angular-css-var-namespacing/CleanShot_2026-08-04_at_07.52.432x.32b37803f08da4eb.png)

コンポーネント内部でグローバルの`--text-color` 変数を参照したいときには、専用の`--global` prefixを使って明示的にネームスペース化を解除する。このprefixがあるときには、ネームスペース化がスキップされ、`--global`prefixが外された残りの部分が実際に適用される。もちろん参照するだけでなく、値の上書きもできる。

```typescript
@Component({
  selector: 'app-root',
  template: `
  <p>Component Scope Text</p> 
  <p data-global>Component Scope Text (global)</p>
  `,
  styles: `
    :host {
      --text-color: blue;
      --global--text-color: green; 
    }

    p {
      color: var(--text-color);
    }

    p[data-global] {
      color: var(--global--text-color);
    }
  `,
})
export class App {}
```

![image](/images/angular-css-var-namespacing/CleanShot_2026-08-04_at_07.58.392x.98219dd25053b751.png)

## Caveats

ネームスペース化を有効化することで、アプリケーション外部で構築されたデザインシステム等でCSS変数が使われている場合、それを取り込んで利用することもできるし、アプリケーション内部でCSS変数を使ってもデザインシステムを壊さないことが保証される。CSS変数を活用するプロジェクトでは基本的に有効化しておきたい機能だ。

ただし注意点がある。v22.1.0時点では、CSS変数のネームスペース挿入はコンポーネントCSSにしか適用されない。つまり、テンプレートHTML内でstyle属性に与える値は対象外だ。

```html
<!-- グローバルの --text-color を参照する -->
<p [style.color]="'var(--text-color)'"> 
```

テンプレートHTMLの中でネームスペース化されたCSS変数を使う場合は、`CssVarNamespacer`サービスを使ってTypeScript側で解決する必要がある。次のように、`CssVarNamespacer`の`namespace`メソッドで解決した戻り値をバインディングすれば、動的なスタイリングにもネームスペースを適用できる。

```typescript
import { CssVarNamespacer } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  template: `
    <p [style.color]="'var(' + textColor + ')'">Component Scope Text (inline)</p>
  `,
  styles: `
    :host {
      --text-color: blue;
    }
  `,
})
export class App {
  // namespaced `--text-color` 
  textColor = inject(CssVarNamespacer).namespace('--text-color'); 
}

```

また、もうひとつ勘違いしやすい注意点として、このネームスペース化は**アプリケーションレベルでの分離**であり、**コンポーネントレベルではない**ことだ。コンポーネントCSSをスコープ化するView Encapsulationとは別の仕組みとして存在しており、コンポーネント間ではこれまでどおりDOMツリー上の親子関係に従って影響する。むしろそのようにコンポーネント境界を超えてCSS変数が注入できることに意味があるので欠陥ではないのだが、ネームスペース化の挙動と混同しないようにしよう。

## Conclusion

Angular v22.1のCSS変数ネームスペース化は、コンポーネントCSS内の変数衝突を自動的に回避しつつ、既存のコードでの運用（prefix付与など）を置き換えられる実用的な改善だ。`provideCssVarNamespacing()`を追加するだけで導入でき、必要に応じて任意のprefixも指定できる。

また、グローバル変数を参照・上書きしたいケースに対しては`--global` prefixによる明示的な回避方法が用意されている。一方で、現時点ではテンプレートのインラインスタイルには自動適用されない。テンプレートHTMLを経由するユースケースにおいては、`CssVarNamespacer`で解決して使う必要がある。

CSS変数を広く活用しているプロジェクトほど恩恵が大きいので、まずはオプトインで試してみる価値がある。

