# plan-review CLI 设计文档

## 目标
一个 CLI 工具，读入一个 Markdown 文件，启动本地 Web 编辑器，支持：
1. **富文本渲染**：Markdown 渲染为可编辑的富文本（标题、列表、代码块等带格式）
2. **划词评论**：用户选中文本后点击「添加评论」，在右侧侧栏生成评论卡片，自动记录选中的原文及行号
3. **编辑原文**：用户可以直接在编辑器中修改 Markdown 文本内容
4. **输出 XML**：点击「复制 XML」按钮，将评论汇总 + 原始文件上下文 + diff 一起打包为 XML 格式复制到剪贴板

输出 XML 示例：
```xml
<review>
  <plan file="xxx.md"/>
  <diff>
--- a/xxx.md
+++ b/xxx.md
@@ -1,5 +1,5 @@
 # Title
- old line
+ new line
  </diff>
  <comment id="c1">
    <quote lines="10-15">选中的原文片段</quote>
    评论内容
  </comment>
</review>
```

下游用法：用户将复制的 XML 粘贴到 Claude Code 对话中，Claude 根据评论 + diff 上下文自动改写原文。

## 技术栈

- **运行时/语言**：Bun + TypeScript
- **前端框架**：React + Tailwind CSS（轻量，单页应用）
- **编辑器**：TipTap（基于 ProseMirror，支持 Markdown 导入/导出）
- **构建/打包**：Bun 内置 bundler（`bun build`），CLI 产物为单个 JS 文件，前端 SPA 内联嵌入
- **浏览器打开**：`open` npm 包（跨平台）

## 架构总览

```
┌──────────────┐     spawn       ┌──────────────┐
│ bun CLI bin  │ ───────────────▶│ localhost    │
│ plan-review  │                 │ :<port>      │
│ foo.md       │                 │ (Bun.serve)  │
└──────┬───────┘                 └──────┬───────┘
       │  opens browser                 │ serves bundled SPA
       │  (open-url)                    │ initial md injected as
       ▼                                │ <script id="__INIT__">
┌──────────────┐                        │   { md, filePath }
│ default      │ ───────────────────────┘
│ browser tab  │
│ React + TipTap + comments sidebar + Copy XML 按钮
└──────────────┘
       │
       │ 用户点 Copy → navigator.clipboard.writeText(xml)
       ▼  用户粘到 Claude Code
```

- **单进程**：Bun 同时是 CLI + 静态服务器；生命周期 = 直到 Ctrl+C
- **无后端状态**：md 内容一次性注入到 HTML 里，所有编辑/评论/diff/XML 拼装都在前端
- **端口**：默认随机空闲端口（避免冲突），`-p 3333` 可覆盖
- **打开浏览器**：用 `open`（macOS）/跨平台 `open` npm 包；失败时只打印 URL 让用户自己点
- **打包**：`bun build` 把前端和 CLI 产物打成单个 JS，发布只需 `bunx plan-review foo.md`

## 组件与交互

### TipTap 编辑器
- 扩展：`StarterKit` + `Placeholder` + `Markdown`（导入/导出）
- 开启 `editable: true`，用户可直接在编辑器中修改原文
- 编辑器区域占页面左侧 70%（响应式），右侧 30% 为评论侧栏

### 划词评论
- 用户选中文本时，悬浮显示「添加评论」工具条按钮（参考 Notion 的 + 工具条风格）
- 点击后，在右侧侧栏新建评论卡片，自动填充：
  - `quote`：选中的原文文本
  - `lines`：根据选区在 Markdown 中的行号范围计算
- 选区在正文中以高亮底色标记，与评论卡片关联

### 评论侧栏
- 竖排卡片布局，每张卡片包含：
  - 评论编号（如 #1）
  - 引用原文预览（带高亮底色）
  - 文本输入框（用户输入评论内容）
- Hover 卡片时，正文里对应选区也高亮
- 支持删除评论

### Copy XML 按钮
- 固定在侧栏底部（或全局悬浮），点击后：
  1. 将当前编辑器内容序列化为 Markdown
  2. 计算原始 md 与编辑后 md 的 unified diff
  3. 组装 XML（含 plan 引用、diff、所有评论）
  4. 写入剪贴板 `navigator.clipboard.writeText(xml)`
  5. Toast 提示「已复制到剪贴板」
- 如果用户没有编辑原文，则 XML 中省略 `<diff>` 标签

## 数据模型

