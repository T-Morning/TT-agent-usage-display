#!/bin/bash
# Run from a completely extracted release, including paths with spaces.
set -u
here="$(cd "$(dirname "$0")" && pwd)" || exit 1
if [ -f "$here/integrations/claude-usage/install-claude.mjs" ]; then
  script="$here/integrations/claude-usage/install-claude.mjs"
elif [ -f "$here/../install-claude.mjs" ]; then
  script="$here/../install-claude.mjs"
else
  echo "找不到安装程序。"
  echo
  read -r -p "按回车关闭…" _ || true
  exit 1
fi
node=""
for candidate in "${HUANLING_NODE:-}" /usr/local/bin/node /opt/homebrew/bin/node "$(command -v node 2>/dev/null || true)"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    node="$candidate"
    break
  fi
done
if [ -z "$node" ]; then
  echo "未找到 Node.js。"
  result=1
else
  "$node" "$script" install
  result=$?
fi
echo
read -r -p "按回车关闭…" _ || true
exit "$result"
