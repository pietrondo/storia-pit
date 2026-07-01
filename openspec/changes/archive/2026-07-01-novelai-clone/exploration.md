# Exploration Report: NovelAI-like Web Application with DeepSeek API

## 1. Objectives & Scope
The goal of this project is to build a distraction-free, premium, responsive web application for collaborative storytelling, inspired by NovelAI, using the DeepSeek API. The app will be built using a pure vanilla web stack: Core HTML5, modern vanilla JavaScript (ES modules), and custom Vanilla CSS.

### Core Features
- **Distraction-Free Editor**: A clean, elegant editing environment optimized for writing, with customizable typography, spacing, and width.
- **API Panel**: An adjustable dashboard/drawer to configure DeepSeek API settings (API key, base URL, model selection, temperature, top-p, presence/frequency penalty, maximum generation length).
- **Context Injection Engine**:
  - **Global Memory**: High-priority context that is always prepended to the prompt.
  - **Lorebook**: A system where entries (world info, character bios) are automatically injected into the generation context only when specific trigger phrases are found within the recent story history.
- **Story Management**: Ability to save, load, and organize stories locally in the browser, with options to export/import stories as custom JSON (containing story text, memory, and lorebook configuration) or plain text.
- **Premium Aesthetics**: Dark mode, glassmorphism UI components, glowing interactive borders, smooth transitions, and responsive layout.

---

## 2. Comparison of Technical Approaches

We compare two structural approaches for organizing this pure-vanilla application:

### Approach A: Monolithic Single-Page App (SPA)
A single HTML file containing all structural layout, inline CSS stylesheets (or a single css file), and a single script containing all application logic.

- **Pros**:
  - Complete portability: The app can run by double-clicking `index.html` from any directory without a local web server.
  - Zero deployment friction.
- **Cons**:
  - **Poor Maintainability**: Mixing Lorebook key-phrase matching logic, local storage serialization, API stream handling, and DOM event listeners into one large JS file will lead to spaghetti code.
  - **Lack of Extensibility**: Adding new AI backends, complex rich text formatting, or advanced accessibility features becomes extremely difficult.
  - **No Separation of Concerns**: Hard to debug and read.

### Approach B: Modular ES Modules SPA (Recommended)
An HTML shell referencing a modular stylesheet structure and modern ES Modules (`import`/`export`) loaded directly in the browser using `type="module"`.

- **Pros**:
  - **High Cohesion & Low Coupling**: Different domains (API communication, database/storage layer, lorebook engine, editor UI) are split into logical files.
  - **No Bundler Overhead**: Leverages native browser module loading—no Node.js build process, webpack, or Vite needed to compile the code.
  - **Maintainability**: Clear architectural boundaries. For example, testing the Lorebook scanner doesn't require importing DOM elements or UI libraries.
  - **Clean Codebase**: Small, highly readable files with focused responsibilities.
- **Cons**:
  - **Local Hosting Requirement**: Due to browser security restrictions on ES Modules, the application cannot be run via the `file://` protocol (double-clicking the HTML file). It requires running a simple local server (e.g. `npx serve` or python's `http.server`), which is already standard in modern web development workflows.

---

## 3. Proposed Directory Structure

To support the modular approach, the following directory structure is proposed:

```
scrivi-storia/
├── index.html              # Main application entry point
├── css/
│   ├── main.css            # Base styles, global variables (design tokens), animations
│   ├── layout.css          # Flex/Grid layout definitions for panels and editor
│   └── components.css      # CSS styles for editor, lorebook lists, modals, and drawers
├── js/
│   ├── main.js             # App bootstrap; coordinates imports and events
│   ├── api.js              # DeepSeek API integration (headers, payload formats, streaming)
│   ├── editor.js           # Text area controller (autosave triggers, cursor control, metrics)
│   ├── lorebook.js         # Lorebook engine (CRUD operations, scanning text for keys)
│   ├── storage.js          # Browser storage manager (LocalStorage/IndexedDB, JSON export/import)
│   └── ui.js               # Panel animations, loading state indicators, glassmorphic draw control
├── assets/                 # Icons, logo graphics, web manifest
└── openspec/               # Specification and planning documentation
    ├── config.yaml
    └── changes/
        └── novelai-clone/
            └── exploration.md
```

---

## 4. Technical Strategy Details

### A. DeepSeek API Integration & Context Composition
DeepSeek provides an OpenAI-compatible API. The `api.js` module will construct requests targeting `/v1/chat/completions`.
For creative generation, the context must be composed carefully. When a user requests "Write" (generate next segment), the application will construct the `messages` array for the chat model:
1. **System Prompt**: Base prompt describing the AI's role (e.g., "You are an assistant that completes stories in a creative, descriptive style...").
2. **Context Block (System/User)**:
   - **Global Memory**: High-level story overview (e.g., "The story takes place in a floating city. Marcus is seeking a lost relic.").
   - **Lorebook Injections**: The scanner searches the last $N$ characters (e.g., 2000 characters) of the story text for Lorebook trigger words. Active entries are serialized and appended to the context block (e.g., "LORE: Marcus is a 30-year-old explorer with a mechanical arm.").
3. **Story History (User/Assistant)**: The actual text written in the editor. To prevent exceeding context limits, the text is sliced to include the last $M$ tokens or characters.

### B. Distraction-Free Editor
The editor needs to look and feel premium:
- Centered layout, taking up ~600-800px max-width to enhance focus.
- Custom fonts: `Outfit` or `Inter` for interfaces, and a readable serif font (e.g., `Merriweather` or `Lora`) for story writing.
- Transparent textareas or `contenteditable` elements, blending seamlessly with the deep dark background.
- Floating toolbar that appears when text is selected (to copy, wrap in formatting, or generate specifically from selection).

### C. Lorebook Logic
- A Lorebook entry is defined as:
  ```json
  {
    "id": "entry-uuid",
    "keys": ["dragon", "dragons", "fire-breather"],
    "content": "Dragons are rare, ancient reptiles. They breed in volcanic vents.",
    "enabled": true
  }
  ```
- Before requesting text completion, the editor text is tokenized or parsed using simple regular expressions matching the defined keys.
- If a match occurs, the `content` is added to the temporary prompt assembly block.

---

## 5. Architectural Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **API Key Security** | High | Since this is a client-side only app, API keys must **never** be hardcoded. The app will require users to input their own DeepSeek API Key, which is stored securely in the browser's `localStorage` (or `sessionStorage`) and sent only to the DeepSeek endpoint directly from the browser. |
| **CORS Policy Restrictions** | Medium | DeepSeek's API supports CORS for client-side invocations, but some endpoints/custom proxies might block browser requests. The API module will support customizable endpoints, and clear instructions will be provided if a local proxy is needed. |
| **Context Length Management** | Medium | Large stories can exceed DeepSeek's token limit. The context composition logic will prune older parts of the story, ensuring only the most recent paragraphs, the memory block, and triggered lorebook entries are sent to the model. |
| **Storage Limits** | Low | LocalStorage is limited to ~5MB. While sufficient for many text stories, very long stories or large image embeds could hit limits. Mitigations: encourage downloading JSON exports and plan a transition to IndexedDB if database demands scale. |
