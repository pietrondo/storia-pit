/* js/main.js */
import { 
  initEditor, 
  getContent, 
  setContent, 
  startAiGeneration, 
  appendAiChunk, 
  endAiGeneration, 
  discardLastAiSegment, 
  undo, 
  redo,
  pushState
} from './editor.js';

import {
  saveStory,
  loadStory,
  deleteStory,
  listStories,
  getStorageUsedBytes
} from './storage.js';

import {
  applyTheme,
  showToast,
  updateStorageProgress,
  setButtonLoading
} from './ui.js';

import {
  generateContinuation
} from './api.js';

// Central State
let currentStory = null;
let saveTimeout = null;
let activeAbortController = null;

// Escapes special HTML characters
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
 * Saves the active story and updates storage displays.
 */
function saveActiveStory() {
  if (!currentStory) return;

  // Gather current values
  currentStory.content = getContent();

  const titleEl = document.getElementById('story-title');
  if (titleEl) {
    currentStory.title = titleEl.value.trim() || 'Nuova Storia';
  }

  const memoryEl = document.getElementById('memory-textarea');
  if (memoryEl) {
    currentStory.globalMemory = memoryEl.value;
  }

  // Gather apiConfig
  currentStory.apiConfig = {
    apiKey: document.getElementById('api-key-input')?.value || '',
    baseUrl: document.getElementById('api-url-input')?.value || 'https://api.deepseek.com/v1',
    model: document.getElementById('api-model-select')?.value || 'deepseek-chat',
    temperature: parseFloat(document.getElementById('temp-slider')?.value ?? 1.0),
    maxTokens: parseInt(document.getElementById('max-tokens-slider')?.value ?? 150, 10),
    contextBudget: parseInt(document.getElementById('budget-slider')?.value ?? 8000, 10),
    topP: currentStory.apiConfig?.topP ?? 1.0,
    presencePenalty: currentStory.apiConfig?.presencePenalty ?? 0.0,
    frequencyPenalty: currentStory.apiConfig?.frequencyPenalty ?? 0.0
  };

  // Gather settings
  currentStory.settings = {
    fontFamily: document.getElementById('font-family-select')?.value || 'var(--font-serif)',
    fontSize: parseInt(document.getElementById('font-size-slider')?.value ?? 18, 10),
    lineHeight: parseFloat(document.getElementById('line-height-slider')?.value ?? 1.8),
    theme: document.body.className.split(' ').find(c => ['amethyst-dark', 'cyberpunk-night', 'parchment', 'slate'].includes(c)) || 'amethyst-dark'
  };

  saveStory(currentStory);
  updateQuotaDisplay();
}

/**
 * Triggers a debounced auto-save.
 */
function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveActiveStory();
  }, 1000);
}

/**
 * Updates the storage quota progress bar.
 */
function updateQuotaDisplay() {
  updateStorageProgress(getStorageUsedBytes());
}

/**
 * Selects and loads a story.
 */
function selectStory(id) {
  const story = loadStory(id);
  if (story) {
    currentStory = story;
    loadStoryData(story);
    renderStoryList();
  }
}

/**
 * Renders the stories list in the sidebar.
 */
function renderStoryList() {
  const listEl = document.getElementById('story-list');
  if (!listEl) return;

  const stories = listStories();
  listEl.innerHTML = '';

  if (stories.length === 0) {
    listEl.innerHTML = `
      <li class="story-empty" style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">
        Nessuna storia salvata.
      </li>
    `;
    return;
  }

  stories.forEach(story => {
    const li = document.createElement('li');
    li.className = `story-item${story.id === currentStory?.id ? ' active' : ''}`;
    li.dataset.id = story.id;

    const formattedDate = story.updatedAt ? new Date(story.updatedAt).toLocaleDateString() : 'data non disponibile';

    li.innerHTML = `
      <div class="story-item-info">
        <span class="story-item-title">${escapeHTML(story.title)}</span>
        <span class="story-item-date">${formattedDate}</span>
      </div>
      <div class="item-actions">
        <button class="btn-icon btn-delete-story" data-id="${story.id}" style="width: 28px; height: 28px; border: none; background: transparent;" title="Elimina storia">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    li.addEventListener('click', () => {
      if (story.id !== currentStory?.id) {
        selectStory(story.id);
      }
    });

    const deleteBtn = li.querySelector('.btn-delete-story');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Sei sicuro di voler eliminare la storia "${story.title}"?`)) {
        deleteStory(story.id);
        if (currentStory?.id === story.id) {
          const remaining = listStories();
          if (remaining.length > 0) {
            selectStory(remaining[0].id);
          } else {
            const newStory = saveStory({ title: 'Nuova Storia', content: '' });
            selectStory(newStory.id);
          }
        } else {
          renderStoryList();
        }
        showToast('Storia eliminata', 'info');
      }
    });

    listEl.appendChild(li);
  });
}

