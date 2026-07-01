# Tasks: NovelAI Clone Implementation Plan

## 1. Review Workload Forecast
- **Estimated Changed Lines**: ~1200
- **400-Line Budget Risk**: High
- **Chained PRs Recommended**: Yes
- **Chain Strategy**: stacked-to-main
- **Decision Needed**: Yes (approval of task breakdown and chained PR delivery)

## 2. Implementation Checklists

### PR 1: UI & Styles
- [x] 1.1 Create `index.html` structure (centered text container, sidebar, settings drawer, export controls).
- [x] 1.2 Implement `css/main.css` for typography custom properties, reset, and base themes.
- [x] 1.3 Implement `css/layout.css` for grid, responsive drawers, and flex sidebar components.
- [x] 1.4 Implement `css/components.css` for buttons, forms, progress bars, and custom highlighted text.
- [x] 1.5 Create `js/ui.js` to manage modal actions, sidebar/drawer toggles, and dynamic class transitions.
- [ ] 1.6 Verify UI visuals, responsiveness, font switching, and basic theme toggle functionality in browser.

### PR 2: Lorebook & Storage
- [x] 2.1 Create `js/storage.js` to handle CRUD operations for story data in localStorage.
- [x] 2.2 Implement JSON import/export and plain text export in `js/storage.js`.
- [x] 2.3 Add localStorage quota check and calculation utility (5MB limit) in `js/storage.js`.
- [x] 2.4 Create `js/lorebook.js` with exact-word case-insensitive matching algorithm (`RegExp('\\b' + key + '\\b', 'i')`).
- [x] 2.5 Implement priority-based sorting and budget allocation logic in `js/lorebook.js` for matching entries.

### PR 3: DeepSeek API & Editor Streaming Wiring
- [x] 3.1 Create `js/api.js` to handle streaming generation requests using Fetch SSE.
- [x] 3.2 Implement the 70/30 context budgeting algorithm in `js/api.js` using `lorebook.js` selectors.
- [x] 3.3 Create `js/editor.js` to control text selection, key event listeners, highlights, and history stack.
- [x] 3.4 Implement editing locks during generation stream (read-only textarea) and automatic highlight clearing.
- [x] 3.5 Create `js/main.js` to bootstrap the app, store central state, and coordinate events across modules.
- [x] 3.6 Wire "Regenerate" and "Undo" buttons to replace or discard the last AI-generated segment.

## 3. Verification & Testing Tasks
- [ ] 3.1 Create `test.html` browser-based testing harness.
- [ ] 3.2 Add unit assertions in `test.html` for `lorebook.js` matching (word boundaries, case sensitivity).
- [ ] 3.3 Add unit assertions in `test.html` for `storage.js` operations (CRUD, import/export, quota checks).
- [ ] 3.4 Add unit assertions in `test.html` for `api.js` budgeting arithmetic (70/30 distribution under limits).
- [ ] 3.5 Perform manual validation: streaming generation lock, highlight removal on keystroke, story imports.
