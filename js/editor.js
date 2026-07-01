/* js/editor.js */
/**
 * Editor Module - Controls the textarea, backdrop layering for exact
 * character highlighting, read-only locks, and history stack.
 */

let editorEl = null;
let backdropEl = null;

let undoStack = [];
let redoStack = [];
const MAX_STACK_SIZE = 50;

let lastAiRange = null; // { start, end }
let isGenerating = false;

/**
 * Initializes the editor elements and event listeners.
 * @param {string} textareaId 
 * @param {string} backdropId 
 */
export function initEditor(textareaId, backdropId) {
  editorEl = document.getElementById(textareaId);
  backdropEl = document.getElementById(backdropId);

  if (editorEl) {
    editorEl.addEventListener('keydown', handleKeydown);
    editorEl.addEventListener('input', handleInput);
    editorEl.addEventListener('scroll', syncScroll);
    editorEl.addEventListener('click', handleEditorClick);
    
    // Clear highlight on focus change, but delay slightly to let action buttons handle clicks
    editorEl.addEventListener('blur', () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (active && (active.id === 'btn-undo' || active.id === 'btn-regenerate' || active.id === 'btn-generate')) {
          return;
        }
        if (lastAiRange) {
          clearHighlight();
        }
      }, 200);
    });
  }

  // Initial render
  updateBackdrop();
}

/**
 * Escapes HTML characters to prevent breaking layout or script injections.
 */
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Keeps the scroll position of the backdrop in perfect sync with the textarea.
 */
export function syncScroll() {
  if (backdropEl && editorEl) {
    backdropEl.scrollTop = editorEl.scrollTop;
    backdropEl.scrollLeft = editorEl.scrollLeft;
  }
}

/**
 * Renders the backdrop, highlighting the last AI segment if active.
 */
export function updateBackdrop() {
  if (!backdropEl || !editorEl) return;

  let text = editorEl.value;
  
  // Textarea rendering quirks: a trailing newline doesn't render height without a space
  if (text.endsWith('\n')) {
    text += ' ';
  }

  if (lastAiRange && lastAiRange.start !== lastAiRange.end) {
    const start = Math.max(0, Math.min(lastAiRange.start, text.length));
    const end = Math.max(start, Math.min(lastAiRange.end, text.length));

    const before = text.substring(0, start);
    const highlighted = text.substring(start, end);
    const after = text.substring(end);

    backdropEl.innerHTML = 
      escapeHTML(before) + 
      '<span class="ai-highlight ai-text">' + 
      escapeHTML(highlighted) + 
      '</span>' + 
      escapeHTML(after);
  } else {
    backdropEl.innerHTML = escapeHTML(text);
  }
  syncScroll();
}

/**
 * Clears the AI text highlight.
 */
export function clearHighlight() {
  lastAiRange = null;
  updateBackdrop();
}

function handleInput() {
  if (lastAiRange) {
    clearHighlight();
  }
  updateBackdrop();
}

function handleKeydown(e) {
  // Ignore keystrokes during generation lock
  if (isGenerating) {
    e.preventDefault();
    return;
  }

  // Clear highlight on any manual typing keystroke
  if (lastAiRange) {
    // Avoid clearing on formatting/navigational keys if preferred, but general activity requires clear
    const ignoredKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Control', 'Shift', 'Alt', 'Meta'];
    if (!ignoredKeys.includes(e.key)) {
      clearHighlight();
    }
  }
}

function handleEditorClick() {
  if (lastAiRange) {
    clearHighlight();
  }
}

/**
 * Pushes the current text to the history stack.
 */
export function pushState() {
  if (!editorEl) return;
  const text = editorEl.value;

  if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== text) {
    undoStack.push(text);
    if (undoStack.length > MAX_STACK_SIZE) {
      undoStack.shift();
    }
    redoStack = []; // Reset redo chain on new user action
  }
}

/**
 * Performs history undo action.
 * @returns {boolean} Whether undo was successful.
 */
export function undo() {
  if (!editorEl || undoStack.length === 0) return false;

  const current = editorEl.value;
  redoStack.push(current);

  const prev = undoStack.pop();
  editorEl.value = prev;

  clearHighlight();
  updateBackdrop();

  editorEl.focus();
  editorEl.selectionStart = editorEl.selectionEnd = editorEl.value.length;
  return true;
}

/**
 * Performs history redo action.
 * @returns {boolean} Whether redo was successful.
 */
export function redo() {
  if (!editorEl || redoStack.length === 0) return false;

  const current = editorEl.value;
  undoStack.push(current);

  const next = redoStack.pop();
  editorEl.value = next;

  clearHighlight();
  updateBackdrop();

  editorEl.focus();
  editorEl.selectionStart = editorEl.selectionEnd = editorEl.value.length;
  return true;
}

/**
 * Discards the last AI-generated segment.
 * @returns {boolean} Whether discard was successful.
 */
export function discardLastAiSegment() {
  if (!editorEl || !lastAiRange) return false;

  const text = editorEl.value;
  const start = Math.max(0, Math.min(lastAiRange.start, text.length));
  const end = Math.max(start, Math.min(lastAiRange.end, text.length));

  const before = text.substring(0, start);
  const after = text.substring(end);

  editorEl.value = before + after;
  editorEl.focus();
  editorEl.selectionStart = editorEl.selectionEnd = start;

  clearHighlight();
  updateBackdrop();
  return true;
}

/**
 * Inserts text at the current cursor position.
 * @param {string} text 
 */
export function insertTextAtCursor(text) {
  if (!editorEl) return;
  const start = editorEl.selectionStart;
  const end = editorEl.selectionEnd;
  const currentVal = editorEl.value;

  editorEl.value = currentVal.substring(0, start) + text + currentVal.substring(end);
  editorEl.selectionStart = editorEl.selectionEnd = start + text.length;

  updateBackdrop();
}

/**
 * Locks or unlocks editing.
 * @param {boolean} locked 
 */
export function setReadOnly(locked) {
  if (!editorEl) return;
  isGenerating = locked;
  editorEl.readOnly = locked;
  if (locked) {
    editorEl.classList.add('editor-locked');
  } else {
    editorEl.classList.remove('editor-locked');
  }
}

/**
 * Signals that an AI generation has started.
 */
export function startAiGeneration() {
  pushState(); // Save state before generation starts
  
  if (!editorEl) return;

  const currentPos = editorEl.selectionStart;
  lastAiRange = {
    start: currentPos,
    end: currentPos
  };

  setReadOnly(true);
}

/**
 * Appends a generated stream chunk to the active AI range.
 * @param {string} chunk 
 */
export function appendAiChunk(chunk) {
  if (!editorEl || !lastAiRange) return;

  const text = editorEl.value;
  const before = text.substring(0, lastAiRange.end);
  const after = text.substring(lastAiRange.end);

  editorEl.value = before + chunk + after;
  lastAiRange.end += chunk.length;

  // Move caret to end of stream
  editorEl.selectionStart = editorEl.selectionEnd = lastAiRange.end;

  updateBackdrop();
}

/**
 * Signals that an AI generation has completed.
 */
export function endAiGeneration() {
  setReadOnly(false);
}

/**
 * Gets the current editor content text.
 */
export function getContent() {
  return editorEl ? editorEl.value : '';
}

/**
 * Sets the editor content text.
 */
export function setContent(text) {
  if (!editorEl) return;
  editorEl.value = text || '';
  clearHighlight();
  updateBackdrop();
}

export function getLastAiRange() {
  return lastAiRange;
}

export function getUndoStack() {
  return undoStack;
}

export function getRedoStack() {
  return redoStack;
}
