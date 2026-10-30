# 启动 Codex 后自动常驻：官方能力核查

日期：2026-10-30。用户要求在现有原生会话面板基础上，增加应用启动后自动出现；限定官方插件路线。

## 结论

未实现。当前公开官方接口不足以构成可保证的“桌面应用启动 -> 创建插件原生面板”链路。此结论是基于所查文档和当前实现的能力评估，不是对所有未来版本的断言。

现有功能保持：插件界面加载后，通过 MCP Apps requestDisplayMode 从 inline 请求展开为 fullscreen，当前 Codex 已实测成功。这个调用发生在插件网页内部，不能在网页尚未创建时启动网页自身。

## 核查的路径

- 官方 Plugin Extensions 提供 global、thread、file 等入口，没有公开声明应用启动即自动打开的入口。
- SessionStart 的 source 包括 startup、resume、clear、compact、fork，含义是会话生命周期。输出 additionalContext 是加入模型上下文，不是桌面 UI 操作。
- MCP tool hook 只能使用已连接的服务；不启动或重连服务，SessionStart 也可能早于服务就绪。文档规定它使用 command hook 同一输出契约，没有承诺将 MCP UI 工具结果作为应用界面呈现。
- 用提示词要求模型在下一轮调用插件，会依赖一次模型运行，不能等同于打开桌面应用立刻显示。
- 单独启动本地预览服务，只保证服务运行，不保证 Codex 创建原生面板。
- 恢复旧聊天时可能重新渲染历史组件，现有展开逻辑会在组件加载后运行；这不保证每次应用启动都恢复到该聊天或挂载该组件，未把它列为启动常驻验收通过。

## 实施边界

未添加无效开关、启动项、提示词钩子或未经验证的私有入口。未修改宿主应用包，未绕过 hook 信任机制。若后续探索本地伴随程序或系统自动化，需要用户明确扩展官方插件范围，并独立设计和验收。

本次只有文档核查，没有产品源码修改，不需要重复运行既有功能测试。

## 官方资料

- https://developers.openai.com/plugins/build/extensions
- https://learn.chatgpt.com/docs/hooks （SessionStart、MCP tool hooks、Execution and lifecycle）
