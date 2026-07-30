---
title: 'Angular v22.1 における oxc-parser の採用'
published_at: '2026-07-30 12:57'
topics:
  - 'angular'
  - 'angular cli'
  - 'oxc'
published: true
source: 'https://app.notion.com/p/Angular-v22-1-oxc-parser-3ad3521b014a8112a97de82bb32e5d55'
type: 'tech'
emoji: '✨'
---

Angular CLI v22.1.0では、`@angular/build` のビルドパイプラインの一部が Babel から oxc-parser + magic-string に移行された。

https://github.com/angular/angular-cli/commit/10dc30f9c680f46f65b5beb030f2a75c422a3e71

https://github.com/angular/angular-cli/commit/917393a4cd85172574b155f727da5c1eae196fb1

対象は angular/angular-cli リポジトリのみであり、angular/angular の依存関係に oxc は含まれていない。ngtsc および `@angular/compiler` は TypeScript のままである。移行されたのは esbuild に渡す前段の JS → JS 変換処理に限られる。

## oxc-parser の役割

oxc は Rust 製の JavaScript ツールチェーンで、**oxc-parser**はそのパーサ部分を NAPI 経由で Node.js から利用するパッケージである。`parseSync(filename, code, options)` で AST を取得し、`Visitor` で走査する。

oxc-parserがコンパイル後JSをASTに変換したあと、最適化のためのコード書き換えは **magic-string**という別のライブラリが行う。oxc には Rust 製のトランスフォーマ（`oxc-transform` パッケージ）もあるが、現状そちらは使用していない。

```typescript
import { MagicString } from 'magic-string';
import { Visitor, parseSync } from 'oxc-parser';
```

## @angular/build の変化

今回の変更では、Angular CLIのビルド時最適化プロセスの一部がBabelプラグインベースの処理機構からoxc-parser + magic-string による独自の処理機構に切り替わった。その目的はBabel依存の除去とビルド時間の短縮である。

Babelプラグインベースの処理機構では、元コードをASTにパースし、ASTを書き換えたうえで最終的にASTからコード全体を生成し直す。これに対して、新しい処理機構ではoxc-parserでパースしたASTは書き換えず、元のコード中で変更が必要な範囲だけをmagic-stringを使った文字列処理で書き換える。Babelが必要ないケースでは、より高速なoxc-parserを使うことでビルド時間の短縮を図ろうということである。

### 移行前: BabelプラグインによるAST編集

移行前の `javascript-transformer-worker.ts` は、カバレッジ計装・Angular Linker・最適化用の4プラグインをすべて `plugins` 配列に積み、`transformAsync` を呼ぶ構成だった。

```typescript
if (options.advancedOptimizations) {
  const { adjustStaticMembers, adjustTypeScriptEnums, elideAngularMetadata, markTopLevelPure } =
    await import('../babel/plugins');

  const sideEffectFree = options.sideEffects === false;
  const safeAngularPackage =
    sideEffectFree && /[\\/]node_modules[\\/]@angular[\\/]/.test(filename);

  plugins.push(
    [markTopLevelPure, { topLevelSafeMode: !safeAngularPackage }],
    elideAngularMetadata,
    adjustTypeScriptEnums,
    [adjustStaticMembers, { wrapDecorators: sideEffectFree }],
  );
}

// ...

const result = await transformAsync(data, {
  filename,
  inputSourceMap: (useInputSourcemap ? undefined : false) as undefined,
  sourceMaps: useInputSourcemap ? 'inline' : false,
  compact: false,
  configFile: false,
  babelrc: false,
  browserslistConfigFile: false,
  plugins,
});
```

最適化用の4プラグインが行っていた処理は以下のとおり。いずれも tree shaking のためのマーキングである。

- `markTopLevelPure`: トップレベルの関数呼び出し・コンストラクタ呼び出しに `/*#__PURE__*/` を付与
- `elideAngularMetadata`: `ɵsetClassMetadata` などの呼び出しを除去
- `adjustTypeScriptEnums`: TypeScript が出力した enum を pure な IIFE で包む
- `adjustStaticMembers`: `ɵcmp` `ɵfac` などの静的メンバを pure IIFE で包む

