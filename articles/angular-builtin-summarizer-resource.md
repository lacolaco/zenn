---
title: 'Angular: Built-in AI をSignal化する summaryResource の実装'
published_at: '2026-04-27 16:49'
topics:
  - 'angular'
  - 'signals'
  - 'dependency injection'
  - 'chrome'
  - 'ai'
published: true
source: 'https://www.notion.so/Angular-Built-in-AI-Signal-summaryResource-34f3521b014a80149b66c11891b89391'
type: 'tech'
emoji: '✨'
---

Chromeが内蔵する組み込みAI機能である Summarizer API を使ってブログ記事を要約できるようにした記事を以前投稿した。

https://developer.chrome.com/docs/ai/summarizer-api?hl=ja

https://blog.lacolaco.net/posts/implement-article-summary-feature

今回は、Angularアプリケーション中でこのSummarizer APIを使うにあたって、非同期処理をAngularのResource APIでラップする実装を試してみた。Signalで管理されたアプリケーションの状態と連動するかたちでリアクティブにSummarizer APIを呼び出してみよう。

動作するサンプルはStackBlitzで確認できる。Summarizer APIをサポートしているのがChromeだけなので、Chrome以外では動かないことには注意。

@[stackblitz](https://stackblitz.com/github/lacolaco/angular-built-in-ai?ctl=1&embed=1&file=src%2Fapp%2Fapp.ts)

## 試作品: `summaryResource`

まずは最終的な完成形、`summaryResource`のインタフェースを紹介する。次の`App`コンポーネントでは、テキストエリアにバインドされた`input`文字列シグナルを引数に、`summaryResource`関数を呼び出している。戻り値の`SummaryResource`は、Summarizer APIの状態を`summary.summarizerAvailability()`ステータスシグナルとして、`input`の内容が要約された結果を`summary.value()`文字列シグナルとして提供している。

```typescript
import { Component, signal } from '@angular/core';
import { debounce, form, FormField } from '@angular/forms/signals';
import { summaryResource } from './summarized.resource';

@Component({
  selector: 'app-root',
  imports: [FormField],
  template: `
    <div>
      <h1>Built-in AI Summarizer</h1>

      <div>
        <div>
          <label for="input-text">入力テキスト</label>
        </div>
        <textarea
          id="input-text"
          [formField]="inputForm"
          placeholder="要約したい長文をここに貼り付け"
        ></textarea>
      </div>

      <section>
        @switch (summary.summarizerAvailability()) {
          @case ('unavailable') {
            <p>要約機能は利用できません。</p>
          }
          @case ('downloadable') {
            <button type="button" (click)="summary.initialize()">
              要約機能を初期化
            </button>
          }
          @case ('downloading') {
            <p>要約機能をダウンロード中…</p>
          }
          @case ('available') {
            @switch (summary.status()) {
              @case ('idle') {
                <p>テキストを入力すると要約が表示されます。</p>
              }
              @case ('loading') {
                <p>要約しています…</p>
              }
              @case ('error') {
                <p>{{ summary.error()?.message }}</p>
              }
              @case ('resolved') {
                <p>{{ summary.value() }}</p>
              }
            }
          }
        }
      </section>
    </div>
  `,
})
export class App {
  protected readonly input = signal('');
  readonly inputForm = form(this.input, (control) => {
    debounce(control, 500);
  });

  protected readonly summary = summaryResource(this.input, {
    summarizerOptions: {
      outputLanguage: 'ja',
    },
  });
}
```

Angular組み込みの`httpResource`と似たようなメンタルモデルで内部の非同期処理を隠蔽し、動的な値に対する非同期処理の結果をResource型で表現できている。

ここからはこの`summaryResource`がどのように作られているかを解説する。

## Summarizer API

上述の記事でも一度紹介しているし、最新の情報は公式を参照してほしいためあまりSummarizer API自体の詳細には立ち入らない。まずはアプリケーションからSummarizer APIを直接呼び出す関数を作成する。次のコードでは、実行環境に `Summarizer` 変数がそもそもあるかどうかの検出と、`Summarizer.availability`、`Summarizer.create`の呼び出しをラップする関数を書いている。これでアプリケーションの他の場所からはSummarizer APIの呼び出し方の詳細について知らずに済む。

```typescript
// ai/summarizer.ts
export const isSummarizationSupported = 'Summarizer' in self;

export async function getBuiltinAISummarizerAvailability(
  options?: SummarizerCreateCoreOptions,
): Promise<Availability> {
  if (!isSummarizationSupported) return 'unavailable';
  return Summarizer.availability(options);
}

export async function createBuiltinAISummarizer(
  options: SummarizerCreateOptions = {},
): Promise<Summarizer> {
  const availability = await getBuiltinAISummarizerAvailability(options);
  if (availability === 'unavailable') {
    throw new Error('Summarizer API is unavailable on this device.');
  }
  return Summarizer.create(options);
}
```

## SummarizerFactory

ここは今回の本質的な部分ではないが、実践的にBuilt-in AI機能を使うためには必要になる環境差異の吸収部分だ。Summarizer APIが利用できない環境では何も要約しないNoop実装に差し替わるよう、DIで切り替わるようにしている。もちろんテストにおいても任意のSummarizer実装に置き換えられるフックポイントでもある。

```typescript
// summarizer-factory.ts
import { Injectable } from '@angular/core';
import {
  createBuiltinAISummarizer,
  getBuiltinAISummarizerAvailability,
  isSummarizationSupported,
} from './ai/summarizer';

@Injectable({
  providedIn: 'root',
  useFactory: () =>
    isSummarizationSupported ? new BuiltinAISummarizerFactory() : new NoopSummarizerFactory(),
})
export abstract class SummarizerFactory {
  abstract availability(options?: SummarizerCreateCoreOptions): Promise<Availability>;
  abstract create(options?: SummarizerCreateOptions): Promise<Summarizer>;
}

@Injectable()
export class BuiltinAISummarizerFactory extends SummarizerFactory {
  override availability(options?: SummarizerCreateCoreOptions): Promise<Availability> {
    return getBuiltinAISummarizerAvailability(options);
  }

  override create(options?: SummarizerCreateOptions): Promise<Summarizer> {
    return createBuiltinAISummarizer(options);
  }
}

@Injectable()
export class NoopSummarizerFactory extends SummarizerFactory {
  override async availability(): Promise<Availability> {
    return 'available';
  }

  override async create(): Promise<Summarizer> {
    // Minimal stub for environments without Built-in AI API support / tests.
    return {
      summarize: async (input: string) => input,
      summarizeStreaming: () => new ReadableStream<string>(),
      destroy: () => {},
    } as unknown as Summarizer;
  }
}
```

## SummaryResource

ここが`summaryResource`関数の本体だ。少し複雑なので順を追ってパーツを見ていく。

まずは関数の戻り値になる`SummaryResource`型について。これはAngularが提供する`Resource<T>`型に2つのフィールドを追加している。`summarizerAvailability`はその名の通り、Summarizerインスタンスそれ自体の利用可否状態をシグナル化したものだ。そしてもうひとつの`initialize`は、`Summarizer`インスタンスの作成を明示的にトリガーするための関数だ。

```typescript
/**
 * {@link summaryResource} が返す Resource。
 * 標準の `Resource<string>` に Summarizer 固有のプロパティを加えたもの。
 */
export interface SummaryResource extends Resource<string> {
  /** Summarizer の利用可否。`Summarizer.availability()` の戻り値を反映する。 */
  readonly summarizerAvailability: Signal<Availability>;

  /**
   * Summarizer を生成して要約を開始する。冪等。
   * `summarizerAvailability()` が `'downloadable'` のときはユーザー操作起点（クリック等）で呼ぶ必要がある。
   */
  initialize(): void;
}
```

なぜ`initialize`が必要かというと、Summarizer APIが内部で利用するAIモデルは必要になったときにオンデマンドでダウンロードされるのだが、そのダウンロード開始にはユーザーのアクションが必要という仕様だからだ。つまり、ページの読み込みなどのイベントでは開始できず、ボタンのクリックなどユーザーのインタラクションによるイベントをトリガーにする必要がある。

[https://developer.chrome.com/docs/ai/get-started#user-activation](https://developer.chrome.com/docs/ai/get-started#user-activation)

> If the device can support built-in AI APIs, but the model is not yet downloaded, the user must meaningfully interact with your page for your application to start a session with `create()`.

よって、`summaryResource`では、次のように`factory.availability`の呼び出し結果が`available`または`downloading`のときだけ、自動的に`initialize`を呼び出すように条件分岐している。

```typescript
export const summaryResource = (
  source: () => string,
  options: {
    summarizerOptions?: SummarizerCreateOptions;
    injector?: Injector;
  } = {},
): SummaryResource => {
  const injector = options.injector ?? inject(Injector);
  const factory = injector.get(SummarizerFactory);
  const summarizerOptions = options.summarizerOptions;

  const state = signal<ResourceSnapshot<string>>({ status: 'idle', value: '' });
  const summarizerAvailability = signal<Availability>('unavailable');

  let initialized = false;

  const initialize = async () => {
    if (initialized) {
      return;
    }
    initialized = true;
    // ...
  }

  factory.availability(summarizerOptions).then((availability) => {
    if (availability === 'unavailable') {
      initialized = true;
      state.set({ status: 'idle', value: '' });
      return;
    }
    if (availability === 'available' || availability === 'downloading') {
      initialize();
    }
  });

  return {
    ...resourceFromSnapshots(state),
    summarizerAvailability,
    initialize,
  };
};
```

続いて、`Summarizer`インスタンスの作成について。次のように、`initialize`関数では、`factory.create`関数を呼び出してSummarizerインスタンスを作成する。この`factory.create`関数のPromiseはモデルのダウンロードを待つことになる。つまり、Promiseが解決した時点で`summarizerAvailability`は`available`だ。

また、Resourceの破棄と連動して、`DestroyRef`を使った`Summarizer`のインスタンス破棄もおこなっている。これにより意図しないメモリリークを防いでいる。

```typescript
export const summaryResource = (
  source: () => string,
  options: {
    summarizerOptions?: SummarizerCreateOptions;
    injector?: Injector;
  } = {},
): SummaryResource => {
  const injector = options.injector ?? inject(Injector);
  const destroyRef = injector.get(DestroyRef);
  const factory = injector.get(SummarizerFactory);
  const summarizerOptions = options.summarizerOptions;

  const state = signal<ResourceSnapshot<string>>({ status: 'idle', value: '' });
  const summarizerAvailability = signal<Availability>('unavailable');

  let initialized = false;
  let activeSummarization: Promise<string> | null = null;

  const initialize = async () => {
    if (initialized) {
      return;
    }
    initialized = true;

    const summarizer = await factory.create(summarizerOptions);
    summarizerAvailability.set('available');
    destroyRef.onDestroy(() => {
      summarizer.destroy();
    });
  };

  return {
    ...resourceFromSnapshots(state),
    summarizerAvailability,
    initialize,
  };
};
```

最後に、入力テキストをリアクティブに要約する部分の実装だ。次のコードでは、`initialize`関数の中で`effect`を宣言している。この`effect`は`source`シグナルを購読するもので、`source`が更新されたらこの関数が再実行される。入力テキストが空でなければ、`summarizer.summarize`関数を呼び出して、要約を生成する。この要約処理は時間がかかるため、要約している間に入力テキストが更新されている可能性がある。古い要約が無駄に処理されないよう、`activeSummarization` 変数による状態管理と、`AbortController`と`onCleanUp`関数による中断処理も実装しているのがポイントだ。

```typescript
export const summaryResource = (
  source: () => string,
  options: {
    summarizerOptions?: SummarizerCreateOptions;
    injector?: Injector;
  } = {},
): SummaryResource => {
  const injector = options.injector ?? inject(Injector);
  const destroyRef = injector.get(DestroyRef);
  const factory = injector.get(SummarizerFactory);
  const summarizerOptions = options.summarizerOptions;

  const state = signal<ResourceSnapshot<string>>({ status: 'idle', value: '' });
  const summarizerAvailability = signal<Availability>('unavailable');

  let initialized = false;
  let activeSummarization: Promise<string> | null = null;

  const initialize = async () => {
    //...

    effect(
      (onCleanUp) => {
        const input = source();
        if (!input.trim()) {
          state.set({ status: 'idle', value: '' });
          return;
        }

        const abortController = new AbortController();
        onCleanUp(() => {
          abortController.abort();
        });

        const summarizePromise = summarizer.summarize(input, { signal: abortController.signal });
        activeSummarization = summarizePromise;


        state.set({ status: 'loading', value: '' });
        summarizePromise
          .then((result) => {
            // 古い summarize の結果で新しい状態を上書きしないよう、最新の Promise のみ反映する。
            if (activeSummarization === summarizePromise) {
              state.set({ status: 'resolved', value: result });
            }
          })
          .catch((error) => {
            if (activeSummarization === summarizePromise) {
              state.set({ status: 'error', error });
            }
          });
      },
      { injector },
    );
  };

  //...

  return {
    ...resourceFromSnapshots(state),
    summarizerAvailability,
    initialize,
  };
};
```

これらを組み合わせることで冒頭の`summaryResource`が完成する。ソースコードの全体を読みたい場合は、StackBlitzかGitHubで確認できる。

https://github.com/lacolaco/angular-built-in-ai/blob/main/src/app/summarized.resource.ts

## まとめ

- Chrome の Built-in AI である Summarizer API を、Angular の Resource API と Signal を使ってリアクティブに扱うための `summaryResource` を試作した。
- `SummaryResource` は `Resource<string>` を拡張し、Summarizer の利用可否を示す `summarizerAvailability` と、ユーザー操作起点で初期化するための `initialize()` を提供する。
- モデルのオンデマンドダウンロードはユーザーアクティベーションが必要なため、`availability` に応じて自動初期化するか、ボタンなどから `initialize()` を明示的に呼ぶ設計にしている。
- 実装では DI で `SummarizerFactory` を切り替え、非対応環境では Noop 実装にフォールバックできるようにした。
- 入力テキストの要約は `effect` で購読し、`AbortController` と最新 Promise のみを反映するガードで、入力更新に追従しつつ無駄な処理や競合を避けている。

