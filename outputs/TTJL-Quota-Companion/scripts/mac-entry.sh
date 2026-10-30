#!/bin/bash
# Run from a completely extracted release, including paths with spaces.
set -u
cd "$(dirname "$0")/.." || exit 1
badge_node=""
for badge_candidate in "${CODEX_BADGE_NODE:-}" \
  "${CODEX_BADGE_APP:-/Applications/Codex.app}/Contents/Resources/cua_node/bin/node" \
  "/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node" \
  "$HOME/Applications/Codex.app/Contents/Resources/cua_node/bin/node" \
  "$HOME/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node" \
  "$(command -v node 2>/dev/null || true)" \
  "/opt/homebrew/bin/node" \
  "/usr/local/bin/node";
do
  if [ -x "$badge_candidate" ] && "$badge_candidate" -e 'if(+process.versions.node.split(".")[0]<24)process.exit(1);require("node:sqlite")' >/dev/null 2>&1; then
    badge_node="$badge_candidate"
    break
  fi
done
if [ -z "$badge_node" ]; then
  echo "未找到可用的 Node.js 24+（需支持 node:sqlite）。"
  echo "已检查客户端内置 Node、PATH 和 Homebrew 默认路径。"
  echo "如 Node 安装在其他位置，请执行：CODEX_BADGE_NODE=/绝对路径/node /bin/bash 安装.command"
  badge_result=1
else
  "$badge_node" ./manage.cjs "$@"
  badge_result=$?
fi
echo
read -r -p "按回车关闭…" _ || true
exit "$badge_result"
