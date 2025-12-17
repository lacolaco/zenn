---
title: 'AngularはAI志向のフレームワークへ'
published_at: '2025-09-20 09:48'
topics:
  - 'angular'
  - 'ai'
  - 'mcp'
published: true
source: 'https://www.notion.so/Angular-AI-2713521b014a800cb4dded9150c0dc1c'
type: 'tech'
emoji: '✨'
---

Angular は **AI-forward**, あるいは AI-firstなフレームワークへと変化しようとしている。公式オンラインイベントと、先日開催されたAngularConnect 2025での基調講演で明かされたその内容を紹介したい。

https://blog.angular.dev/beyond-the-horizon-how-angular-is-embracing-ai-for-next-gen-apps-7a7ed706e1a3

https://www.youtube.com/watch?v=uFdxw4Se-A8

## Develop with AI

プログラミングにおけるAIの活用が急速に発展する中で、Angularのようなフレームワークに求められるのは、あらゆる開発者、そして**AIのためのフレームワーク**であること。バイブコーディングでアプリを開発したい人だけでなく、コーディングエージェントをパートナーとして活用したい熟練の開発者にとっても、さまざまなユースケースにおいて、**LLMが優れた品質のAngularアプリケーションコードを生成することを確実にする**。そのために、Angularチームは **Web Codegen Scorer** を開発した。

https://github.com/angular/web-codegen-scorer

Web Codegen Scorerは、計測用のプロンプトに対して**生成されたアプリケーションコードのクオリティを評価**する。ビルドに成功するかどうかだけでなく、ランタイムパフォーマンスやセキュリティ、アクセシビリティのベストプラクティスに則っているかも総合的にチェックする。Web Codegen Scorer の開発にはGoogleのセキュリティチーム、Gemini開発チーム、Chromeチームなどがコラボレーションしており、その結果の信頼性はお墨付きだ。

![](/images/angular-ai-forward/image.e6e689e0744a413f.png)
_Web Codegen Scorer_

