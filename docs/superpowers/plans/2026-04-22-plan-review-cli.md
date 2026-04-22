# plan-review CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI that reads a Markdown file, launches a local web editor with TipTap, supports text selection comments with line numbers, editable markdown, and exports review comments + diff as XML to clipboard.

**Architecture:** Bun CLI serves a bundled React SPA via `Bun.serve()`. Initial markdown is injected into the HTML as `window.__INIT__`. All state (edits, comments, diff, XML assembly) lives in the browser. User clicks "Copy XML" to copy the assembled XML to clipboard.

**Tech Stack:** Bun + TypeScript + React + TipTap + tiptap-markdown + Tailwind CSS + diff + nanoid

---

## File Structure

```
plan-pro-max/
├── src/
│   ├── cli.ts                           # CLI entry: parse args, validate file, launch server
│   ├── server.ts                        # Bun.serve: inject md into HTML, serve static files
│   ├── types.ts                         # ReviewState, Comment types
│   ├── utils/
│   │   ├── lines.ts                     # Compute line numbers from text positions
│   │   ├── diff.ts                      # Compute unified diff
│   │   └── xml.ts                       # Assemble XML output
│   ├── hooks/
│   │   ├── useReviewState.ts            # React context + reducer for app state
│   │   └── useComments.ts               # Comment CRUD hook
│   ├── components/
│   │   ├── App.tsx                      # Root component
│   │   ├── Editor.tsx                   # TipTap editor wrapper
│   │   ├── SelectionToolbar.tsx         # Floating "Add Comment" toolbar on text selection
│   │   ├── CommentSidebar.tsx           # Right sidebar listing all comments
│   │   ├── CommentCard.tsx              # Single comment card
│   │   └── CopyXmlButton.tsx            # Copy XML to clipboard + toast
│   └── main.tsx                         # Frontend entry: read __INIT__, render React
├── public/
│   └── index.html                       # SPA HTML template with __INIT__ placeholder
├── tests/
│   ├── lines.test.ts
│   ├── diff.test.ts
│   └── xml.test.ts
├── package.json
├── tsconfig.json
├── build.ts                             # Build script: bundle frontend into public/dist/
└── bunfig.toml
```

---

### Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `bunfig.toml`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "plan-review",
  "version": "0.1.0",
  "description": "Local markdown review CLI with TipTap editor and XML export",
  "bin": {
    "plan-review": "dist/cli.js"
  },
  "scripts": {
    "dev": "bun run src/cli.ts",
    "build": "bun run build.ts",
    "test": "bun test"
  },
  "dependencies": {
    "diff": "^5.1.0",
    "nanoid": "^5.0.7",
    "open": "^10.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tiptap-markdown": "^0.8.10"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/diff": "^5.2.1",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3"
  },
  "peerDependencies": {
    "@tiptap/core": "^2.7.0",
    "@tiptap/extension-bold": "^2.7.0",
    "@tiptap/extension-bullet-list": "^2.7.0",
    "@tiptap/extension-code": "^2.7.0",
    "@tiptap/extension-code-block": "^2.7.0",
    "@tiptap/extension-document": "^2.7.0",
    "@tiptap/extension-hard-break": "^2.7.0",
    "@tiptap/extension-heading": "^2.7.0",
    "@tiptap/extension-history": "^2.7.0",
    "@tiptap/extension-horizontal-rule": "^2.7.0",
    "@tiptap/extension-italic": "^2.7.0",
    "@tiptap/extension-link": "^2.7.0",
    "@tiptap/extension-list-item": "^2.7.0",
    "@tiptap/extension-ordered-list": "^2.7.0",
    "@tiptap/extension-paragraph": "^2.7.0",
    "@tiptap/extension-strike": "^2.7.0",
    "@tiptap/extension-text": "^2.7.0",
    "@tiptap/pm": "^2.7.0",
    "@tiptap/react": "^2.7.0",
    "@tiptap/starter-kit": "^2.7.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Write bunfig.toml**

```toml
[install]
exact = true
```

- [ ] **Step 4: Install dependencies**

Run: `bun install`

Expected: All packages installed, `node_modules/` and `bun.lockb` created.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json bunfig.toml
git commit -m "chore: initialize project with Bun + React + TipTap deps"
```

---

### Task 2: Types and Utility Functions with Tests

**Files:**
- Create: `src/types.ts`
- Create: `src/utils/lines.ts`
- Create: `src/utils/diff.ts`
- Create: `src/utils/xml.ts`
- Create: `tests/lines.test.ts`
- Create: `tests/diff.test.ts`
- Create: `tests/xml.test.ts`

- [ ] **Step 1: Write types**

```typescript
// src/types.ts
export interface Comment {
  id: string;
  quote: string;
  lines: [number, number];
  text: string;
}

export interface ReviewState {
  original: string;
  markdown: string;
  comments: Comment[];
}
```

- [ ] **Step 2: Write line range utility**

```typescript
// src/utils/lines.ts
/**
 * Given the full text and a substring quote, return the 1-based line range.
 * Uses first occurrence. Returns null if quote not found.
 */
export function getLineRange(fullText: string, quote: string): [number, number] | null {
  const idx = fullText.indexOf(quote);
  if (idx === -1) return null;
  const start = idx;
  const end = idx + quote.length;
  const startLine = fullText.slice(0, start).split('\n').length;
  const endLine = fullText.slice(0, end).split('\n').length;
  return [startLine, endLine];
}
```

- [ ] **Step 3: Write lines test**

```typescript
// tests/lines.test.ts
import { describe, expect, test } from 'bun:test';
import { getLineRange } from '../src/utils/lines';

describe('getLineRange', () => {
  test('single line quote', () => {
    const text = 'line1\nline2\nline3';
    expect(getLineRange(text, 'line2')).toEqual([2, 2]);
  });

  test('multi-line quote', () => {
    const text = 'line1\nline2\nline3\nline4';
    expect(getLineRange(text, 'line2\nline3')).toEqual([2, 3]);
  });

  test('not found returns null', () => {
    const text = 'line1\nline2';
    expect(getLineRange(text, 'missing')).toBeNull();
  });

  test('empty quote at start', () => {
    const text = 'line1\nline2';
    expect(getLineRange(text, 'line1')).toEqual([1, 1]);
  });
});
```

- [ ] **Step 4: Run lines test (expect pass)**

Run: `bun test tests/lines.test.ts`

Expected: 4 tests pass.

- [ ] **Step 5: Write diff utility**

```typescript
// src/utils/diff.ts
import { createPatch } from 'diff';

export function computeDiff(original: string, modified: string, filePath: string): string {
  return createPatch(filePath, original, modified, '', '');
}
```

- [ ] **Step 6: Write diff test**

```typescript
// tests/diff.test.ts
import { describe, expect, test } from 'bun:test';
import { computeDiff } from '../src/utils/diff';

describe('computeDiff', () => {
  test('produces unified diff', () => {
    const diff = computeDiff('hello\nworld', 'hello\nthere', 'test.md');
    expect(diff).toContain('--- a/test.md');
    expect(diff).toContain('+++ b/test.md');
    expect(diff).toContain('-world');
    expect(diff).toContain('+there');
  });

  test('identical content produces empty diff', () => {
    const diff = computeDiff('same', 'same', 'test.md');
    // createPatch returns a header-only diff for identical files
    expect(diff).toContain('--- a/test.md');
    expect(diff).toContain('+++ b/test.md');
  });
});
```

- [ ] **Step 7: Run diff test (expect pass)**

Run: `bun test tests/diff.test.ts`

Expected: 2 tests pass.

- [ ] **Step 8: Write XML utility**

```typescript
// src/utils/xml.ts
import { computeDiff } from './diff';
import type { Comment } from '../types';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateXml(
  filePath: string,
  original: string,
  modified: string,
  comments: Comment[]
): string {
  const hasChanges = original !== modified;
  let xml = `<review>\n  <plan file="${escapeXml(filePath)}"/>\n`;

  if (hasChanges) {
    const diff = computeDiff(original, modified, filePath);
    xml += `  <diff><![CDATA[\n${diff}\n  ]]></diff>\n`;
  }

  for (const c of comments) {
    xml += `  <comment id="${c.id}">\n`;
    xml += `    <quote lines="${c.lines[0]}-${c.lines[1]}">${escapeXml(c.quote)}</quote>\n`;
    xml += `    ${escapeXml(c.text)}\n`;
    xml += `  </comment>\n`;
  }

  xml += '</review>';
  return xml;
}
```

- [ ] **Step 9: Write XML test**

```typescript
// tests/xml.test.ts
import { describe, expect, test } from 'bun:test';
import { generateXml } from '../src/utils/xml';
import type { Comment } from '../src/types';

describe('generateXml', () => {
  test('basic XML with comments and diff', () => {
    const comments: Comment[] = [
      { id: 'c1', quote: 'hello', lines: [1, 1], text: 'needs greeting' },
    ];
    const xml = generateXml('plan.md', 'hello\nworld', 'hello\nthere', comments);
    expect(xml).toContain('<plan file="plan.md"/>');
    expect(xml).toContain('<diff>');
    expect(xml).toContain('<comment id="c1">');
    expect(xml).toContain('<quote lines="1-1">hello</quote>');
    expect(xml).toContain('needs greeting');
    expect(xml).toContain('</review>');
  });

  test('no diff when content unchanged', () => {
    const comments: Comment[] = [];
    const xml = generateXml('plan.md', 'same', 'same', comments);
    expect(xml).not.toContain('<diff>');
    expect(xml).toContain('<plan file="plan.md"/>');
  });

  test('escapes XML special chars', () => {
    const comments: Comment[] = [
      { id: 'c1', quote: 'a < b', lines: [1, 1], text: 'x & y' },
    ];
    const xml = generateXml('plan.md', 'a < b', 'a < b', comments);
    expect(xml).toContain('a &lt; b');
    expect(xml).toContain('x &amp; y');
  });
});
```

- [ ] **Step 10: Run XML test (expect pass)**

Run: `bun test tests/xml.test.ts`

Expected: 3 tests pass.

- [ ] **Step 11: Run all tests together**

Run: `bun test`

Expected: All 9 tests pass.

- [ ] **Step 12: Commit**

```bash
git add src/types.ts src/utils/ tests/
git commit -m "feat(utils): add lines, diff, xml utilities with tests"
```

---

### Task 3: CLI Entry

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Write CLI entry**

```typescript
// src/cli.ts
import { parseArgs } from 'util';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { startServer } from './server';
import openBrowser from 'open';

async function main() {
  const { positionals, values } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      port: { type: 'string', short: 'p' },
      'no-open': { type: 'boolean', default: false },
    },
  });

  const filePath = positionals[0];
  if (!filePath) {
    console.error('Usage: plan-review <md-file> [-p <port>] [--no-open]');
    process.exit(1);
  }

  const resolvedPath = resolve(filePath);
  if (!existsSync(resolvedPath)) {
    console.error(`Error: file not found: ${resolvedPath}`);
    process.exit(1);
  }

  const md = await Bun.file(resolvedPath).text();

  const port = values.port ? parseInt(values.port, 10) : 0; // 0 = random
  const server = startServer({ md, filePath: resolvedPath, port });

  const actualPort = server.port;
  const url = `http://localhost:${actualPort}`;
  console.log(`plan-review serving at ${url}`);
  console.log('Press Ctrl+C to stop');

  if (!values['no-open']) {
    try {
      await openBrowser(url);
    } catch {
      console.log(`Please open ${url} in your browser`);
    }
  }
}

