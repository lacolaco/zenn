#!/usr/bin/env bash
# review-gate.sh の検証。写経した複製ではなく、出荷されるスクリプト本体を実行する。
# 実行: .github/scripts/review-gate.test.sh
set -u

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
TARGET="${SCRIPT_DIR}/review-gate.sh"
STUB_DIR=$(mktemp -d)
trap 'rm -rf "$STUB_DIR"' EXIT

# gh のスタブ。PATH の先頭に置いて本物より先に見つけさせる。
#   `gh pr comment ...` は投稿内容を GH_COMMENT_LOG に記録する
cat > "${STUB_DIR}/gh" <<'STUB'
#!/usr/bin/env bash
if [[ "$1" == "pr" && "$2" == "comment" ]]; then
  echo "$*" >> "${GH_COMMENT_LOG:-/dev/null}"
  exit 0
fi
exit 0
STUB
chmod +x "${STUB_DIR}/gh"
PATH="${STUB_DIR}:${PATH}"
export PATH

FAILURES=0
PASSES=0

# check <名前> <pass|fail> <structured_output>
check() {
  local name="$1" expected="$2" input="$3"

  local out rc
  GITHUB_OUTPUT=$(mktemp)
  GH_COMMENT_LOG=$(mktemp)
  out=$(
    env KIND=content LABEL=コンテンツ \
      GH_TOKEN=stub PR_NUMBER=999 \
      GITHUB_OUTPUT="$GITHUB_OUTPUT" \
      GH_COMMENT_LOG="$GH_COMMENT_LOG" \
      REVIEW_RESULT="$input" \
      bash "$TARGET" 2>&1
  ) && rc=0 || rc=$?

  local ok=1
  if [[ "$expected" == "fail" ]]; then
    # 不調は「非ゼロ終了」「approved=false の記録」「PR への通知」を全て満たすこと
    [[ $rc -ne 0 ]] || ok=0
    grep -q '^approved=false$' "$GITHUB_OUTPUT" || ok=0
    [[ -s "$GH_COMMENT_LOG" ]] || ok=0
  else
    [[ $rc -eq 0 ]] || ok=0
    # 通過時は何も投稿せず、判定は呼び出し側に委ねること
    [[ ! -s "$GH_COMMENT_LOG" ]] || ok=0
  fi

  if [[ $ok -eq 1 ]]; then
    echo "PASS: $name"
    PASSES=$((PASSES + 1))
  else
    echo "FAIL: $name (expected=$expected exit=$rc)"
    printf '%s\n' "    ${out//$'\n'/$'\n'    }"
    FAILURES=$((FAILURES + 1))
  fi
  rm -f "$GITHUB_OUTPUT" "$GH_COMMENT_LOG"
}

check "empty output is reported" fail ''
check "approving review passes through" pass \
  '{"approved":true,"summary":"ok","issues":[]}'
check "rejecting review passes through" pass \
  '{"approved":false,"summary":"typo","issues":[{"file":"articles/a.md","description":"x"}]}'

echo "--- passed: ${PASSES}, failed: ${FAILURES} ---"
exit $((FAILURES > 0))