Angularチームが Web Codegen Scorer を開発したのは、**確実な改善のために計測が欠かせない**からだ。このツールにより、フレームワークの現状に合わせて LLM を最適化するための信頼性高いプロンプトを作成できるようになった。これは [angular.dev/ai](https://angular.dev/ai/develop-with-ai) で公開されていて、各種ツールのルールドキュメントやシステムインストラクションに組み込むことができる。

![](/images/angular-ai-forward/image.b74ae42b7dbbd657.png)
_LLM Prompt Improvement Process_

次に、Angularアプリケーションコードの生成において LLM が失敗する一般的な原因を分析・デバッグし、それらの問題を軽減するためにフレームワークを改善できるようになった。つまり、**定量的な評価**をもとにして、LLM が間違えやすい落とし穴を塞ぐように、フレームワークの機能や構文を変更できるようになった。

これらの成果として、LLMは従来のAngularの機能について高い安定性でコード生成できるだけでなく、次のバージョンで試験的機能としてリリースされる Signal Forms 機能についても**初日から**適切に処理できるようになった。Angularチームは、すでに**LLMが優れたAngular開発者として機能する**ことをデータから確信している。

![](/images/angular-ai-forward/image.210b96fcf07bc985.png)
_“LLM models are great Angular developers — Angular team & data”_

その核となるのが バージョン20.2からAngular CLIに搭載された **Angular MCP Server** である。Angular MCP ServerをAIツールに連携することで、モデルやツールの違いに左右されずに、AngularのベストプラクティスをLLMのコンテキストに与えられる。

https://angular.dev/ai/mcp

さらに将来的には、**Angular MCPとブラウザオートメーションを統合**した一連のローカル開発ワークフローを構築できるようにする予定だ。`ng serve` で起動したローカルサーバーをMCP経由で管理し、プロンプトでコードを生成したらビルドを待つ。ビルド後にPlaywright MCPで動作を確認、問題があれば Angular MCPがソースコードをデバッグ、うまくいけば次のコード生成へ、というサイクルができあがる。これは一度作って終わりのバイブコーディングではなく、**継続的にメンテナンスするアプリケーション**の開発を念頭に置いたものだ。

![](/images/angular-ai-forward/image.818a8f3a067898fd.png)
_AI-driven Angular Dev_

## Learn with AI

もちろんAngularはAIのためだけでなく、これまで通り開発者とコミュニティのためのフレームワークでもある。Angularチームは**AIのサポートを受けながらAngularの最新のプラクティスを学べる**インタラクティブな教材を開発した。それが **Angular AI Tutor** だ。

https://github.com/angular/ai-tutor

AI TutorはFirebase Studio上で動作する。GitHubのREADMEに貼られた “**Try in Firebase Studio**” のリンクからプロジェクトを生成すると、ベースとなるAngularアプリケーションとともに、チャット画面でAIが学習をサポートしてくれる。現在の理解度に応じて難易度を変えてくれるので、初心者の入門ハンズオンから経験者の久々のキャッチアップまで幅広く対応できる。

![](/images/angular-ai-forward/Angular__AI_Developer_Event_-_YouTube_-_15_27.24119becc1c59b30.png)
_Angular AI Tutor_

Firebase Studio上で構築されるプロジェクトはAngular CLIベースなので、チュートリアルが終わったあとファイルをダウンロードすればローカルで開発を再開できるし、そのまま出来上がったサンプルアプリをFirebaseにデプロイすることもできる。

Angular TutorはAngular MCPにも組み込まれているため、Firebase Studioが使えない場合でも、好きなAIツールを使ってチュートリアルを開始できる。

また、**Gemini Canvas**や**Google AI Studio**といったGoogleのAI製品のWebアプリ作成にも、Angularが組み込まれるようになった。アイデアをもとに簡単なプロトタイプを手早く作るのに適している。

![](/images/angular-ai-forward/CleanShot_2025-09-20_at_09.20.092x.2845d3d0327e000c.png)
_Gemini Canvas_

## Design with AI

LLMは、**Angularフレームワークそのものの開発**においても活用されはじめている。AngularConnect 2025でAngularチームが明かしたのは、すでにAngularフレームワークのAPI設計プロセスにLLMが組み込まれていることだ。

その内容は次のようなものだ。基本的なコンセプトをもとに、APIドキュメントの草稿を作成する。次に、そのドキュメントを入力として**LLMに実装コード例を生成させる**。その出力されたコードをAngularチームがレビューし、APIコンセプトを見直す。このサイクルによって、実際に**実装する前からAPIデザインの妥当性を検証**している。

![](/images/angular-ai-forward/image.f0d57d56d0472b2d.png)
_API Design Process with AI_

Angularチームの調査によれば、**LLMが生成に失敗しやすいインターフェース**は、人間の開発者にとっても同様に混乱を招き、使い方を間違いやすい傾向にあった。逆に言えば、**LLMがうまくコードを生成できるインターフェース**を設計できれば、それは開発者にとっても学びやすく使いやすいものになる。このサイクルの評価にも Web Codegen Scorer が活用されている。

すでにリリースされている `@for` や `@if` などのテンプレート構文も、このプロセスを経てブラッシュアップされたものだという。先述のとおり、Signal Forms も同様だ。

以前はGitHubなどを通じて開発者からAPIコンセプトについてのフィードバックを集め、それを元にデザインを固めていたが、それだけではブラッシュアップできる回数が少なかった。チーム内で事前にLLMによる検証を繰り返すことで、最初からすでに妥当性の高いデザインをコミュニティに提案できるようになった。

開発者がLLMからのサポートを十分に得られるフレームワークであると確信を持って示すために、その開発プロセスにLLMからの評価を組み込むことにしたのだ。

## Build with AI

AngularアプリケーションにAIを組み込むのは、Google AI SDKやFirebase Genkitなどのライブラリを通じて現在でも実現できる。しかし、それが開発者とAIツールにとって開発しやすく、ユーザーにとってアクセシブルなものになっているかは未知数だ。

そこでAngularチームはRFCを公開し、AIを組み込むWebアプリケーションのユースケースを集めている。ここで集まったコメントをもとに、Angularが今後備えるべき機能や構文、周辺ツールのサポートなどを検討する予定だ。

https://github.com/angular/angular/discussions/63766

## まとめ

Angularは着実に進化を続けてきたフレームワークだが、いまやAIと共に成長し、AIと共に開発を支援し、AIと共に学習を促進するという新たな道を歩み始めている。これがAngularの “AI-forward” の方向性だ。

Angular MCPをはじめとした各種ツールの導入により、LLMとの連携が強化され、開発者体験の向上だけでなく、フレームワーク自体の設計にも影響を与えている。しかしAngularとAIのコラボレーションはバイブコーディングを超えて、これまでどおり、品質の高いスケーラブルなWebアプリケーションを構築する開発者とチームのためにある。AI時代においても「自信を持って」開発できるフレームワークとしてのAngularに今後も期待してほしい。