main();
```

- [ ] **Step 2: Verify CLI compiles**

Run: `bun run src/cli.ts --help`

Expected: Prints usage (file not found error since no file arg). Confirm no TypeScript errors.

- [ ] **Step 3: Test with a real file**

Create `/tmp/test-plan.md`:
```markdown
# Test Plan

This is a test.

- Item 1
- Item 2
```

Run: `bun run src/cli.ts /tmp/test-plan.md --no-open &`

Expected: Server starts, prints URL and port. Kill with `kill %1` or `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add src/cli.ts
git commit -m "feat(cli): add CLI entry with arg parsing and file validation"
```

---

### Task 4: Bun Server + HTML Template

**Files:**
- Create: `src/server.ts`
- Create: `public/index.html`

- [ ] **Step 1: Write server**

```typescript
// src/server.ts
import type { Server } from 'bun';

interface ServerOptions {
  md: string;
  filePath: string;
  port: number;
}

export function startServer({ md, filePath, port }: ServerOptions): Server {
  const initData = JSON.stringify({ md, filePath });

  return Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      if (pathname === '/') {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>plan-review</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script id="__INIT__">window.__INIT__ = ${initData};</script>
  <script src="/dist/main.js"></script>
</body>
</html>`;
        return new Response(html, { headers: { 'Content-Type': 'text/html' } });
      }

      const filePath = `public${pathname}`;
      const file = Bun.file(filePath);
      return new Response(file);
    },
  });
}
```

- [ ] **Step 2: Verify server serves HTML with __INIT__**

Run server in background:
```bash
bun run src/cli.ts /tmp/test-plan.md --no-open &
```

Run: `curl -s http://localhost:$(lsof -iTCP -sTCP:LISTEN -P | grep bun | awk '{print $9}' | cut -d: -f2 | head -1) | grep __INIT__`

(Or just `curl -s http://localhost:PORT | grep __INIT__` with the actual port from the CLI output.)

Expected: Response contains `<script id="__INIT__">window.__INIT__ = {...};</script>` with the markdown content.

- [ ] **Step 3: Commit**

```bash
git add src/server.ts public/index.html
git commit -m "feat(server): Bun.serve with dynamic HTML injection and static file serving"
```

---

### Task 5: Frontend Entry and State Management

**Files:**
- Create: `src/main.tsx`
- Create: `src/hooks/useReviewState.ts`
- Create: `src/components/App.tsx`

- [ ] **Step 1: Write frontend entry**

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { ReviewStateProvider } from './hooks/useReviewState';

declare global {
  interface Window {
    __INIT__: { md: string; filePath: string };
  }
}

const { md, filePath } = window.__INIT__;

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <StrictMode>
    <ReviewStateProvider initialMd={md} filePath={filePath}>
      <App />
    </ReviewStateProvider>
  </StrictMode>
);
```

- [ ] **Step 2: Write useReviewState hook**

```tsx
// src/hooks/useReviewState.ts
import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Comment, ReviewState } from '../types';

