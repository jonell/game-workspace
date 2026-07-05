# UI/UX 未完成任务清单（含验证方式）

> 📅 2026-07-05 | 📊 已修复 18/25 · 剩余 7 项（已规划，属存量改善）

---

## 🔴 P0 — 全部完成 ✅ (6/6)

### ~~UX-01~~ ✅ 已修复
### ~~UX-02~~ ✅ 已验证：按钮标签与 `companionStatusConfig` 映射一致（IDLE→娱乐中, ONLINE→空闲, RESTING→休息中），无需修改。
### ~~UX-03~~ ✅ 已修复：新增 `ChatMessage` 模型 → DB 持久化聊天消息
### ~~UX-04~~ ✅ 已修复：`LoginPage.tsx` 仅 DEV 模式预填凭据
### ~~UX-05~~ ✅ 已修复
### ~~UX-06~~ ✅ 已修复

---

## 🟡 P1 — 已完成 9/12

### ~~UX-07~~ ✅ 已修复：提取 `IconControl/IconStop/IconSafety/IconHistory` 常量，移除 ADMIN 重复菜单项
### ~~UX-08~~ ✅ 已验证分組存在 + 额外修复 ADMIN 重复条目
### ~~UX-09~~ ✅ 已修复：4 个 KPI 卡片 + DatePicker.RangePicker + CSV 导出 + 错误状态
### UX-10 ⏸️ 已规划：BillingPage 1374 行 → Tabs 拆分 + Fab 回到顶部（大文件重构）
### UX-11 ⏸️ 已规划：创建共享 OrderCard 组件替换三处重复代码
### ~~UX-12~~ ✅ 已修复：ErrorBanner + ErrorBoundary + AppLayout 接入
### ~~UX-13~~ ✅ 已修复：规则引擎替代 AI 占位符（tags + 风险等级 + 建议）
### ~~UX-14~~ ✅ 已修复：支取后同步刷新 `fetchWallet()` + `fetchData()`
### UX-15 ⏸️ 已规划：通知弹窗统一 360×200 + 共享 notification-utils（需 Windows 测试）
### ~~UX-16~~ ✅ 已修复：CSView 新增 `Input.Search` + 紧急程度 `Select` + `useMemo` 过滤
### ~~UX-17~~ ✅ 已修复：拒绝按钮改为打开 Modal（激活死代码），通过保留 Popconfirm
### ~~UX-18~~ ✅ 已修复：`@media` 断点 + AppLayout resize 监听器自动折叠侧边栏

---

## 🟢 P2 — 已完成 3/7

### ~~UX-19~~ ✅ 已修复：`Ctrl+K` 命令面板 + `/` 聚焦搜索
### ~~UX-20~~ ✅ 已创建：`PageHeader.tsx` 共享组件
### UX-21 ⏸️ 已规划：迁移 `new Date().toLocaleString()` → 已有 `dateFormat.ts`
### UX-22 ⏸️ 已规划：3 个页面添加 `rowSelection` + 批量工具栏
### ~~UX-23~~ ✅ 已修复：Top 5 被杀进程 + Top 5 陪玩杀进程统计卡片
### UX-24 ⏸️ 已规划：托盘未读计数 badge（状态子菜单已存在）
### UX-25 ⏸️ 已规划：emoji picker（图片上传延迟至有服务端存储时）

---

## 📊 汇总

| 优先级 | 数量 | 已修复 | 剩余 |
|:--:|:--:|:--:|:--:|
| P0 | 6 | **6** ✅ | 0 |
| P1 | 12 | **9** | 3 |
| P2 | 7 | **3** | 4 |
| **合计** | **25** | **18** | **7** |

### 剩余 7 项（已规划，属存量改善/大范围重构）

| UX | 描述 | 延迟原因 |
|----|------|----------|
| UX-10 | BillingPage Tabs 拆分 | 1374 行大文件重构 |
| UX-11 | 共享 OrderCard 组件 | 3 页同步迁移 |
| UX-15 | 通知弹窗统一 | Electron 需 Windows 测试 |
| UX-21 | 时间格式统一 | 全局搜索替换 |
| UX-22 | 批量操作 | 3 页批量 UI |
| UX-24 | 托盘未读计数 | 需 IPC 通信 |
| UX-25 | 聊天 emoji | 需新依赖 + 消息格式扩展 |

> 所有已完成的修复均已通过 `tsc --noEmit` 类型检查。
