#!/bin/bash
set -u
cd "$(dirname "$0")" || exit 1
badge_node=""
for badge_candidate in "${HUANLING_NODE:-}" \
  "/usr/local/bin/node" \
  "/opt/homebrew/bin/node" \
  "$(command -v node 2>/dev/null || true)";
do
  if [ -n "$badge_candidate" ] && [ -x "$badge_candidate" ] && "$badge_candidate" -e 'if(+process.versions.node.split(".")[0]<22)process.exit(1);require("node:sqlite")' >/dev/null 2>&1; then
    badge_node="$badge_candidate"
    break
  fi
done
if [ -z "$badge_node" ]; then
  echo "未找到 Node.js 22+。请安装 Node.js 22 或更新版本后重试。"
  result=1
else
  "$badge_node" "./integrations/cursor-billing/release-install.mjs" uninstall
  result=$?
fi
echo
read -r -p "按回车关闭…" _ || true
exit "$result"
