#!/bin/bash
set -u
here="$(cd "$(dirname "$0")" && pwd)" || exit 1
if [ -f "$here/integrations/claude-usage/install-claude.mjs" ]; then
  script="$here/integrations/claude-usage/install-claude.mjs"
elif [ -f "$here/../install-claude.mjs" ]; then
  script="$here/../install-claude.mjs"
else
  script=""
fi
node="$(command -v node 2>/dev/null || true)"
if [ -z "$script" ] || [ ! -f "$script" ] || [ -z "$node" ]; then
  echo "找不到卸载程序或 Node.js。"
  result=1
else
  "$node" "$script" uninstall
  result=$?
fi
echo
read -r -p "按回车关闭…" _ || true
exit "$result"
