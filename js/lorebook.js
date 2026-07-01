/* js/lorebook.js */
/**
 * Lorebook Module - Handles keyword matching, priority-based sorting,
 * and context fitting within defined budgets.
 */

/**
 * Escapes characters with special meaning in regular expressions.
 * @param {string} string - The raw string to escape.
 * @returns {string} The escaped string safe for RegExp.
 */
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scans the last 2000 characters of a text for exact word matching of keywords.
 * Returns an array of keys that successfully matched.
 * @param {string} text - The full story text.
 * @param {Array<string>} keys - Array of keyword strings to search for.
 * @returns {Array<string>} The subset of keys that were matched.
 */
export function matchKeywords(text, keys) {
  if (!text || !keys || !Array.isArray(keys)) {
    return [];
  }

  // Scan only the last 2000 characters
  const scanText = text.slice(-2000);
  const matched = [];

  for (const key of keys) {
    if (!key || typeof key !== 'string' || !key.trim()) {
      continue;
    }
    const cleanKey = key.trim();
    // Case-insensitive exact word boundary matching
    const regex = new RegExp('\\b' + escapeRegExp(cleanKey) + '\\b', 'i');
    if (regex.test(scanText)) {
      matched.push(cleanKey);
    }
  }

  return matched;
}

/**
 * Sorts an array of lorebook entries by priority descending.
 * @param {Array<Object>} entries - The lorebook entries list.
 * @returns {Array<Object>} A new sorted array of entries.
 */
export function sortLorebook(entries) {
  if (!entries || !Array.isArray(entries)) {
    return [];
  }
  return [...entries].sort((a, b) => {
    const priorityA = typeof a.priority === 'number' ? a.priority : 0;
    const priorityB = typeof b.priority === 'number' ? b.priority : 0;
    return priorityB - priorityA;
  });
}

/**
 * Evaluates a list of lorebook entries against a text.
 * Returns the ones that are enabled and triggered by their keys.
 * @param {string} text - The story text.
 * @param {Array<Object>} lorebookEntries - The list of lorebook entries.
 * @returns {Array<Object>} Enabled and triggered entries.
 */
export function getTriggeredEntries(text, lorebookEntries) {
  if (!lorebookEntries || !Array.isArray(lorebookEntries)) {
    return [];
  }

  return lorebookEntries.filter(entry => {
    // Only process enabled entries with content
    if (!entry.enabled || !entry.content) {
      return false;
    }

    const keys = Array.isArray(entry.keys)
      ? entry.keys
      : (typeof entry.keys === 'string' ? entry.keys.split(',').map(k => k.trim()) : []);

    const matched = matchKeywords(text, keys);
    return matched.length > 0;
  });
}

/**
 * Greedily selects triggered entries starting from highest priority that fit within a character budget.
 * @param {Array<Object>} triggeredEntries - Triggered lorebook entries.
 * @param {number} budget - Maximum character budget allowed.
 * @returns {Array<Object>} Sub-array of entries that fit the budget.
 */
export function fitEntries(triggeredEntries, budget) {
  if (!triggeredEntries || !Array.isArray(triggeredEntries) || budget <= 0) {
    return [];
  }

  const sorted = sortLorebook(triggeredEntries);
  const result = [];
  let currentUsed = 0;

  for (const entry of sorted) {
    const contentLength = (entry.content || '').length;
    // We add 1 to simulate a newline separation between entries if they are combined.
    // However, pure content length is standard. Let's stick to content length.
    if (currentUsed + contentLength <= budget) {
      result.push(entry);
      currentUsed += contentLength;
    }
  }

  return result;
}
