# Proposal: NovelAI-like Story Writing Web Application (NovelAI Clone)

## 1. Executive Summary
The goal of this project is to build a premium, distraction-free, responsive web application for collaborative storytelling powered by the DeepSeek API. The application will be built using a pure vanilla web stack: Core HTML5, modern vanilla JavaScript (ES modules), and custom Vanilla CSS. It features a distraction-free writing environment, custom context injection (Global Memory and a Lorebook), and robust local story management.

## 2. Problem Statement & User Persona
Authors and creative writers want a distraction-free environment to write stories interactively with generative AI models. However, standard chat interfaces (like ChatGPT) are not optimized for creative writing. Writers need:
1. **Continuous Text Generation**: AI completions that blend seamlessly into their story.
2. **Persistent Context**: The ability to define global rules or story memory (e.g., world settings, characters) that the AI never forgets.
3. **Lorebooks**: Dynamic context that is only sent to the AI when specific keywords are mentioned in the active story.
4. **Data Ownership**: Storing stories locally with easy offline import/export tools, without mandatory accounts or server-side databases.

## 3. Scope & Requirements

### A. Distraction-Free Editor
- A centered, reading-optimized editor layout (600px - 800px max-width).
- Customizable typography: choice of serif (e.g., Merriweather, Lora) and sans-serif (e.g., Outfit, Inter) fonts, text size, and line spacing.
- Clean text editor surface that blends into a deep dark/glassmorphic interface.

### B. API Configuration Panel
- Adjustable drawer/dashboard to configure DeepSeek API settings:
  - API Key (saved in browser's local storage only, never exposed to a server).
  - Customizable API endpoint (Base URL) to support proxies/local servers.
  - Model selection (e.g., `deepseek-chat`).
  - Generation parameters: Temperature, Top-P, Presence Penalty, Frequency Penalty, and Max Generation Length.

### C. Context Injection Engine (Memory & Lorebook)
- **Global Memory**: High-priority text containing core story rules/world context that is always prepended to the prompt context.
- **Lorebook entries**: Dictionary of character bios, lore, or terms.
  - Each entry has `id`, `keys` (comma-separated key phrases), `content` (description), `enabled` flag, and a `priority` integer.
  - **Dynamic Injections**: Automatically scans recent history for matching keys. Matches are serialized and injected into the context sent to the AI.

### D. Story Management
- Local sidebar to create, load, rename, and delete stories.
- **Export/Import**:
  - Full JSON export/import (saves the story text, memory configurations, and all lorebook settings).
  - Plain text export (exports the story content as a `.txt` file).

---

## 4. Product Decisions & Product Rules

### Rule 1: Context Budget Allocation
To prevent API failures or excessive context window utilization, prompt composition follows an **automatic balancing strategy**:
- **Story History Guarantee**: A minimum of **70%** of the selected token budget is guaranteed for the recent story history.
- **Context/Lorebook Budget**: The remaining **30%** is allocated to Global Memory and active Lorebook entries.
- **Lorebook Overflow resolution**: If the total size of triggered Lorebook entries + Global Memory exceeds the 30% allocation, entries are sorted by their `priority` field (highest priority first). Lowest priority entries are dropped first until the context fits the 30% budget.
- **Configurability**: Users can adjust the total context size limit in the settings drawer.

### Rule 2: Lorebook Matching Behavior
- The scanning window is limited to the last **2000 characters** of the story history.
- Matching uses **case-insensitive exact word matching** to avoid false positive partial-word triggers (e.g., "cat" shouldn't trigger a lorebook entry for "catastrophe").
- Entries support a `priority` field (integers, e.g. 1-100) where higher values are prioritized for context injection.

### Rule 3: UX Flow & Generation State
- **Prevention of Race Conditions**: The text editor is disabled (read-only mode) while generation is actively streaming.
- **AI Text Highlighting**: Newly generated AI text is styled with a subtle golden/violet highlight to distinguish it from user-written text. The highlight vanishes once the user starts typing, clicks away, or explicitly accepts it.
- **Regeneration**: A "Regenerate" button is visible in the toolbar/editor controls to quickly discard the last generated slice and prompt the API to generate a new continuation.

### Rule 4: Storage & Usage Limits
- **Storage Backend**: LocalStorage is used for storage.
- **Storage Metrics**: The settings panel includes a visual "Storage Used" progress bar displaying the approximate percentage of LocalStorage utilized.
- **Drafts and Listing**: A collapsible sidebar displays a simple list of saved stories. 

---

## 5. Technology Stack & Design Decisions
- **Core Technology**: Pure Vanilla Stack (HTML5, Vanilla CSS3, Vanilla JS). No bundler, no framework overhead.
- **Modules**: Native browser ES modules (`import`/`export` with `type="module"`).
- **Styling**: Sleek dark mode, glassmorphic card overlays, glowing indicator borders, Outfit/Inter interface fonts, and high-readability Serif body fonts.
- **API Communication**: Streaming text delivery using `fetch` with Server-Sent Events (SSE) protocol reading from the DeepSeek `/chat/completions` endpoint.

---

## 6. Out of Scope (Non-Goals for MVP)
1. **User Accounts & Cloud Syncing**: The app is strictly client-side and serverless. Offline-first local files are the source of truth.
2. **AI Image/Audio Generation**: We are focusing entirely on text generation.
3. **Complex Regex or Fuzzy Key Matching**: Matching is exact-word case-insensitive.
4. **Rich Text Formatting (Bold/Italic/Images inline)**: The editor is plain-text focus, though standard spacing (paragraphs/newlines) is preserved.

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **LocalStorage 5MB Quota** | Medium | Large stories or many files might exceed LocalStorage limits. Mitigations: Story size warnings, a "Storage Used" progress bar, and encouragement of JSON exports for active archival. |
| **API Key Leakage** | High | Keys stored on a server could be compromised. Mitigation: Zero server backend. The API key is stored directly in browser storage and only transmitted to the DeepSeek official API endpoint. |
| **Context Limit Failures** | Medium | Long stories can exhaust the model context. Mitigation: Hard context trimming in `api.js` using the 70/30 automatic budgeting rule. |
| **CORS / Network Blockers** | Low | DeepSeek API might block direct browser requests if CORS headers are misconfigured. Mitigation: Provide a configurable Base URL in settings to allow users to redirect requests through a local proxy or custom API wrapper if necessary. |
