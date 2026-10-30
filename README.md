# 额度伙伴

macOS 安装包和发布说明：[环灵 v0.1.0](https://github.com/T-Morning/TT-agent-usage-display/releases/tag/v0.1.0)。这个安装包只支持 macOS。Windows 适配在 [win](https://github.com/T-Morning/TT-agent-usage-display/tree/win) 分支进行，计划支持在 Windows 上安装使用，以及 token 花费。

Codex 本地 MCP 插件原型，使用官方 MCP Apps SDK 和 App Server 协议。原生会话面板已实测打开。插件通过官方 MCP Apps `requestDisplayMode` 请求从 inline 展开为 fullscreen，由 Codex 决定具体面板呈现。已在原生 MCP App 面板中验证额度、菜单、设置和宠物显示开关。只在本地执行的聊天使用，不是官方出品，也未发布到公共目录。

## 功能

- 5h、每周双圆环上下排列，显示剩余比例和重置时间。
- 每种窗口独立颜色，低/中/充足三档，可调整阈值。
- 右键组件弹出菜单，直接隐藏宠物或打开设置窗口；右上角菜单按钮也可操作。
- 导入 PNG、JPG、WebP、GIF（最大 2MB，4096×4096）；无内置最终宠物素材。显示、暂停和导入设置仅存本机浏览器存储；宿主禁用存储时会明确提示失败。
- 动画可暂停，减少动态模式显示静止帧；隐藏宠物收起空间。
- 每分钟刷新，页面不可见时停止轮询；读取失败保留上次数据并标记过期。

## 快速安装（macOS 侧栏圆环）

克隆后，在仓库根目录执行安装入口：

```sh
/bin/bash outputs/TTJL-Quota-Companion/安装.command
```

需已安装 Codex 桌面客户端，以及 Node.js 24+（支持 `node:sqlite`）。入口会查找客户端内置 Node、PATH 和 Homebrew 默认路径；自定义位置可用 `CODEX_BADGE_NODE=/绝对路径/node` 指定。安装完成后保存工作，完全退出 Codex，再从原图标启动。详细说明见 [macOS 安装帮助](outputs/TTJL-Quota-Companion/docs/macos.md)。

以下本地开发和 MCP 插件流程是另一种集成方式，与上述侧栏安装包分开。

## 本地开发

需要 Node 22+、已安装且通过 ChatGPT 登录的 Codex CLI。无需 OpenAI API key。

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run preview
```

打开 http://127.0.0.1:4318 。预览只绑定回环地址，不上传额度或宠物素材。通过 `CODEX_BINARY` 可指定 Codex CLI 可执行文件绝对路径。

## 安装到 Codex 测试

工作目录已经包含 `.agents/plugins/marketplace.json`，指向生成的 `dist/quota-pet` 本地插件包。

已修复：此前入口只启动了聊天内的 inline 卡片；现在连接后自动请求宿主支持的 fullscreen 模式。若展开请求失败，卡片提供“展开面板”重试入口。浏览器预览不需要这一步。

当前已通过官方 CLI 安装并启用 `quota-pet@ttjl-local`，安装缓存位于 `~/.codex/plugins/cache/ttjl-local/quota-pet/0.1.0`。

1. 保持插件包路径不变，重启桌面应用（先保存当前工作）。
2. 打开插件目录，确认本地来源“TTJL 本地插件”下的“额度伙伴”已启用。
3. 在本地执行的聊天中调用“额度伙伴”，插件会请求自动展开。
4. 打开后查看真实额度，右键圆环测试菜单与设置。

官方 thread 入口已声明；当前版本已实测从 inline 切换为 fullscreen，并在原生 MCP App 面板完成交互检查。其他宿主可能只支持 inline，插件会检查 availableDisplayModes，不能展开时保留卡片。Computer Use 不能控制 Codex 主应用，但可以通过受支持的 mcpapps 接口操作已打开的插件面板。

若应用未发现 repo marketplace，可按官方说明添加个人 marketplace，指向该插件包；不要覆盖既有个人 marketplace。说明：https://developers.openai.com/plugins/build/plugins

## 打包

```sh
npm run build
node scripts/package.mjs
```

`dist/quota-pet` 包含生产依赖、打包后的自包含 UI 和本地 stdio 服务器。`.mcp.json` 使用官方 `${PLUGIN_ROOT}` 占位符，依赖本地 `node` 和 `codex` 可执行文件可被宿主发现。离线复用该目录无需再次安装 npm 包。若移动源码目录，需重新生成本地 marketplace 路径对应的包。

调用插件后自动展开，不代表启动 Codex 时自动出现；关闭面板后，可再次调用“额度伙伴”。

## 边界

不会修改应用包、宿主侧栏布局、全局背景或窗口透明度。额度接口只读，不执行重置、购买、登出或发起聊天。没有导出 auth 文件或向前端传递凭据。自定义素材仍需自行导入；不会把占位图当成交付宠物。公共本地 MCP 插件提交需要官方批准，当前仅本地测试用途。