```typescript
type ReviewState = {
  markdown: string;           // 当前编辑器内容（编辑后更新）
  original: string;           // 初始 md（用于 diff）
  comments: Comment[];
}

type Comment = {
  id: string;                 // nanoid
  quote: string;              // 选中的原文
  lines: [number, number];    // 开始/结束行号（渲染前计算）
  text: string;               // 用户输入的评论
}
```

## 输出 XML 格式

```xml
<review>
  <plan file="xxx.md"/>
  <!-- diff 仅在原文被编辑时存在 -->
  <diff><![CDATA[
--- a/xxx.md
+++ b/xxx.md
@@ -1,5 +1,5 @@
 # Title
- old line
+ new line
  ]]></diff>
  <comment id="c1">
    <quote lines="10-15">选中的原文片段</quote>
    评论内容
  </comment>
  <comment id="c2">...</comment>
</review>
```

- `<plan>`：仅包含 `file` 属性，引用原始文件路径，不包含全文
- `<diff>`：使用 unified diff 格式，包裹在 CDATA 中；无改动时省略整个标签
- `<comment>`：每条评论独立一个标签，包含 `id` 属性
- `<quote>`：包含 `lines` 属性（格式 `"10-15"`），内容为选中的原文

## CLI 接口

```
plan-review <md-file>          # 启动本地评审
  [-p, --port <port>]          # 指定端口，默认随机空闲端口
  [--no-open]                  # 不自动打开浏览器
```

## 项目结构

```
plan-pro-max/
├── src/
│   ├── cli.ts                 # CLI 入口，参数解析，启动 server
│   ├── server.ts              # Bun.serve，注入 md，服务 SPA
│   ├── types.ts               # ReviewState, Comment 等类型
│   ├── components/
│   │   ├── Editor.tsx         # TipTap 编辑器封装
│   │   ├── CommentSidebar.tsx # 评论侧栏
│   │   ├── CommentCard.tsx    # 单条评论卡片
│   │   ├── CopyXmlButton.tsx  # 复制 XML 按钮 + Toast
│   │   └── Toolbar.tsx        # 划词工具条（添加评论按钮）
│   ├── hooks/
│   │   ├── useComments.ts     # 评论增删改查状态管理
│   │   ├── useDiff.ts         # diff 计算（使用 diff 库）
│   │   └── useXmlGenerator.ts # XML 组装逻辑
│   ├── utils/
│   │   ├── getSelectionRange.ts # 获取选区并计算行号
│   │   └── generateXml.ts     # XML 格式化生成
│   └── App.tsx                # 根组件，注入初始 state
├── public/
│   └── index.html             # SPA HTML 模板（注入 __INIT__ script）
├── package.json               # "bin": { "plan-review": "dist/cli.js" }
├── tsconfig.json
└── bunfig.toml
```

## 依赖

### 运行时依赖
- `open` — 跨平台打开浏览器
- `nanoid` — 生成评论唯一 ID
- `diff`（或 `jsdiff`）— 计算 unified diff

### 前端依赖
- `react`, `react-dom`
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-markdown`, `@tiptap/extension-placeholder`
- `tailwindcss`（开发时编译，构建时提取为 CSS）

### 开发依赖
- `typescript`
- `@types/react`, `@types/react-dom`
- `@types/diff`

## 打包与发布

1. 前端：`bun build src/App.tsx --outdir public/dist --target browser`
2. CLI：`bun build src/cli.ts --outfile dist/cli.js --target bun --minify`
3. SPA 产物内联到 CLI 输出的 HTML 模板中
4. 发布：`bun publish`，用户安装后 `bunx plan-review foo.md` 即可使用

## 错误处理

| 场景 | 行为 |
|------|------|
| 文件不存在 | CLI stderr 打印错误，exit code 1 |
| 端口被占用 | 自动尝试下一个端口（连续 10 次），最后报错 |
| 浏览器打开失败 | 打印 URL 让用户手动打开，server 继续运行 |
| 无评论点击 Copy | 生成 XML（无 `<comment>`），提示「暂无评论」 |
| 复制失败（权限） | Toast 提示错误，控制台打印 XML 作为 fallback |

## 未来可扩展（但当前不做）

- stdout 管道输出模式（`plan-review foo.md | next-agent`）
- 自动保存到文件（`--save` 模式）
- 多人实时协作（WebSocket + 冲突合并）
- Markdown 文件 watch（文件变动自动刷新）
- 评论导出为独立 JSON 文件
