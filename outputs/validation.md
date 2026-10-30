# 开发与验收记录

2026-10-30，分支 codex/quota-pet-plugin。

## 五阶段

| 阶段 | 状态 | 证据 |
|---|---|---|
| Foundation | 完成 | DESIGN.md；已批准的纵向双圆环与截图菜单，未重新选方向 |
| Pro Max | 完成 | 本地数据库查询已执行；FAQ 模式、强制深色、代码字体不适用于侧面板，采用本项目中性色和系统字体 |
| Taste | 完成 | source lint 0 FAIL / 0 WARN；最终 320、390、768px inspect 0 FAIL / 0 WARN；截图 outputs/taste-final |
| Impeccable | 完成可执行范围 | 右键、设置、隐藏、重载恢复、阈值错误、键盘 Shift+F10 / Esc、临时素材导入/暂停/移除实际操作；宿主侧面板未验收 |
| Hallmark | 完成可执行范围 | 静态与 render 执行，0 FAIL / 0 REFLEX / 0 WARN；完整目录区分 app 不适用项，原生宿主验收不包含在报告内 |

## 自动与协议检查

8 项 Node 测试通过：窗口识别、缺失/非法值、百分比限幅、设置/颜色阈值、并发合并、初次失败、MCP 工具及资源发现。build 通过。生产依赖 99 个，首次 npm audit 0 vulnerabilities。使用 --ignore-scripts 安装依赖。

真实只读额度通过官方 App Server 调用成功；安装后的 MCP 服务器 show_quota_pet 调用返回 ready、300/10080 分钟窗口归一化结果。额度会动态变化，截图不是未来余额承诺。

官方 CLI 已添加本地 marketplace ttjl-local，成功安装 quota-pet@ttjl-local，并确认 installed=true、enabled=true。生产包包含运行依赖、自包含 UI、portable manifest 与兼容 manifest，不依赖仓库的开发依赖。

## 修复

- 构建字符串替换解释 JavaScript 中的 $ 替换片段，导致残留脚本占位符；改用回调插入，协议资源测试覆盖。
- 未选择图片时不在 HTML 中声明无 source 的图片，运行时挂载且隐藏。
- 禁用刷新按钮对比度不足；使用独立禁用色并重新测量。
- 放大更新时间与重置时间文字到 13px。
- 异步文件读取在取消/移除后可能回写旧素材；序号使旧回调失效。
- 暂停 GIF/WebP 使用静止 canvas 帧，避免只暂停位移动画。
- 菜单与设置关闭后回到实际触发元素；触发元素已隐藏时回到主面板。

## 审美例外与边界

这是窄会话侧面板，最大宽度 400px；宽屏两边留白是容器尺寸要求，不做全屏仪表盘。环形图、纵向重复、中间百分比和宠物均来自用户明确要求。12px 仅用于次要说明。使用系统中文字体以贴合宿主，没有外链字体或图库。

Hallmark finish review 在当前会话中进行（Codex harness 规则），没有声明独立审查者。确认最大的两项数字回答额度剩余问题；浅色截屏无碰撞，设置控件可辨认。桌面、平板和手机宽度有渲染证据；原生宿主不是浏览器预览，不能据此判定通过。

未选择最终宠物形象。仅验证了 PNG 临时测试素材导入、暂停与移除；没有留下该素材充当最终宠物。GIF 暂停实现已写入，未使用真实多帧 GIF 逐帧验收。

Computer Use 明确禁止操作 com.openai.codex，未绕过此限制；使用官方 CLI 完成允许的插件管理。需要用户保存工作、重启 Codex，在新本地聊天中确认会话侧面板实际入口与 UI。插件 sandbox 内持久化是否允许也要在该宿主确认。

未部署、未公开发布，未修改背景功能或应用包。

最终构建与安装缓存的 UI SHA-256 一致：9338b7a7c5a899432ddcc0e90c3b59eb8b7a251a584f746733daea435b6d2021。最终浏览器控制台错误列表为空；从宠物入口关闭设置后，焦点恢复到宠物入口。最后一次 Hallmark render 为 0 FAIL / 0 REFLEX / 0 WARN。
