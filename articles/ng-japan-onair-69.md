---
publication_name: "angular_jp"
title: "[Show Note] Angularの最新情報がわかる！Monthly Angular 8月号【ng-japan OnAir #69】"
emoji: "📝"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["angular", "shownote"]
published: true
published_at: 2023-08-21
---


Angular日本ユーザー会が主催するオンラインイベント [ng-japan OnAir](http://onair.ngjapan.org) 第69回（2023/8/23開催）のshow noteです。放送中に紹介したリンクや補足情報などをまとめています。

https://connpass.com/event/293532

https://www.youtube.com/watch?v=CHiybWAm9xE

[過去の放送のshow noteはこちらから](https://github.com/ng-japan/onair/discussions/categories/show-notes)。

# 主なトピック

- Angular v16.2 リリース
- 9月のイベント情報

以下、放送までに加筆されます。

## Angular v16.2 リリース

https://twitter.com/angular/status/1689668201674584064

https://zenn.dev/angular_jp/articles/2e36956615b80f


### リリースノート

- angular/angular https://github.com/angular/angular/releases/tag/16.2.0
- angular/angular-cli https://github.com/angular/angular-cli/releases/tag/16.2.0
- angular/components https://github.com/angular/components/releases/tag/16.2.0

#### afterRender/afterNextRender

https://twitter.com/angular/status/1689683029424316431?s=20

- [feat\(core\): add afterRender and afterNextRender \(\#50607\) · angular/angular@e53d4ec](https://github.com/angular/angular/commit/e53d4ecf4cfd9e64d6ba8c8b19adbb7df9cfc047)
- https://angular.io/guide/lifecycle-hooks#reading-and-writing-the-dom

### Angular CLI SSR

https://twitter.com/angular/status/1692612331769937986?s=20

- [feat\(@angular\-devkit/build\-angular\): add initial application builder … · angular/angular\-cli@c05c83b](https://github.com/angular/angular-cli/commit/c05c83be7c6c8bcdad4be8686a6e0701a55304cc)
- [feat\(@angular\-devkit/build\-angular\): add \`ssr\` option in application … · angular/angular\-cli@e6b3774](https://github.com/angular/angular-cli/commit/e6b377436a471073657dc35e7c7a28db6688760a)
- [feat\(@angular\-devkit/build\-angular\): add pre\-rendering \(SSG\) and App\-… · angular/angular\-cli@cb165a7](https://github.com/angular/angular-cli/commit/cb165a75dc8c21ead537684a092ed50d3736e04a)


サンプルコード: https://github.com/lacolaco/angular-cli-prerendering

#### その他の変更点

angular/angular

- [feat\(common\): add component input binding support for NgComponentOutl… · angular/angular@29d3581](https://github.com/angular/angular/commit/29d358170b046f4a6773dfdfbbd1050f54deb301)
- [feat\(common\): Allow ngSrc to be changed post\-init \(\#50683\) · angular/angular@1837efb](https://github.com/angular/angular/commit/1837efb9daf5c8e86a99a06ecc77bb42bc60dbb0)
- [feat\(compiler\): scope selectors in @scope queries \(\#50747\) · angular/angular@c27a1e6](https://github.com/angular/angular/commit/c27a1e61d64a67aa169086f7db11bcfd5bb7d2fc)
- [feat\(core\): create injector debugging APIs \(\#48639\) · angular/angular@98d262f](https://github.com/angular/angular/commit/98d262fd27795014ee3988b08d3c48a0dfb63c40)
- [feat\(router\): exposes the \`fixture\` of the \`RouterTestingHarness\` \(\#5… · angular/angular@0b14e4e](https://github.com/angular/angular/commit/0b14e4ef742b1c0f73d873e2c337683b60f46845)

angular/angular-cli

- [feat\(@angular\-devkit/build\-angular\): add preload hints based on trans… · angular/angular\-cli@2a3fc68](https://github.com/angular/angular-cli/commit/2a3fc68460152a48758b9353bff48193641861c5)
  - https://twitter.com/angular/status/1692249942998331587?s=20

### ドキュメントアップデート

未翻訳ドキュメントへのコントリビューションはいつでもお待ちしています！

https://github.com/angular/angular-ja/discussions/878

## 9月のイベント情報

### Angular Meetup feat. Miles Malerba

https://ngjapan.connpass.com/event/291788/

Miles Malerba さんは Google の Angular 開発チームのメンバーで、コンポーネント周りのスペシャリストです。

- [mmalerba \(Miles Malerba\)](https://github.com/mmalerba)
- [Contributors to angular/components](https://github.com/angular/components/graphs/contributors)
- ng-conf 2022 https://www.youtube.com/watch?v=r-MlQQFRonc
- ng-japan 2019 https://www.youtube.com/watch?v=0jl4e2SfXWA
- ng-conf 2017 https://www.youtube.com/watch?v=0BikjL858OQ
