# Technical Design: NovelAI Clone

This document specifies the architecture and implementation details for the distraction-free creative writing app.

## 1. Module Flow Diagram

```
+--------------------------------------------------------------+
|                         index.html                           |
+------------------------------+-------------------------------+
                               | Loads ES Modules
                               v
+--------------------------------------------------------------+
|                         js/main.js                           |
|                  (Central State & Events)                    |
+---------+--------------+--------------+-------------+--------+
          |              |              |             |
          v              v              v             v
    +-----------+  +-----------+  +-----------+  +-----------+
    | editor.js |  | storage.js|  |   ui.js   |  |  api.js   |
    +-----------+  +-----------+  +-----------+  +-----+-----+
                                                       |
                                                       v
                                                 +-----------+
                                                 |lorebook.js|
                                                 +-----------+
```

*   **js/main.js**: Main entry point; coordinates state and passes actions between modules.
*   **js/editor.js**: Manages textarea interaction, selection, styling generated text, and undo states.
*   **js/storage.js**: Performs LocalStorage CRUD and imports/exports (JSON / TXT).
*   **js/ui.js**: Controls sidebar/drawer visibility, updates progress bars, and manages themes.
*   **js/api.js**: Orchestrates context collection and streams responses from the DeepSeek API.
*   **js/lorebook.js**: Handles keyword matching and priority-based sorting.

---

## 2. File Directory

| File Path | Responsibility |
| :--- | :--- |
| `index.html` | App markup, containing the editor surface, settings drawer, and story list. |
| `css/main.css` | Global styles, typography settings, and theme custom CSS variables. |
| `css/layout.css` | Grid-based layout, sidebar toggles, and responsive drawers. |
| `css/components.css` | Styling for buttons, form controls, progress bars, and highlighted AI text. |
| `js/main.js` | App bootstrapping, shared state storage, and event delegation. |
| `js/api.js` | Prompts preparation, context budget calculation, and fetch SSE streaming. |
| `js/editor.js` | Typing locks, keystroke listener for highlight removal, and history stack. |
| `js/lorebook.js` | Regular expression word-boundary scanner and sorting algorithms. |
| `js/storage.js` | Story auto-save, JSON validation, and raw text exporter. |
| `js/ui.js` | UI rendering, modal interactions, and theme class toggling. |

---

## 3. Data Schema

### Stories and Lorebook JSON Schema
```json
{
  "id": "string (UUID)",
  "title": "string",
  "content": "string",
  "globalMemory": "string",
  "lorebook": [
    {
      "id": "string",
      "keys": ["string"],
      "content": "string",
      "enabled": "boolean",
      "priority": "number"
    }
  ],
  "settings": {
    "fontFamily": "string",
    "fontSize": "number",
    "lineHeight": "number",
    "theme": "amethyst-dark | cyberpunk-night | parchment | slate"
  },
  "apiConfig": {
    "apiKey": "string",
    "baseUrl": "string",
    "model": "string",
    "temperature": "number",
    "topP": "number",
    "presencePenalty": "number",
    "frequencyPenalty": "number",
    "maxTokens": "number",
    "contextBudget": "number"
  }
}
```

---

## 4. Prompt Structure & Context Budgeting

The DeepSeek chat completion prompt is constructed dynamically:
1.  **System Prompt**: Standard instructions + Global Memory + Active Lorebook Entries.
2.  **User Prompt**: Story History (ending at the cursor or text length).

```json
{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "system",
      "content": "You are a creative writing assistant. Continue the user's story naturally. [Global Memory]\n[Triggered Lorebook Entries]"
    },
    {
      "role": "user",
      "content": "[Trimmed Story History]"
    }
  ],
  "stream": true,
  "temperature": 1.0
}
```

### Context Budget Algorithm (70/30 Rule)
Let $B$ be the character limit configured by the user (proxy for tokens, 1 token $\approx$ 4 characters).
*   **Story History Allocation**: Guaranteed $\ge 0.70 \times B$.
*   **System Context Allocation**: Max $0.30 \times B$.
1.  Add Global Memory size ($M$) to system context.
2.  Scan the last 2000 characters of story text for active Lorebook entries using exact word boundaries: `new RegExp('\\b' + escapeRegExp(key) + '\\b', 'i')`.
3.  Sort triggered entries by `priority` (descending).
4.  Greedily append entries to the context until adding the next entry would exceed $(0.30 \times B) - M$.

---

## 5. UI Theme System

Custom CSS variables in `css/main.css` control theme layouts. Themes are activated by setting the class on `<body>`:

```css
body.amethyst-dark {
  --bg-color: #120e1a;
  --text-color: #e5def0;
  --accent-color: #9d4edd;
  --highlight-color: rgba(157, 78, 221, 0.25);
  --border-color: rgba(157, 78, 221, 0.15);
}
body.cyberpunk-night {
  --bg-color: #05050d;
  --text-color: #00ffcc;
  --accent-color: #ff007f;
  --highlight-color: rgba(255, 0, 127, 0.25);
  --border-color: rgba(0, 255, 204, 0.2);
}
body.parchment {
  --bg-color: #f7f1e3;
  --text-color: #2c2c2c;
  --accent-color: #8c7ae6;
  --highlight-color: rgba(140, 122, 230, 0.15);
  --border-color: rgba(0, 0, 0, 0.1);
}
body.slate {
  --bg-color: #1e293b;
  --text-color: #f8fafc;
  --accent-color: #3b82f6;
  --highlight-color: rgba(59, 130, 246, 0.25);
  --border-color: rgba(255, 255, 255, 0.1);
}
```

---

## 6. Testing Strategy

Without a Node environment, verification is executed via browser console tests using a static `test.html` harness that imports production modules and runs assertions.

```html
<!-- test.html -->
<script type="module">
  import { matchKeywords, sortLorebook } from './js/lorebook.js';
  import { calculateBudget } from './js/api.js';

  console.group('Lorebook Engine Tests');
  
  // Test Scenario 1: Case-insensitive Word boundary
  const matched = matchKeywords('A catastrophe occurs.', ['cat']);
  console.assert(matched.length === 0, 'Should not match "cat" in "catastrophe"');
  
  // Test Scenario 2: Priority budget allocation
  const sorted = sortLorebook([{ priority: 5 }, { priority: 10 }]);
  console.assert(sorted[0].priority === 10, 'Should sort higher priority first');

  console.groupEnd();
</script>
```