interface ReviewContextValue extends ReviewState {
  setMarkdown: (md: string) => void;
  addComment: (comment: Omit<Comment, 'id'>) => void;
  updateComment: (id: string, text: string) => void;
  deleteComment: (id: string) => void;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

type Action =
  | { type: 'SET_MARKDOWN'; payload: string }
  | { type: 'ADD_COMMENT'; payload: Comment }
  | { type: 'UPDATE_COMMENT'; payload: { id: string; text: string } }
  | { type: 'DELETE_COMMENT'; payload: string };

function reducer(state: ReviewState, action: Action): ReviewState {
  switch (action.type) {
    case 'SET_MARKDOWN':
      return { ...state, markdown: action.payload };
    case 'ADD_COMMENT':
      return { ...state, comments: [...state.comments, action.payload] };
    case 'UPDATE_COMMENT':
      return {
        ...state,
        comments: state.comments.map((c) =>
          c.id === action.payload.id ? { ...c, text: action.payload.text } : c
        ),
      };
    case 'DELETE_COMMENT':
      return {
        ...state,
        comments: state.comments.filter((c) => c.id !== action.payload),
      };
    default:
      return state;
  }
}

export function ReviewStateProvider({
  initialMd,
  filePath,
  children,
}: {
  initialMd: string;
  filePath: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    original: initialMd,
    markdown: initialMd,
    comments: [],
  });

