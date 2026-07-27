---
title: 'Angular Update Guide Skill for Agents'
published_at: '2026-07-27 09:54'
topics:
  - 'angular'
  - 'agent skills'
published: true
source: 'https://app.notion.com/p/Angular-Update-Guide-Skill-for-Agents-3aa3521b014a8097855bebdb45df75fc'
type: 'tech'
emoji: '✨'
---

Angular公式ドキュメンテーションの**Angular Update Guide**は、Angularのバージョンを上げる際に確認すべき影響範囲を調べられる便利なツールだ。しかし、Webサイト上の動的なコンテンツであるため、AIエージェントにAngularアップデート作業を指示するときのデータソースとして与えにくく、WebFetchやブラウザ操作によるスクレイピングのようなステップが必要になるのが問題である。

https://angular.dev/update-guide

ところで、このアップデートガイドの内容はソースコードとしては静的にTypeScriptのオブジェクトとして存在するので、事前に加工してエージェントスキル化してしまえば利用しやすくなる。ということで作ったのが`lacolaco/angular-skills`の`angular-update-guide`スキルである。

https://github.com/lacolaco/angular-skills

```shell
# Install skills
npx skills add lacolaco/angular-skills

# Just one of the skills
npx skills add lacolaco/angular-skills -s angular-update-guide
```

中身はソースコードを見てもらえればわかるが、SKILL.mdがひとつと、そこから参照されるXMLファイルの集合であり、何も外部のツール呼び出しなどはない。各メジャーバージョンごとのガイドコンテンツをXMLファイル化して、AIエージェントがコンテキストに応じた参照で情報収集することを狙っている。

Angular Update Guideの表示内容をAIエージェントに読ませるのが面倒だと感じている人がいたらぜひ使ってみてほしい。また、このスキルに相当するものは本来であれば公式のAngular Skillsに含まれていてほしいものなので、そちらへの提案も進めるつもりだ。

