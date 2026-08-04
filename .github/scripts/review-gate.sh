#!/usr/bin/env bash
# 自動レビューの structured_output が信用できるかを検査する。
#
# 信用できないと判断したら approved=false を書き、PR にコメントし、非ゼロで終了する。
# 検査を通過した場合は何も出力せず 0 で終了し、判定と投稿は呼び出し側が行う。
#
# 必要な環境変数:
#   KIND           content | code       (ログ注釈用)
#   LABEL          コンテンツ | コード  (PR コメント用)
#   GH_TOKEN       gh 用トークン
#   PR_NUMBER      対象 PR 番号
#   REVIEW_RESULT  claude-code-action の structured_output
#   GITHUB_OUTPUT  GitHub Actions が既定で与える出力ファイル
set -e

review_failed() {
  echo "::error::${KIND} review malfunction: $1"
  echo "approved=false" >> "$GITHUB_OUTPUT"
  gh pr comment "$PR_NUMBER" --body "## ${LABEL}レビュー失敗

自動レビューを実行できませんでした。人間のレビューが必要です。"
  exit 1
}

if [[ -z "$REVIEW_RESULT" ]]; then
  review_failed "structured_output is empty"
fi