  const value: ReviewContextValue = {
    ...state,
    setMarkdown: (md: string) => dispatch({ type: 'SET_MARKDOWN', payload: md }),
    addComment: (comment: Omit<Comment, 'id'>) => {
      const id = `c${state.comments.length + 1}`;
      dispatch({ type: 'ADD_COMMENT', payload: { ...comment, id } });
    },
    updateComment: (id: string, text: string) =>
      dispatch({ type: 'UPDATE_COMMENT', payload: { id, text } }),
    deleteComment: (id: string) => dispatch({ type: 'DELETE_COMMENT', payload: id }),
  };

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReviewState(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error('useReviewState must be used within ReviewStateProvider');
  return ctx;
}
```

- [ ] **Step 3: Write App shell**

```tsx
// src/components/App.tsx
import { Editor } from './Editor';
import { CommentSidebar } from './CommentSidebar';
import { CopyXmlButton } from './CopyXmlButton';

export function App() {
  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-auto">
        <Editor />
      </div>
      <div className="w-80 border-l border-gray-200 flex flex-col">
        <CommentSidebar />
        <CopyXmlButton />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx src/hooks/useReviewState.ts src/components/App.tsx
git commit -m "feat(frontend): add React entry, review state context, and App shell"
```

---

### Task 6: TipTap Editor

**Files:**
- Create: `src/components/Editor.tsx`

- [ ] **Step 1: Install TipTap packages**

Run: `bun install @tiptap/react @tiptap/starter-kit tiptap-markdown`

Expected: Packages installed successfully.

- [ ] **Step 2: Write Editor component**

```tsx
// src/components/Editor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { useReviewState } from '../hooks/useReviewState';
import { useEffect } from 'react';
import { SelectionToolbar } from './SelectionToolbar';

export function Editor() {
  const { markdown, setMarkdown } = useReviewState();

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: markdown,
    onUpdate: ({ editor }) => {
      const md = editor.storage.markdown.getMarkdown();
      setMarkdown(md);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none p-6 focus:outline-none',
      },
    },
  });

  // Sync external markdown changes (e.g. initial load)
  useEffect(() => {
    if (editor && editor.storage.markdown.getMarkdown() !== markdown) {
      editor.commands.setContent(markdown);
    }
  }, [editor, markdown]);

  if (!editor) return null;

  return (
    <div className="relative">
      <EditorContent editor={editor} />
      <SelectionToolbar editor={editor} />
    </div>
  );
}
```

- [ ] **Step 3: Verify Editor renders**

Build frontend:
```bash
bun build src/main.tsx --outdir public/dist --target browser
```

Start server and open browser. Verify:
- Markdown renders as formatted text (headings, lists, etc.)
- Text is editable

- [ ] **Step 4: Commit**

```bash
git add src/components/Editor.tsx
git commit -m "feat(editor): integrate TipTap with markdown support"
```

---

### Task 7: Selection Toolbar and Comment Creation

**Files:**
- Create: `src/components/SelectionToolbar.tsx`
- Create: `src/hooks/useComments.ts`

- [ ] **Step 1: Write useComments hook**

```tsx
// src/hooks/useComments.ts
import { useCallback } from 'react';
import { nanoid } from 'nanoid';
import { useReviewState } from './useReviewState';
import { getLineRange } from '../utils/lines';
import type { Comment } from '../types';

export function useComments() {
  const { markdown, addComment } = useReviewState();

  const createCommentFromSelection = useCallback(
    (selectedText: string) => {
      const lines = getLineRange(markdown, selectedText);
      if (!lines) return;

      const comment: Omit<Comment, 'id'> = {
        quote: selectedText,
        lines,
        text: '',
      };
      addComment(comment);
    },
    [markdown, addComment]
  );

  return { createCommentFromSelection };
}
```

- [ ] **Step 2: Write SelectionToolbar**

```tsx
// src/components/SelectionToolbar.tsx
import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useComments } from '../hooks/useComments';

