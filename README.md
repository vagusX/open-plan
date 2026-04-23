# open-plan

本地 plan 索引 + review CLI。扫 `~/.claude/plans/`，按 workspace 分组，点进单个 plan 用 TipTap 做行级标注，一键导出 XML 给另一个 LLM review。

## 安装

```bash
npm i -g open-plan
```

需要 [Bun](https://bun.sh) 在 `PATH` 里（CLI 用 `#!/usr/bin/env bun`）。

## 用法

```bash
open-plan                      # 打开索引页，扫 ~/.claude/plans/ + 当前 cwd 的 plans/ 和 .claude/plans/
open-plan <file.md>            # 直接打开某个 plan 开始 review
open-plan --index              # 强制走索引页（即使传了文件）
open-plan --fresh              # 跳过复用已有 server，起全新实例
open-plan --port 4117          # 指定端口
open-plan --no-open            # 不自动开浏览器
```

### Server 复用

再次跑 `open-plan <other-file.md>` 不会起新 server —— CLI 读 `~/.claude/open-plan.lock.json`、`GET /api/ping` 确认活着，直接打开已有实例里对应 plan 的 URL。进程 `SIGINT` / `SIGTERM` 退出时自动清 lock；陈旧 lock（指向死端口）也会在下次探测失败时自动清理。

### 编辑器功能

- 左侧 TipTap 渲染 markdown，划选文字 → 弹浮层「Add Comment」→ 右侧 comment sidebar 追踪
- YAML frontmatter 不会被当段落渲染，会被折成正文上方的元数据卡片（workspace / status / created / tags）
- 右下「Copy as XML」把 diff + comments 打包成 XML，贴给下一个 LLM 审查

## 让 Claude Code 自动给 plan 写 frontmatter

open-plan 索引页用 YAML frontmatter 里的 `workspace` 给 plan 分组；没写 frontmatter 的 plan 会掉到「未分类」桶，需要到 UI 里手工 `Tag workspace` 补齐。

要让 Claude Code 每次写 plan 时自动带上 frontmatter，在 `~/.claude/CLAUDE.md`（全局指令文件）里追加下面这段：

````markdown
## Plan 文件 YAML Frontmatter（强制）

所有由 Claude Code 生成、保存到磁盘的 plan 文件（包括 `/plan` 内置模式写入 `~/.claude/plans/`、`/planer` 槽命令、或任何形式的「实施计划」`.md`），**必须在文件开头写入 YAML frontmatter**：

```yaml
---
workspace: /abs/path/to/cwd        # 必填，当前会话的工作目录绝对路径（$PWD）
title: Plan 标题                   # 必填
created: 2026-04-22                # 必填，ISO 日期
status: draft                      # 可选：draft | in-progress | done | archived
tags: [frontend, refactor]         # 可选
---

# Plan 正文从这里开始
```

### 规则

1. `workspace` 取**当前会话的工作目录**（创建 plan 时 Claude 所在的 cwd），不是 plan 将被存放的位置。用于后续按项目分组。
2. 如果当前不在任何项目里，用 `workspace: ~`。
3. 续写、修订已有 plan 时保留原 `workspace` 和 `created`，更新 `status` 并可追加 `updated` 字段。
4. Plan 默认写到 `~/.claude/plans/<slug>.md`。open-plan 扫描该目录并按 `workspace` 分组，缺 frontmatter 或缺 `workspace` 字段的会进「未分类」桶。
5. 写 plan 前先确认 `$PWD`：`Bash: pwd`，把结果原样填入 `workspace`，不要靠记忆/猜测。
````

### 字段速查

| 字段 | 必填 | 说明 |
|---|---|---|
| `workspace` | ✓ | 当前 cwd 绝对路径（决定分组） |
| `title` | ✓ | 人类可读标题（索引页列表展示） |
| `created` | ✓ | ISO 日期 `YYYY-MM-DD` |
| `status` |   | `draft` / `in-progress` / `done` / `archived` —— 在索引页显示为状态 chip |
| `updated` |   | 续写时追加 |
| `tags` |   | flow-array，如 `[auth, refactor]`，索引页可按 tag 搜索 |

## 开发

```bash
bun install
bun run dev          # build + 启动
bun test
bun run build.ts     # 只 build
```

## Scan 路径优先级

索引页扫这几处（按顺序合并、去重）：

1. `~/.claude/plans/` —— 全局
2. `<cwd>/plans/` —— 仓库本地
3. `<cwd>/.claude/plans/` —— 仓库本地（Claude Code 项目级）

## 许可

MIT
