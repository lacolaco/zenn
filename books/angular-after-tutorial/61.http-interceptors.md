---
title: "第3章 実践HttpClient - インターセプターによる介入"
---

このページでは、HttpClientの重要な機能であるインターセプターについて解説します。

## インターセプターの基本

インターセプターはHttpClientの内部で実行され、HttpClientの処理に割り込むための根幹的な機能です。リクエストやレスポンスの中身を検証、改変する目的に使われます。インターセプターはAngularのサービスクラスとして定義し、それをDI機構を利用してインターセプターとして登録してHttpClientに存在を知らせます。

次の `NoopInterceptor` は何も行わない空のインターセプターです。インターセプターは `HttpInterceptor` インターフェースで定義される `intercept` メソッドを実装する必要があります。`intercept` メソッドはここまでに組み立てられたリクエストを表す `req` パラメータと、処理を引き継ぐ対象である `next` パラメータの2つを受け取ります。

```typescript
import { Injectable } from '@angular/core';
import { 
  HttpEvent, HttpInterceptor, HttpHandler, HttpRequest 
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class NoopInterceptor implements HttpInterceptor {

  intercept(
    req: HttpRequest<any>, 
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // 何もせず次の処理に引き渡す
    return next.handle(req);
  }
}
```

この `NoopInterceptor` クラスを `HTTP_INTERCEPTORS` トークンに紐づけるproviderを宣言することで、HttpClientに対してインターセプターを登録できます。後述しますが、複数のインターセプターを登録する際にはprovideの順番によって実行順が決定します。そのため、providerの宣言は1つのファイルに集約することで安全に管理できます。

```typescript:http-interceptors.ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { NoopInterceptor } from './noop-interceptor';

export function provideHttpInterceptors() {
  return [
    { provide: HTTP_INTERCEPTORS, useClass: NoopInterceptor, multi: true },
  ];
}
```

```typescript:app.module.ts (抜粋)
import { provideHttpInterceptors } from './http-interceptors';

@NgModule({
  imports: [ HttpClientModule ],
  providers: [ provideHttpInterceptors() ],
})
export class AppModule {}
```

## リクエストへの介入

リクエストに介入する方法はシンプルです。 `intercept` メソッドの中で、引数として渡された `req` オブジェクトを操作し、 `next.handle` メソッドに渡すだけです。

次の例は、リクエストに認証用の `Authorization` ヘッダーを追加するインターセプターです。`HttpRequest` オブジェクトはイミュータブルなので、ヘッダーやURLなどのデータを直接書き換えることはできません。代わりに、 `clone` メソッドを使って改変したいデータを上書きしながら新しい `HttpRequest` オブジェクトを作成します。

```typescript
@Injectable()
export class AuthorizationInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(
    req: HttpRequest<any>, 
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // cloneメソッドでリクエストを改変する
    const newReq = req.clone({
      // Authorizationヘッダーにトークン文字列をセットする
      headers: req.headers.set('Authorization', this.authService.authToken)
    });
    // 改変された newReq を次のハンドラーに渡す
    return next.handle(newReq);
  }
}
```

リクエストに対する処理が完了したら、そのリクエストを次の処理に引き継ぐために `next.handle` メソッドを呼び出します。これがリクエストに介入する基本的なインターセプターの実装方法です。インターセプターの実装は単なるAngularのサービスであるため、通常のサービスと同じようにDIを使って別のサービスを呼び出せます。

## レスポンスへの介入

レスポンスに介入するインターセプターを実装するためには、基本的なObservableへの理解が必要です。 インターセプターでレスポンスに介入するには、 `next.handle` メソッドから返されるObservableに `pipe` メソッドでオペレーターを追加します。`intercept` メソッドや `next.handle` メソッドの戻り値の型であるObservableは、そのままHttpClientの `get` メソッドや `post` メソッドの戻り値になります。

次の例は、レスポンスをログに記録するインターセプターです。`tap` オペレーターによってレスポンスの流れを傍受し、ログ送信処理をおこなっています。基本的なObservable操作を習得すれば、さまざまな介入処理をRxJSのビルトインオペレーターを活用して実装できます。

```typescript
import { tap } from 'rxjs/operator';

@Injectable()
export class LoggingInterceptor implements HttpInterceptor {

  constructor(private logger: Logger) {}

  intercept(
    req: HttpRequest<any>, 
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      // tapオペレータでレスポンスの流れを傍受する
      tap(resp => {
        this.logger.sendLog(resp.body);
      }),
    );
  }
}
```

もちろんリクエストとレスポンスの両方に介入するインターセプターも実装できます。次の例は、独自のキャッシュ機構を導入するインターセプターです。URLごとにレスポンスを保持し、すでにレスポンスを持っている場合はHTTP通信をスキップしてキャッシュから返却します。

```typescript
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements HttpInterceptor {

  constructor(private cache: CacheService) {}

  intercept(
    req: HttpRequest<any>, 
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // キャッシュが存在するならそのまま返す
    if (this.cache.hasValue(req.url)) {
      return of(this.cache.getValue(req.url));
    }

    return next.handle(req).pipe(
      // tapオペレータでレスポンスの流れを傍受する
      tap(resp => {
        // レスポンスのコピーをキャッシュに保存する
        this.cache.setValue(req.url, resp.clone());
      }),
    );
  }
}
```

## インターセプターの順番

A, B, Cの順番で3つのインターセプターをprovideしたとき、リクエストは A -&gt; B -&gt; C の順番に呼び出されます。つまり、インターセプターAにとっての `next` パラメータは B を表し、インターセプターBにとっての `next` パラメータはCを表します。

逆にレスポンスが流れる Observableについては、C -&gt; B -&gt; Aの順番で介入できます。つまり、インターセプターAで受け取る `next.handle()` の戻り値は Bが返したObservableであり、 インターセプターBで受け取る `next.handle()` の戻り値は Cが返したObservableです。

上記のルールに従い、よりリクエストについて優先度の高いインターセプターは最後にprovideし、レスポンスについて優先度の高いインターセプターは最初にprovideすることが推奨されます。

ところでインターセプターCにとっての `next` は何になるのでしょうか？これは、 HttpClientModule がもつ固有のサービスクラスです。デフォルトでは AngularのHttpRequestをXHR に変換し、レスポンスを処理するための `HttpXhrBackend` というクラスが割り当てられます。もし HttpClientJsonpModule を利用した際には、代わりにJSONPを処理するクラスが割り当てられます。つまり、XHRあるいはJSONPを使って実際のHTTP通信をおこなう処理も、インターセプター機構の上に実装されているということです。

これを利用し、インターセプターが `next` を使わず独自に作成したObservableを返却すれば、HTTP通信をスキップして擬似的なレスポンスを返すことができます。第2引数の `next` をうまく利用すれば、HttpClientの根幹的な挙動すらもカスタマイズできるのです。

## 動画によるインターセプターの解説

@[youtube](5t7Z3gcqbWs)

## 参考リンク

* [Angular 日本語ドキュメンテーション - HttpClient](https://angular.jp/guide/http) 