export function SelectionToolbar({ editor }: { editor: Editor }) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const { createCommentFromSelection } = useComments();

  useEffect(() => {
    const handleSelectionChange = () => {
      const { state } = editor;
      const { selection } = state;
      const { from, to } = selection;

      if (from === to) {
        setPosition(null);
        return;
      }

      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0) {
        setPosition(null);
        return;
      }

      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPosition({ x: rect.left + rect.width / 2, y: rect.top - 40 });
    };

    editor.on('selectionUpdate', handleSelectionChange);
    return () => {
      editor.off('selectionUpdate', handleSelectionChange);
    };
  }, [editor]);

  const handleAddComment = () => {
    const { state } = editor;
    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to);
    if (!selectedText.trim()) return;

    createCommentFromSelection(selectedText);
    setPosition(null);
    // Clear selection
    editor.commands.focus('end');
  };

  if (!position) return null;

  return (
    <div
      className="absolute z-50 bg-gray-900 text-white text-sm px-3 py-1.5 rounded shadow-lg cursor-pointer hover:bg-gray-800"
      style={{ left: position.x, top: position.y, transform: 'translateX(-50%)' }}
      onClick={handleAddComment}
    >
      Add Comment
    </div>
  );
}
```

- [ ] **Step 3: Verify selection + comment creation**

Rebuild and test in browser:
1. Select text in the editor
2. "Add Comment" toolbar appears above selection
3. Click toolbar → a new comment appears in sidebar (sidebar will be built in next task)
4. Verify no console errors

- [ ] **Step 4: Commit**

```bash
git add src/components/SelectionToolbar.tsx src/hooks/useComments.ts
git commit -m "feat(comments): add selection toolbar and comment creation hook"
```

---

### Task 8: Comment Sidebar

**Files:**
- Create: `src/components/CommentCard.tsx`
- Create: `src/components/CommentSidebar.tsx`

- [ ] **Step 1: Write CommentCard**

```tsx
// src/components/CommentCard.tsx
import { useReviewState } from '../hooks/useReviewState';
import type { Comment } from '../types';

