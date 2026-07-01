/* js/api.js */
import { getTriggeredEntries, fitEntries } from './lorebook.js';

/**
 * Prepares the system prompt and story history prompt based on the 70/30 budget rule.
 * 
 * @param {string} storyText - The text of the story up to the generation point.
 * @param {string} globalMemory - The global memory text.
 * @param {Array<Object>} lorebookEntries - All lorebook entries.
 * @param {number} contextBudget - Total character budget.
 * @returns {Object} The system and user message contents.
 */
export function prepareContext(storyText, globalMemory, lorebookEntries, contextBudget = 8000) {
  const baseSystemPrompt = "You are a creative writing assistant. Continue the user's story naturally.";
  
  // Calculate system budget (30% of total)
  const systemBudget = Math.floor(contextBudget * 0.30);
  
  // Budget available for custom system components (Memory & Lorebook)
  const availableSystemBudget = systemBudget - baseSystemPrompt.length;
  
  let formattedMemory = "";
  if (globalMemory && globalMemory.trim()) {
    formattedMemory = globalMemory.trim();
  }
  
  // Calculate remaining budget for Lorebook entries
  const memoryCost = formattedMemory ? `\n\n[Global Memory]\n${formattedMemory}`.length : 0;
  const lorebookBudget = Math.max(0, availableSystemBudget - memoryCost);
  
  // Scan storyText (last 2000 ch matches checked inside getTriggeredEntries)
  const triggered = getTriggeredEntries(storyText, lorebookEntries);
  const fittedLore = fitEntries(triggered, lorebookBudget);
  
  // Construct the system prompt
  let systemContent = baseSystemPrompt;
  if (formattedMemory) {
    systemContent += `\n\n[Global Memory]\n${formattedMemory}`;
  }
  if (fittedLore.length > 0) {
    const loreContent = fittedLore.map(e => e.content).join('\n');
    systemContent += `\n\n[Lorebook]\n${loreContent}`;
  }
  
  // The rest of the budget (at least 70%) is for story history
  const historyBudget = contextBudget - systemContent.length;
  
  // Slice story history from the end
  const historyContent = storyText.slice(-historyBudget);
  
  return {
    systemPrompt: systemContent,
    historyPrompt: historyContent,
    fittedLorebook: fittedLore
  };
}

/**
 * Streams completion chunks from the DeepSeek API.
 * 
 * @param {Object} params - Generation parameters.
 * @param {string} params.storyText - Story content.
 * @param {Object} params.apiConfig - API configuration settings.
 * @param {Array<Object>} params.lorebookEntries - Lorebook entries.
 * @param {string} params.globalMemory - Global memory content.
 * @param {Function} params.onChunk - Callback for each stream text fragment.
 * @param {Function} params.onStart - Callback when the stream starts.
 * @param {Function} params.onComplete - Callback when the stream ends.
 * @param {Function} params.onError - Callback on error.
 * @param {AbortSignal} [params.signal] - Optional abort signal to cancel generation.
 */
export async function generateContinuation({
  storyText,
  apiConfig,
  lorebookEntries,
  globalMemory,
  onChunk,
  onStart,
  onComplete,
  onError,
  signal
}) {
  try {
    const apiKey = apiConfig.apiKey;
    if (!apiKey) {
      throw new Error('API Key is missing. Please configure it in Settings.');
    }

    const { systemPrompt, historyPrompt } = prepareContext(
      storyText,
      globalMemory,
      lorebookEntries,
      apiConfig.contextBudget || 8000
    );

    let url = (apiConfig.baseUrl || 'https://api.deepseek.com/v1').trim();
    if (!url.endsWith('/chat/completions')) {
      url = url.endsWith('/') ? url + 'chat/completions' : url + '/chat/completions';
    }

    if (onStart) onStart();

    const body = {
      model: apiConfig.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: historyPrompt }
      ],
      stream: true,
      temperature: typeof apiConfig.temperature === 'number' ? apiConfig.temperature : 1.0,
      max_tokens: typeof apiConfig.maxTokens === 'number' ? apiConfig.maxTokens : 150,
      top_p: typeof apiConfig.topP === 'number' ? apiConfig.topP : 1.0,
      presence_penalty: typeof apiConfig.presencePenalty === 'number' ? apiConfig.presencePenalty : 0.0,
      frequency_penalty: typeof apiConfig.frequencyPenalty === 'number' ? apiConfig.frequencyPenalty : 0.0
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) {
          errorMessage = errJson.error.message;
        }
      } catch (_) {}
      throw new Error(errorMessage);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let completedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Hold onto partial line

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;
        
        if (cleanLine === 'data: [DONE]') {
          break;
        }

        if (cleanLine.startsWith('data: ')) {
          try {
            const jsonStr = cleanLine.substring(6);
            const parsed = JSON.parse(jsonStr);
            const choice = parsed.choices?.[0];
            const text = choice?.delta?.content || '';
            if (text) {
              completedText += text;
              if (onChunk) onChunk(text);
            }
          } catch (err) {
            console.warn('Could not parse SSE JSON line:', cleanLine, err);
          }
        }
      }
    }

    // Process any leftover buffer just in case
    if (buffer) {
      const cleanLine = buffer.trim();
      if (cleanLine && cleanLine !== 'data: [DONE]' && cleanLine.startsWith('data: ')) {
        try {
          const jsonStr = cleanLine.substring(6);
          const parsed = JSON.parse(jsonStr);
          const choice = parsed.choices?.[0];
          const text = choice?.delta?.content || '';
          if (text) {
            completedText += text;
            if (onChunk) onChunk(text);
          }
        } catch (_) {}
      }
    }

    if (onComplete) onComplete(completedText);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Stream generation aborted by user.');
      return;
    }
    if (onError) onError(err);
  }
}