/**
 * Loads a story state into the DOM elements.
 */
function loadStoryData(story) {
  setContent(story.content);

  const titleEl = document.getElementById('story-title');
  if (titleEl) titleEl.value = story.title;

  const memoryEl = document.getElementById('memory-textarea');
  if (memoryEl) memoryEl.value = story.globalMemory || '';

  // API Config
  const apiConfig = story.apiConfig || {};
  const apiKeyEl = document.getElementById('api-key-input');
  if (apiKeyEl) apiKeyEl.value = apiConfig.apiKey || '';

  const apiUrlEl = document.getElementById('api-url-input');
  if (apiUrlEl) apiUrlEl.value = apiConfig.baseUrl || 'https://api.deepseek.com/v1';

  const apiModelEl = document.getElementById('api-model-select');
  if (apiModelEl) apiModelEl.value = apiConfig.model || 'deepseek-chat';

  const tempEl = document.getElementById('temp-slider');
  if (tempEl) tempEl.value = apiConfig.temperature ?? 1.0;

  const maxTokensEl = document.getElementById('max-tokens-slider');
  if (maxTokensEl) maxTokensEl.value = apiConfig.maxTokens ?? 150;

  const budgetEl = document.getElementById('budget-slider');
  if (budgetEl) budgetEl.value = apiConfig.contextBudget ?? 8000;

  // Style Settings
  const settings = story.settings || {};
  const fontFamilyEl = document.getElementById('font-family-select');
  if (fontFamilyEl) fontFamilyEl.value = settings.fontFamily || 'var(--font-serif)';

  const fontSizeEl = document.getElementById('font-size-slider');
  if (fontSizeEl) fontSizeEl.value = settings.fontSize ?? 18;

  const lineHeightEl = document.getElementById('line-height-slider');
  if (lineHeightEl) lineHeightEl.value = settings.lineHeight ?? 1.8;

  applyTheme(settings.theme || 'amethyst-dark');

  // Trigger UI changes for sliders/layout sizing
  ['temp-slider', 'max-tokens-slider', 'budget-slider', 'font-size-slider', 'line-height-slider', 'font-family-select'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('change'));
    }
  });

  renderLorebookList();
  updateQuotaDisplay();
}

/**
 * Renders the lorebook items panel list.
 */
