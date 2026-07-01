/* js/storage.js */
/**
 * Storage Engine Module - Handles CRUD operations, import/export utilities,
 * and localStorage quota checks for story data.
 */

// Prefix for story keys in localStorage to avoid collisions
const STORAGE_PREFIX = 'scrivistoria_story_';

/**
 * Saves a story to localStorage.
 * Automatically generates a UUID if not present, and sets timestamps.
 * @param {Object} story - The story object to save.
 * @returns {Object} The saved story object.
 */
export function saveStory(story) {
  if (!story) {
    throw new Error('No story object provided for saving.');
  }

  // Generate ID if missing
  if (!story.id) {
    story.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Update timestamps
  story.updatedAt = new Date().toISOString();
  if (!story.createdAt) {
    story.createdAt = story.updatedAt;
  }

  // Ensure default structures are present
  story.title = story.title || 'Nuova Storia';
  story.content = story.content || '';
  story.globalMemory = story.globalMemory || '';
  story.lorebook = Array.isArray(story.lorebook) ? story.lorebook : [];
  story.settings = story.settings || {
    fontFamily: 'var(--font-serif)',
    fontSize: 18,
    lineHeight: 1.8,
    theme: 'amethyst-dark'
  };
  story.apiConfig = story.apiConfig || {
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    temperature: 1.0,
    topP: 1.0,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
    maxTokens: 150,
    contextBudget: 8000
  };

  const key = STORAGE_PREFIX + story.id;
  try {
    localStorage.setItem(key, JSON.stringify(story));
  } catch (e) {
    console.error('Failed to save story to localStorage:', e);
    throw new Error('Storage quota exceeded or writing failed.');
  }

  return story;
}

/**
 * Loads a single story by its ID.
 * @param {string} id - The story UUID.
 * @returns {Object|null} The parsed story object, or null if not found.
 */
export function loadStory(id) {
  if (!id) return null;
  const key = STORAGE_PREFIX + id;
  const data = localStorage.getItem(key);
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch (e) {
    console.error(`Failed to parse story data for ID ${id}:`, e);
    return null;
  }
}

/**
 * Deletes a story by its ID.
 * @param {string} id - The story UUID.
 */
export function deleteStory(id) {
  if (!id) return;
  const key = STORAGE_PREFIX + id;
  localStorage.removeItem(key);
}

/**
 * Lists all stories stored in localStorage.
 * Sorts them by updatedAt timestamp descending.
 * @returns {Array<Object>} List of all story objects.
 */
export function listStories() {
  const stories = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      const story = loadStory(key.substring(STORAGE_PREFIX.length));
      if (story) {
        stories.push(story);
      }
    }
  }

  // Sort by updatedAt desc (newest first)
  return stories.sort((a, b) => {
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Returns the current localStorage used bytes.
 * Approximates character lengths as bytes (UTF-16 characters).
 * @returns {number} The estimated used bytes.
 */
export function getStorageUsedBytes() {
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const val = localStorage.getItem(key);
      totalBytes += key.length + (val ? val.length : 0);
    }
  }
  return totalBytes;
}

/**
 * Calculates the percentage of the 5MB localStorage limit currently used.
 * @returns {number} The percentage used (0.0 to 100.0).
 */
export function getStorageQuota() {
  const limit = 5 * 1024 * 1024; // 5 MB limit
  const used = getStorageUsedBytes();
  return Math.min((used / limit) * 100, 100);
}

/**
 * Triggers a browser file download of the story object in JSON format.
 * Includes all content, global memory, lorebook, settings, and API configurations.
 * @param {Object} story - The story object to export.
 */
export function exportStoryAsJSON(story) {
  if (!story) return;
  const jsonString = JSON.stringify(story, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${story.title || 'storia'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a browser file download of the story content as a plain text file.
 * @param {Object} story - The story object to export.
 */
export function exportStoryAsText(story) {
  if (!story) return;
  const content = story.content || '';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${story.title || 'storia'}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates an imported JSON string as a story.
 * If valid, saves the story to localStorage and returns it.
 * @param {string} jsonString - The serialized story JSON.
 * @returns {Object} The successfully imported and saved story object.
 */
export function importStoryFromJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed result is not an object.');
    }

    // Basic structure alignment/validation
    const story = {
      id: parsed.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)),
      title: parsed.title || 'Imported Story',
      content: typeof parsed.content === 'string' ? parsed.content : '',
      globalMemory: typeof parsed.globalMemory === 'string' ? parsed.globalMemory : '',
      lorebook: Array.isArray(parsed.lorebook) ? parsed.lorebook : [],
      settings: parsed.settings || {
        fontFamily: 'var(--font-serif)',
        fontSize: 18,
        lineHeight: 1.8,
        theme: 'amethyst-dark'
      },
      apiConfig: parsed.apiConfig || {
        apiKey: '',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        temperature: 1.0,
        topP: 1.0,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0,
        maxTokens: 150,
        contextBudget: 8000
      }
    };

    // Ensure all lorebook entries are validated
    story.lorebook = story.lorebook.map((entry, idx) => {
      return {
        id: entry.id || `lore-${idx}-${Date.now()}`,
        keys: Array.isArray(entry.keys) ? entry.keys : (typeof entry.keys === 'string' ? [entry.keys] : []),
        content: typeof entry.content === 'string' ? entry.content : '',
        enabled: typeof entry.enabled === 'boolean' ? entry.enabled : true,
        priority: typeof entry.priority === 'number' ? entry.priority : 10
      };
    });

    return saveStory(story);
  } catch (e) {
    throw new Error('Invalid story JSON format: ' + e.message);
  }
}

/**
 * Creates a brand new story using imported raw text as its content.
 * @param {string} text - The raw text content.
 * @param {string} [title] - Optional title for the new story.
 * @returns {Object} The created and saved story object.
 */
export function importStoryFromText(text, title = 'Imported Text Story') {
  const story = {
    title: title,
    content: text || '',
    globalMemory: '',
    lorebook: [],
    settings: {
      fontFamily: 'var(--font-serif)',
      fontSize: 18,
      lineHeight: 1.8,
      theme: 'amethyst-dark'
    },
    apiConfig: {
      apiKey: '',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      temperature: 1.0,
      topP: 1.0,
      presencePenalty: 0.0,
      frequencyPenalty: 0.0,
      maxTokens: 150,
      contextBudget: 8000
    }
  };
  return saveStory(story);
}
