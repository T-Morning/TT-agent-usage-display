@echo off
where node >nul 2>&1
if errorlevel 1 (
  echo 未找到 Node.js。请安装 Node.js 22 或更新版本后重试。
  pause
  exit /b 1
)
node "%~dp0manage.cjs" install
if errorlevel 1 pause
exit /b %errorlevel%
