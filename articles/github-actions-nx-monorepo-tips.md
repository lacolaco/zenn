---
title: "Nx monorepoでのnpmパッケージ管理とGitHub Actions"
emoji: "⚙️"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["githubactions", "nx", "monorepo"]
published: true
---

はじめましてlacolacoです！この記事は[Classi Advent Calendar 2020](https://qiita.com/advent-calendar/2020/classi) 12/5担当の記事です。

本稿ではNxとGitHub Actionsを使ったmonorepoのCI/CD構築について、誰かの役に立ちそうなTipsと、誰か助けてほしい失敗談を簡単にまとめます。

- [nrwl/nx: Extensible Dev Tools for Monorepos](https://github.com/nrwl/nx)

## Nxを使ったnpm package monorepo管理

今回は複数のnpmパッケージの開発を1つのリポジトリで管理するためにNxを利用しています。
Lernaを使う選択肢もありましたが、管理したいものがAngularアプリケーション用のライブラリだったので、親和性が高いNxを採用しています。


```sh
# ワークスペースの作成
$ npx create-nx-workspace my-awesome-libs --preset oss --no-nx-cloud
$ cd libs-monorepo
# ライブラリプロジェクトの追加
$ yarn add -D @nrwl/angular
$ yarn nx generate @nrwl/angular:library --name=foo --publishable
```

このあたりは公式ドキュメントで事足りる話なので、実際の運用で工夫しているところを紹介します。

### CHANGELOG.mdの管理

今回はそれぞれのライブラリが独立してバージョン管理、公開されるようにしています。（Lernaでいうところのindependentモード）
そのため、[stardard-version](https://github.com/conventional-changelog/standard-version)による `CHANGELOG.md` の生成もライブラリごとに独立するようにしました。

#### `.versionrc` ファイルの配置

各プロジェクトのルートディレクトリ（`README.md`と同じ階層）に、standard-version用の設定ファイルを作成します。
`path` は指定したディレクトリ内部のファイルが変更されたコミットだけをこのスコープの `CHANGELOG.md` に含めるための設定です。
`tag-prefix`はプロジェクト個別のCI/CDをするときに、ライブラリごとにリリースを区別するための重要な設定項目です。

```json:packages/foo/.versionrc
{
  "path": ".",
  "tag-prefix": "foo-lib-v",
  "releaseCommitMessageFormat": "chore(release): foo-lib@{{currentTag}}"
}
```

#### `nx release --project=foo` の設定

このステップは他にもやりようがあると思いますが、standard-versionをNxのビルダー経由で実行できるように設定しています。
`@nrwl/workspace:run-commands` ビルダーは任意のコマンドをNx経由で実行できます。
`npx standard-version`コマンドを`packages/foo`ディレクトリで実行することで、さきほど追加した `.versionrc`ファイルに沿って `CHANGELOG.md` が生成されます。
下記のように`workspace.json`を設定すると、次のコマンドで `CHANGELOG.md` を生成できます。

```sh
$ yarn nx run foo:release --dry-run
# あるいは
$ yarn nx release foo --dry-run
```

```json:workspace.json
{
  "version": 1,
  "projects": {
    "foo": {
      "projectType": "library",
      "root": "packages/foo",
      "sourceRoot": "packages/foo/src",
      "prefix": "foo",
      "architect": {
        //...
        "release": {
          "builder": "@nrwl/workspace:run-commands",
          "options": {
            "command": "npx standard-version",
            "cwd": "packages/foo",
            "parallels": false
          }
        }
      }
    }
  }
}
```

このようにすることで、ライブラリプロジェクト個別のタイミングで、任意のコミット時点でバージョニングできるようになりました。

### GitHub Actionsでの自動publish

standard-versionのバージョニングで `foo-lib@v1.0.0` のような形式のGitタグが付与されるようになったので、これをトリガーにしてGitHub Actionsでnpmへの自動publishをおこないます。

#### タグトリガーでのワークフロー定義

`.github/workflows/publish-latest.yml` と名付けたGitHub Actionsのワークフローファイルに、次のように記述します。
ワークフローのトリガーは`push/tags`を使い、`.versionrc`ファイルで設定した`tag-prefix`と一致するようにタグ名のパターンを指定します。
複数パッケージになったらこのパターンを増やしていきます。

```yml
name: publish (latest)

on:
  push:
    tags:
      - foo-lib-v*
      - bar-lib-v*

jobs:
  publish-latest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
```

#### どのタグでトリガーされたかを取得する

このアプローチだと、foo-libをリリースするときもbar-libをリリースするときも同じアクションが実行されるため、選択的にpublishするにはどのタグでトリガーされたかを取得する必要があります。
GitHub Actionsではタグトリガーで起動したワークフローの `GITHUB_REF` 環境変数はタグへの参照になっているため、ここから取得できます。
次のように`::set-output`機能を使って環境変数から得たタグ名を後続のジョブで利用できるようにします。

```yml
jobs:
  publish-latest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      # == region variables
      - run: echo "::set-output name=result::${GITHUB_REF/refs\/tags\//}"
        id: targetTag
      - run: echo "targetTag:${{steps.targetTag.outputs.result}}"
      # == endregion

```

#### `if` による選択的ビルド/publish

あとはタグ名によってどのライブラリプロジェクトをビルドしてpublishするかを制御するだけです。
GitHub Actionsにはジョブに `if` フィールドがあり、式の評価結果が `true` であるときだけ実行されます。`false`の場合は次のジョブへ進みます。

`if`では組み込みの `startsWith`関数を使い、タグ名がライブラリプロジェクトごとのprefixから始まっているかをチェックしています。
ライブラリが増えるごとにymlファイルが伸びていく課題がありますが、無限に増えていくわけではないのと、この中に複雑なシェルスクリプトを直接書かなければそれほど複雑になることはないと判断しています。

```yml
      # scoped packageをpublishするために必要な設定。GitHub Actionsのドキュメントを参照。
      - uses: actions/setup-node@v1
        with:
          node-version: 12.x
          registry-url: 'https://registry.npmjs.org'
          scope: '@classi'
      - run: yarn install

      - name: publish foo
        if: ${{ startsWith(steps.targetTag.outputs.result, 'foo-lib-v') }}
        run: ./tools/scripts/publish-latest.sh "foo"
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_PUBLISH_TOKEN }}
      - name: publish bar
        if: ${{ startsWith(steps.targetTag.outputs.result, 'bar-lib-v') }}
        run: ./tools/scripts/publish-latest.sh "bar"
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_PUBLISH_TOKEN }}
```

実際のpublish処理は次のような簡単なスクリプトです。念のため[can-npm-publish](https://efcl.info/2018/06/21/can-npm-publish/)を使い、バージョン重複がないことを確認してからpublishしています。

```sh:tools/scripts/publish-latest.sh
#!/bin/bash -eux

project=$1

echo "Publishing ${project}"

yarn build ${project} --prod --with-deps
yarn can-npm-publish dist/packages/${project} && yarn --cwd dist/packages/${project} publish --access public

echo "Done"
```

### うまくいかなかったこと: ブランチ制約

現在は上述のワークフローとほぼ同じものを運用していますが、本当はもうひとつやりたかったことがありました。
GitHub Actionsの`push/tags`トリガーでは、マッチするタグがコミットされればどのブランチに対するコミットでもトリガーされます。
これを「`main`ブランチへpushされたコミットにリリースタグが付いているとき」という複合条件にしたかったのですが、かなり格闘した末に諦めました。

途中までうまくいくと思っていたアプローチは、アクション内で`git branch --contains`コマンドを使うものです。任意のコミットを含んでいるブランチ一覧を取得できるこのコマンドで、`push/tags`での `GITHUB_SHA`からブランチを調べてその中に`main`が含まれればよい、という判定を試みました。

```yml
      - uses: actions/checkout@v2
      - run: git fetch origin main
      # == region variables
      - run: echo "::set-output name=result::$(git branch -r --contains ${GITHUB_SHA} --format "%(refname:lstrip=2)" | grep "main")"
        id: validBranch
      - run: echo "::set-output name=result::${GITHUB_REF/refs\/tags\//}"
        id: targetTag
      - run: echo "validBranch:${{steps.validBranch.outputs.result==true}}"
      - run: echo "targetTag:${{steps.targetTag.outputs.result}}"
      # == endregion
```

ローカルで実行すればうまくいくのですが、GitHub Actions上ではうまくいかず、どのブランチにも含まれていないコミットになっていました。
原因はおそらく `actions/checkout@v2` がチェックアウトする際にHEADをデタッチしてしまうことだと思うのですが、 `-r`オプションを付けてリモートのブランチを調べさせてもダメなのでいよいよわかりません。

もし誰かうまくいく方法を知っていたら教えて下さい。

### まとめ

- Nxでライブラリmonorepoを作ってindependentモード風に管理している話
- standard-versionを使ってライブラリ個別の `CHANGELOG.md`を生成している話
- GitHub Actionsを使ってライブラリごとに自動publishできるようにしている話
- タグトリガーのアクション内でブランチ制約を付ける方法がわからない話

12/6はonigraさんが何か書くらしいです。お楽しみに！

[Classi Advent Calendar 2020 \- Qiita](https://qiita.com/advent-calendar/2020/classi)

