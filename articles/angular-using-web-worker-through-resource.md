---
title: 'Angular: Using Web Worker through Resources'
published_at: '2025-03-26 10:33'
topics:
  - 'angular'
  - 'web worker'
  - 'signals'
published: true
source: 'https://www.notion.so/Angular-Using-Web-Worker-through-Resources-1c23521b014a8006826df570a3e9e91c'
type: 'tech'
emoji: '✨'
---

この記事では、Angularの`resource` APIを通じてWeb Workerを使うアプローチの実装例を紹介する。`resource` はそのユースケースがHTTP通信をSignalと接続するものだというイメージが強いが、値の解決が非同期であるならどこにでも`resource`の出番はある。HTTP通信には専用の`httpResource` APIが登場したことも踏まえて、`resource`にはそれ以外の道での活躍を考えたほうがいい。

[Web Worker](https://developer.mozilla.org/ja/docs/Web/API/Web_Workers_API)は言わずとしれたJavaScriptにおけるマルチスレッドプログラミングのための機能だ。別スレッドで処理をしてその結果を受け取るというのは、必然的に非同期的な処理になる。そして、Promiseで表現できる非同期処理はなんでも`resource`でラップできる。負荷の高い計算処理をメインスレッドから逃がすというシナリオで簡単なサンプルを実装してみよう。

## Using Web Worker

まずはAngularアプリケーションにWeb Workerを導入しよう。Angular CLIは `ng generate` コマンドでWeb Workerを使うためのファイルを生成してくれる。適当に生成した新規プロジェクトで、次のコマンドを実行する。

```shell
$ ng generate web-worker echo
```

https://angular.jp/ecosystem/web-workers

このコマンドを実行すると、`echo.worker.ts` と`tsconfig.worker.json` の2つのファイルが生成され、angular.jsonファイルの中にwebWorkerTsConfig設定が追加される。これでAngular CLIは`echo.worker.ts`をWeb Workerとして実行できるようにビルドする。

`echo.worker.ts` は受け取ったメッセージをそのまま返却するが、負荷の高い計算処理をシミュレートする目的で1秒の遅延を加えることにする。これでWeb Worker側の実装は終わりである。

```typescript
/// <reference lib="webworker" />

addEventListener('message', ({ data }) => {
  const response = data || 'No Message';
  // delay for 1 second to simulate a slow calculation
  setTimeout(() => postMessage(response), 1000);
});
```

## Web Worker over Resource

次に、AngularアプリケーションからWeb Workerを呼び出すための実装を追加する。まずはecho関数を作成し、Web Workerでの処理をPromiseにラップしておく。やることは単純で、Workerに対して`postMessage`でメッセージを送り、`onmessage`でPromiseを解決するだけだ。

今回はサンプルなので、関数呼び出しのたびに`new Worker()`を呼び出している。現実的には一度作成したWorkerインスタンスは再利用しないとオーバーヘッドが大きいことに注意してほしい。

```typescript
function echo(message: string): Promise<string> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./echo.worker', import.meta.url));
    worker.onmessage = ({ data }) => {
      worker.terminate();
      resolve(data);
    };
    worker.postMessage(message);
  });
}
```

この`echo`関数をAngularの`resource` APIと接続する。ユーザーがテキストフィールドで文字列を入力したら、それをWorkerに送ってレスポンスを表示するようにしてみよう。`message`フィールドは入力されたテキストの値を保持するSignalで、`workerMessage`はWorkerから返されたメッセージを保持するResourceである。`workerMessage`は`message`の値が変わるたびに`echo`関数を呼び出して値を解決する。

```typescript
@Component({
  selector: 'app-root',
  imports: [FormsModule],
  template: `
    <div>
      <input type="text" [(ngModel)]="message" />
      <p>
        Worker:
        {{ workerMessage.isLoading() ? 'Waiting...' : workerMessage.value() }}
      </p>
    </div>
  `,
})
export class AppComponent {
  readonly message = signal('hello');

  readonly workerMessage = resource({
    request: () => ({ message: this.message() }),
    loader: ({ request }) => echo(request.message),
  });
}
```

![](/images/angular-using-web-worker-through-resource/3c6255ea-b6c7-4055-8126-638d2819f0c3/b4c6abe2-5bb0-41d4-a5c8-4578a74260f3.gif)

キャプチャから実際に動いている様子が確認できる。同様のことはもちろん`resource` を使わなくても実現できるが、`resource`でラップすることによる利点もある。もちろんResourceインターフェースの`isLoading()`や`error()`などのSignalが使いやすいのはもちろんだが、特に大きいのは、RxJSでいうところの`switchMap`的な効果、つまり同時に複数の解決が走って値の更新がコンフリクトするということが起きない点だ。

キャプチャでも実はその様子がわかるが、テキストを変更してから値が返ってくるまでの1秒間にさらにテキストが変更されると、Resourceの読み込みは再度トリガーされる。このとき、すでに先行する読み込みが走っていた場合はそれをキャンセルし、常に最新のリクエストでのみ値が解決されるようになっている。素のPromiseやObservableでラップしただけではこの点で工夫が必要になるが、`resource` APIでは何もしなくてもコンフリクトを回避してくれる。

## まとめ

- Angularの`resource` APIをWeb Workerと組み合わせることで、非同期処理の実装を簡素化できる
- HTTP通信以外の非同期処理でも`resource` APIは有用なツールとなる
- 値の解決の競合を自動的に回避してくれる機能は、Web Worker利用時に特に有効
- ローディング状態の管理が容易になり、実装が簡潔になる

今回のコードの全体はGitHubで公開している。

https://github.com/lacolaco/angular-webworker-resource-example
