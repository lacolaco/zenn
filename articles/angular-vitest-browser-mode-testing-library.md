---
title: 'Angular: Vitest Browser Modeへの移行とTesting Library Custom Matcher'
published_at: '2026-01-30 23:03'
topics:
  - 'angular'
  - 'testing'
  - 'vitest'
  - 'testing library'
published: true
source: 'https://www.notion.so/Angular-Vitest-Browser-Mode-Testing-Library-Custom-Matcher-2e93521b014a80579534cd937331ad0b'
type: 'tech'
emoji: '✨'
---

## 結論

VitestのBrowser Modeで使う`expect` APIにははじめからDOM要素向けカスタムマッチャが組み込まれているので `@testing-library/jest-dom` は必要ない。

https://vitest.dev/api/browser/assertions.html

## Vitest移行とTesting Library

Angularプロジェクトのユニットテスト環境をAngular CLI公式のVItestサポートに移行しても、Angular Testing Libraryは変わらず使える。いまとなってはTesting LibraryなしでAngularコンポーネントのテストを書くことは考えたくない。

https://testing-library.com/docs/angular-testing-library/intro/

Testing Libraryを使ってテストを書く場合、アサーション用のカスタムマッチャを導入しているケースのほうが多いだろう。`toBeVisible`や`toBeDisabled`のようにDOM特有のアサーションを簡単にしてくれる。

```typescript
expect(screen.queryByTestId('not-empty')).not.toBeEmptyDOMElement()
expect(screen.getByText('Visible Example')).toBeVisible()
```

Karma/Jasmineであれば`@testing-library/jasmine-dom` 、Jestであれば `@testing-library/jest-dom` をインストールして、テストセットアップファイルでカスタムマッチャの登録をする必要がある。VitestのNode.js実行モードで同じことをするには、`@testing-library/jest-dom/vitest`をインポートすればよい。Jest版と同じカスタムマッチャをVitest互換で提供してくれる。

[https://github.com/testing-library/jest-dom/blob/main/README.md#with-vitest](https://github.com/testing-library/jest-dom/blob/main/README.md#with-vitest)

## Vitest Browser ModeのAssertion

しかし、AngularのユニットテストをVitestに移行したうえで、実行環境をNode.jsではなくBrowser Modeにした場合は事情が変わる。

https://vitest.dev/guide/browser/

Browser Modeで使えるexpectには、はじめから`@testing-library/jest-dom` と同等の組み込みマッチャが存在する。なので何も導入する必要がない。

> Vitest provides a wide range of DOM assertions out of the box forked from @testing-library/jest-dom library with the added support for locators and built-in retry-ability.

[https://vitest.dev/api/browser/assertions.html](https://vitest.dev/api/browser/assertions.html)

さらにカスタムマッチャだけでなく、`expect.element`というAPIによって、タイミングによってflakyになりがちなDOM要素の取得を自動リトライしてくれる機能もある。これまではTesting Libraryの`waitFor`などで工夫する必要があったが、これからは`expect.element`を使ってもいいだろう。

```typescript
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

test('error banner is rendered', async () => {
  triggerError()

  // This creates a locator that will try to find the element
  // when any of its methods are called.
  // This call by itself doesn't check the existence of the element.
  const banner = page.getByRole('alert', {
    name: /error/i,
  })

  // Vitest provides `expect.element` with built-in retry-ability
  // It will repeatedly check that the element exists in the DOM and that
  // the content of `element.textContent` is equal to "Error!"
  // until all the conditions are met
  await expect.element(banner).toHaveTextContent('Error!')
})
```

## Angular CLIのVitest Browser Modeサポート

Angular v21.0アップデート時点ではBrowser Modeへのマイグレーションは用意されていなかったが、v21.2に向けてサポートが入ってきている。

https://github.com/angular/angular-cli/commit/f80db6fb714aa326f6ed03a8a51090ca59ad0955

このコミットは`ng add @vitest/browser-playwright` のように、`ng add`コマンドでVitestのBrowser Mode用モジュールを導入できるようにするものだ。ただパッケージをインストールするだけでなく、設定ファイルの自動セットアップをしてくれる。あらかじめVitest実行環境に移行できている必要はあるが、`ng new`で作成した直後のプロジェクトからあっという間にBrowser Modeに移行できるだろう。

https://angular.dev/guide/testing/migrating-to-vitest

Karma/Jasmine環境からVitestへの移行は既存テストのJasmine依存が強いほど大変ではあるが、しかしひと手間だけ我慢して一気にBrowser Modeまで導入してしまうことを個人的にはおすすめしたい。実行環境を実ブラウザのまま維持したほうが、JSDOMとの間の互換性の心配をしなくていいからだ。逆にもともとJest環境だった場合はBrowser Modeには移行せずデフォルトのNode.jsモードのままでいいだろう。

## まとめ

Vitest Browser Modeへの移行により、`@testing-library/jest-dom`のような追加パッケージが不要になり、DOM要素向けカスタムマッチャが標準で使える。また`expect.element`による自動リトライ機能も組み込まれている。Angular v21.2以降では`ng add`コマンドによる導入が可能になる予定だ。

Karmaが非推奨だからという消極的な理由だけでなく、モダンな開発者体験の恩恵を受けるためにも、なるべく多くのAngularプロジェクトでVitestに移行してもらいたい。