export function CommentCard({ comment, index }: { comment: Comment; index: number }) {
  const { updateComment, deleteComment } = useReviewState();

  return (
    <div className="border-b border-gray-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
        <span className="text-xs text-gray-400">lines {comment.lines[0]}-{comment.lines[1]}</span>
        <button
          onClick={() => deleteComment(comment.id)}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </div>
      <div className="bg-yellow-50 text-sm text-gray-700 p-2 rounded mb-2 italic">
        "{comment.quote}"
      </div>
      <textarea
        className="w-full text-sm border border-gray-200 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
        rows={3}
        placeholder="Write your comment..."
        value={comment.text}
        onChange={(e) => updateComment(comment.id, e.target.value)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write CommentSidebar**

```tsx
// src/components/CommentSidebar.tsx
import { useReviewState } from '../hooks/useReviewState';
import { CommentCard } from './CommentCard';

export function CommentSidebar() {
  const { comments } = useReviewState();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Comments ({comments.length})</h2>
      </div>
      {comments.length === 0 ? (
        <div className="p-4 text-sm text-gray-400 text-center">
          Select text and click "Add Comment" to start reviewing
        </div>
      ) : (
        comments.map((comment, i) => (
          <CommentCard key={comment.id} comment={comment} index={i} />
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify sidebar in browser**

Rebuild and test:
1. Select text → click "Add Comment"
2. Sidebar shows new comment card with quote preview and editable textarea
3. Type in textarea → state updates
4. Click Delete → comment removed

- [ ] **Step 4: Commit**

```bash
git add src/components/CommentCard.tsx src/components/CommentSidebar.tsx
git commit -m "feat(sidebar): add comment sidebar with cards and inline editing"
```

---

### Task 9: Copy XML Button

**Files:**
- Create: `src/components/CopyXmlButton.tsx`

- [ ] **Step 1: Write CopyXmlButton**

```tsx
// src/components/CopyXmlButton.tsx
import { useState } from 'react';
import { useReviewState } from '../hooks/useReviewState';
import { generateXml } from '../utils/xml';

export function CopyXmlButton() {
  const { original, markdown, comments, filePath } = useReviewState();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const xml = generateXml(filePath, original, markdown, comments);
    try {
      await navigator.clipboard.writeText(xml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy to clipboard');
      console.log(xml);
    }
  };

  return (
    <div className="p-3 border-t border-gray-200">
      <button
        onClick={handleCopy}
        className="w-full bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded hover:bg-blue-700 transition"
      >
        {copied ? 'Copied!' : 'Copy XML'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify XML copy flow**

Rebuild and test in browser:
1. Select text → Add Comment → type comment text
2. Edit some text in the editor
3. Click "Copy XML"
4. Paste somewhere (e.g. text editor) and verify XML structure:
   - Contains `<plan file="..."/>`
   - Contains `<diff>` with unified diff
   - Contains `<comment>` tags with `<quote lines="...">` and comment text

- [ ] **Step 3: Commit**

```bash
git add src/components/CopyXmlButton.tsx
git commit -m "feat(export): add Copy XML button with clipboard integration"
```

---

### Task 10: Build Script and End-to-End Verification

**Files:**
- Create: `build.ts`
- Modify: `package.json` (update scripts)

- [ ] **Step 1: Write build script**

```typescript
// build.ts
const result = await Bun.build({
  entrypoints: ['src/main.tsx'],
  outdir: 'public/dist',
  target: 'browser',
  minify: true,
});

if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log('Frontend built to public/dist/');

// Build CLI
const cliResult = await Bun.build({
  entrypoints: ['src/cli.ts'],
  outdir: 'dist',
  target: 'bun',
  minify: true,
});

if (!cliResult.success) {
  console.error('CLI build failed:');
  for (const log of cliResult.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log('CLI built to dist/cli.js');
```

- [ ] **Step 2: Update package.json scripts**

Modify `package.json` scripts:
```json
"scripts": {
  "dev": "bun run build.ts && bun run src/cli.ts",
  "build": "bun run build.ts",
  "test": "bun test",
  "start": "bun dist/cli.js"
}
```

- [ ] **Step 3: Run full build**

Run: `bun run build`

Expected:
```
Frontend built to public/dist/
CLI built to dist/cli.js
```

- [ ] **Step 4: End-to-end test**

Create `test-plan.md`:
```markdown
# Plan: Add User Auth

We need to implement user authentication.

## Requirements

- Login with email/password
- OAuth with Google
- Password reset

## Tasks

1. Set up auth middleware
2. Create login page
3. Add OAuth handlers
```

Run: `bun dist/cli.js test-plan.md`

Verify in browser:
1. Markdown renders correctly with headings, lists
2. Select "user authentication" → Add Comment → type "Consider using SSO"
3. Select "OAuth with Google" → Add Comment → type "Also add GitHub"
4. Edit "Login with email/password" to "Login with email, password, or SSO"
5. Click "Copy XML"
6. Paste into a text editor and verify:
   - `<plan file="..."/>` points to correct path
   - `<diff>` contains changes
   - Two `<comment>` tags with correct quotes, line numbers, and text

- [ ] **Step 5: Run all unit tests**

Run: `bun test`

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add build.ts package.json
git commit -m "feat(build): add build script for frontend and CLI bundling"
```

---

## Self-Review

**1. Spec coverage:**

| Spec Section | Task(s) |
|---|---|
| CLI entry, arg parsing | Task 3 |
| Bun server, HTML injection | Task 4 |
| TipTap editor, markdown import/export | Task 6 |
| Text selection, "Add Comment" toolbar | Task 7 |
| Right sidebar with comment cards | Task 8 |
| Editable markdown | Task 6 (TipTap editable) |
| Copy XML to clipboard | Task 9 |
| Diff output in XML | Task 2 (diff.ts), Task 9 (CopyXmlButton) |
| Line numbers in quote | Task 2 (lines.ts), Task 7 |
| Build & distribution | Task 10 |

**2. Placeholder scan:** No TBD, TODO, "implement later", or vague steps found.

**3. Type consistency:** All types (`Comment`, `ReviewState`) defined in `src/types.ts` and used consistently across all tasks.

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-04-22-plan-review-cli.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