### 移行後: magic-stringによる文字列編集

4つのプラグインは `oxc-transform.ts` の `transform()` に統合された。パース後のASTを走査しながら、すべての編集を1つの `MagicString` に積む。

```typescript
export function transform(filename: string, code: string, options: OxcTransformOptions) {
  const { program } = parseSync(filename, code, { range: true });
  const s = new MagicString(code);
  // ...
```

Angular metadata の除去は以下のように実装されている。

```typescript
if (calleeName && angularMetadataFunctions.has(calleeName)) {
  const parentFunc = functionStack[functionStack.length - 1];
  if (
    parentFunc &&
    (parentFunc.type === 'FunctionExpression' ||
      parentFunc.type === 'ArrowFunctionExpression')
  ) {
    s.overwrite(node.start, node.end, 'void 0');
    markEdited(node.start, node.end);

    return;
  }
}
```

`angularMetadataFunctions` の中身は `ɵsetClassMetadata` / `ɵsetClassMetadataAsync` / `ɵsetClassDebugInfo` の3つ。該当する呼び出し式の範囲を `void 0` で上書きする。pure アノテーションのような挿入は `appendLeft` / `appendRight` を使う。

```typescript
s.appendLeft(decl.id.end, ' = /*#__PURE__*/ ');
```

### Babelをバイパスする経路

ビルド後JSの処理プロセスである `javascript-transformer-worker.ts` は2フェーズに分割された。

```typescript
let code = data;

// If Babel is needed, run it first
if (babelPlugins.length > 0) {
  const result = await transformAsync(code, { /* ... */ plugins: babelPlugins });
  code = result?.code ?? code;
}

// Run advanced optimizations using our fast oxc-transform
if (options.advancedOptimizations) {
  const { transform } = await import('../babel/plugins/oxc-transform.js');
  const sideEffectFree = options.sideEffects === false;
  const safeAngularPackage =
    sideEffectFree && /[\\/]node_modules[\\/]@angular[\\/]/.test(filename);
  const topLevelSafeMode = !safeAngularPackage;

  const result = transform(filename, code, {
    sourcemap: useInputSourcemap,
    sideEffects: options.sideEffects,
    jit: options.jit,
    topLevelSafeMode,
  });
  code = result.code;
  // ...
}
```

`babelPlugins` に積まれる可能性があるのは、カバレッジ計装と Angular Linker の2つだけになった。この2つが不要な場合は `transformAsync` に到達せず、`@babel/core` の動的 import も発生しない。Linker が必要になるのは `ɵɵngDeclare` を含むファイル、すなわち partial compilation されたライブラリに限られる。

以上がビルド時最適化におけるoxc-parserの導入で、同様にi18nインライン化処理もBabelをバイパスできるようになった。

## 今後の見通し

一部の処理でBabelを呼び出さないバイパス経路ができたが、`@babel/core` はまだ v22.1.0 の依存関係に残っている。実行時に Babel が動く経路は2つある。

1つはコードカバレッジ計装で、`istanbul-lib-instrument` の `programVisitor` が Babel プラグインの形でしか利用できないため、`karma` builder で `codeCoverage: true` を指定した場合に Babel が実行される。この経路については、Vitestベースの `@angular/build:unit-test` ビルダーへの移行によって消えることになる。

もう1つは Angular Linker で、`@angular/compiler-cli/linker/babel` をそのまま使用している。Angular Linker を oxc に移行する [PR #33625](https://github.com/angular/angular-cli/pull/33625) は執筆時点で open であり、v22.1 には含まれていない。これもマージされると、モダンなAngularプロジェクトにおいてBabelを呼び出す経路はすべてなくなることになる。依存関係が完全に消えるのはまだ先だが、ビルド高速化の恩恵はすぐに得られるだろう。

なお、現状oxc-parserはJSへのコンパイル後処理における採用のみであり、TypeScriptコードやテンプレートHTMLのコンパイルを担っている領域については何も変更はない。公式からの一次情報もないため、誤解しないように。