function renderLorebookList() {
  const listEl = document.getElementById('lorebook-list');
  if (!listEl) return;

  const entries = currentStory?.lorebook || [];
  if (entries.length === 0) {
    listEl.innerHTML = `
      <li class="lorebook-empty" style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">
        Nessuna voce registrata. Aggiungine una sopra!
      </li>
    `;
    return;
  }

  listEl.innerHTML = '';
  entries.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'lorebook-item';
    li.dataset.id = entry.id;

    const keysText = Array.isArray(entry.keys) ? entry.keys.join(', ') : entry.keys;
    const preview = entry.content.length > 40 ? entry.content.substring(0, 37) + '...' : entry.content;

    li.innerHTML = `
      <div class="lorebook-item-info">
        <span class="lorebook-item-key">${escapeHTML(keysText)} (Prio: ${entry.priority})</span>
        <span class="lorebook-item-preview">${escapeHTML(preview)}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem; z-index: 5;">
        <label class="switch" style="width: 34px; height: 20px;">
          <input type="checkbox" class="lore-entry-toggle" data-id="${entry.id}" ${entry.enabled ? 'checked' : ''}>
          <span class="slider-toggle" style="border-radius: 20px;"></span>
        </label>
        <button class="btn-icon btn-delete-lore" data-id="${entry.id}" style="width: 28px; height: 28px; border: none; background: transparent;" title="Elimina voce">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // Toggle listener
    const toggleEl = li.querySelector('.lore-entry-toggle');
    toggleEl.addEventListener('change', (e) => {
      entry.enabled = e.target.checked;
      saveActiveStory();
    });

    // Delete listener
    const deleteBtn = li.querySelector('.btn-delete-lore');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentStory.lorebook = currentStory.lorebook.filter(x => x.id !== entry.id);
      saveActiveStory();
      renderLorebookList();
      showToast('Voce lorebook rimossa', 'info');
    });

    // Click to edit
    li.addEventListener('click', () => {
      document.getElementById('lore-keys').value = Array.isArray(entry.keys) ? entry.keys.join(', ') : entry.keys;
      document.getElementById('lore-content').value = entry.content;
      document.getElementById('lore-priority').value = entry.priority;
      document.getElementById('lore-enabled').checked = entry.enabled;
    });

    listEl.appendChild(li);
  });
}

/**
 * Submits the SSE write generation request.
 */
async function handleGenerate() {
  if (!currentStory) return;

  saveActiveStory();

  const apiConfig = currentStory.apiConfig;
  if (!apiConfig.apiKey) {
    showToast('Inserisci la chiave API DeepSeek nella Config AI.', 'error');
    return;
  }

  const generateBtn = document.getElementById('btn-generate');
  const originalHtml = generateBtn ? generateBtn.innerHTML : '';

  if (activeAbortController) {
    activeAbortController.abort();
  }
  activeAbortController = new AbortController();

  const storyText = getContent();
  const lorebookEntries = currentStory.lorebook || [];
  const globalMemory = currentStory.globalMemory || '';

  try {
    startAiGeneration();
    setButtonLoading(generateBtn, true, originalHtml);

    await generateContinuation({
      storyText,
      apiConfig,
      lorebookEntries,
      globalMemory,
      onChunk: (chunk) => {
        appendAiChunk(chunk);
      },
      onStart: () => {
        showToast('Inizio generazione...', 'info');
      },
      onComplete: (completedText) => {
        endAiGeneration();
        setButtonLoading(generateBtn, false, originalHtml);
        activeAbortController = null;
        
        // Save the finished text to state
        pushState();
        saveActiveStory();
        renderStoryList();
      },
      onError: (err) => {
        endAiGeneration();
        setButtonLoading(generateBtn, false, originalHtml);
        activeAbortController = null;
        showToast(err.message, 'error');
      },
      signal: activeAbortController.signal
    });
  } catch (err) {
    console.error(err);
    endAiGeneration();
    setButtonLoading(generateBtn, false, originalHtml);
    activeAbortController = null;
  }
}

/**
 * Discards last AI part and regenerates.
 */
function handleRegenerate() {
  const discarded = discardLastAiSegment();
  if (discarded) {
    handleGenerate();
  } else {
    showToast('Nessun segmento AI recente da rigenerare.', 'warning');
  }
}

/**
 * Reverts to previous history state.
 */
function handleUndo() {
  const undone = undo();
  if (undone) {
    saveActiveStory();
    showToast('Annullato', 'info');
  } else {
    showToast('Nessuna modifica da annullare.', 'warning');
  }
}

/**
 * Boots core events and hooks.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Init editor markup bindings
  initEditor('editor', 'editor-backdrop');

  // Load existing stories
  const stories = listStories();
  if (stories.length > 0) {
    selectStory(stories[0].id);
  } else {
    // Bootstrap fresh default story
    const freshStory = saveStory({
      title: 'Nuova Storia',
      content: ''
    });
    selectStory(freshStory.id);
  }

  // 1. Sidebar Story Actions
  const btnNewStory = document.getElementById('btn-new-story');
  if (btnNewStory) {
    btnNewStory.addEventListener('click', () => {
      saveActiveStory();
      const fresh = saveStory({
        title: 'Nuova Storia',
        content: ''
      });
      selectStory(fresh.id);
      showToast('Nuova storia creata', 'success');
    });
  }

  // 2. Story Title Input
  const storyTitleInput = document.getElementById('story-title');
  if (storyTitleInput) {
    storyTitleInput.addEventListener('input', () => {
      if (currentStory) {
        currentStory.title = storyTitleInput.value.trim() || 'Nuova Storia';
        debouncedSave();
        // Snappy list item renaming
        const activeItem = document.querySelector('#story-list .story-item.active .story-item-title');
        if (activeItem) activeItem.textContent = currentStory.title;
      }
    });

    storyTitleInput.addEventListener('blur', () => {
      saveActiveStory();
      renderStoryList();
    });
  }

  // 3. Textarea input debouncer
  const editorArea = document.getElementById('editor');
  if (editorArea) {
    editorArea.addEventListener('input', () => {
      debouncedSave();
    });
  }

  // 4. Settings Form Change Triggers
  const settingIds = [
    'api-key-input', 'api-url-input', 'api-model-select', 
    'temp-slider', 'max-tokens-slider', 'budget-slider',
    'font-family-select', 'font-size-slider', 'line-height-slider'
  ];
  settingIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        saveActiveStory();
      });
      el.addEventListener('input', () => {
        debouncedSave();
      });
    }
  });

  // 5. Memory Input
  const memoryText = document.getElementById('memory-textarea');
  if (memoryText) {
    memoryText.addEventListener('input', () => {
      debouncedSave();
    });
    memoryText.addEventListener('change', () => {
      saveActiveStory();
    });
  }

  // 6. Theme option hook updates
  const themeOpts = document.querySelectorAll('.theme-option');
  themeOpts.forEach(opt => {
    opt.addEventListener('click', () => {
      setTimeout(() => {
        saveActiveStory();
      }, 100);
    });
  });

  // 7. Lorebook entry addition
  const btnAddLore = document.getElementById('btn-add-lore');
  if (btnAddLore) {
    btnAddLore.addEventListener('click', () => {
      const keysInput = document.getElementById('lore-keys');
      const contentInput = document.getElementById('lore-content');
      const priorityInput = document.getElementById('lore-priority');
      const enabledInput = document.getElementById('lore-enabled');

      const rawKeys = keysInput.value.trim();
      const content = contentInput.value.trim();
      const priority = parseInt(priorityInput.value, 10) || 10;
      const enabled = enabledInput.checked;

      if (!rawKeys || !content) {
        showToast('Specificare chiavi e contenuto per la voce Lorebook.', 'error');
        return;
      }

      const keys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

      const newEntry = {
        id: `lore-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        keys,
        content,
        priority,
        enabled
      };

      if (!currentStory.lorebook) {
        currentStory.lorebook = [];
      }

      // Check if duplicate keys, if so overwrite
      const dupIndex = currentStory.lorebook.findIndex(e => e.keys.join(',') === keys.join(','));
      if (dupIndex !== -1) {
        currentStory.lorebook[dupIndex] = {
          ...currentStory.lorebook[dupIndex],
          content,
          priority,
          enabled
        };
        showToast('Voce lorebook aggiornata', 'success');
      } else {
        currentStory.lorebook.push(newEntry);
        showToast('Voce lorebook aggiunta', 'success');
      }

      saveActiveStory();
      renderLorebookList();

      // Clear inputs
      keysInput.value = '';
      contentInput.value = '';
      priorityInput.value = '10';
      enabledInput.checked = true;
    });
  }

  // 8. Import/Export
  const btnExportJson = document.getElementById('btn-export-json');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      saveActiveStory();
      import { exportStoryAsJSON } from './storage.js';
      exportStoryAsJSON(currentStory);
      showToast('Esportato JSON', 'success');
    });
  }

  const btnExportTxt = document.getElementById('btn-export-txt');
  if (btnExportTxt) {
    btnExportTxt.addEventListener('click', () => {
      saveActiveStory();
      import { exportStoryAsText } from './storage.js';
      exportStoryAsText(currentStory);
      showToast('Esportato Testo', 'success');
    });
  }

  const btnImportJson = document.getElementById('btn-import-json');
  const importFileInput = document.getElementById('import-file-input');
  if (btnImportJson && importFileInput) {
    btnImportJson.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          import { importStoryFromJSON } from './storage.js';
          const imported = importStoryFromJSON(evt.target.result);
          selectStory(imported.id);
          showToast(`Storia "${imported.title}" importata!`, 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
        importFileInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  // 9. Floating Editor controls
  const btnGenerate = document.getElementById('btn-generate');
  if (btnGenerate) {
    btnGenerate.addEventListener('click', handleGenerate);
  }

  const btnRegenerate = document.getElementById('btn-regenerate');
  if (btnRegenerate) {
    btnRegenerate.addEventListener('click', handleRegenerate);
  }

  const btnUndo = document.getElementById('btn-undo');
  if (btnUndo) {
    btnUndo.addEventListener('click', handleUndo);
  }

  // 10. Shortcut bindings (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
  window.addEventListener('keydown', (e) => {
    const editor = document.getElementById('editor');
    if (editor?.readOnly) return; // Locked during generation

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        // Redo
        const redone = redo();
        if (redone) {
          saveActiveStory();
          showToast('Ripristinato', 'info');
        }
      } else {
        // Undo
        handleUndo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      const redone = redo();
      if (redone) {
        saveActiveStory();
        showToast('Ripristinato', 'info');
      }
    }
  });
});
