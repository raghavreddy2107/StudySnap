import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Only model that works — retry if overloaded
const MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const RETRY_DELAY = 10000; // wait 10 seconds between retries

export const streamSummary = async (prompt, onChunk) => {
  const systemText = typeof prompt === 'object' && prompt ? (prompt.system || '') : '';
  const userText = typeof prompt === 'object' && prompt ? (prompt.user || '') : String(prompt || '');
  const fullPromptText = [systemText, userText].filter(Boolean).join('\n\n');

  let maxOutputTokens = 8192;
  if (
    fullPromptText.includes('Keep total output under 300 words') ||
    fullPromptText.includes('ONLY the most critical key terms')
  ) {
    maxOutputTokens = 1200;
  }

  const request = {
    contents: [{ role: 'user', parts: [{ text: fullPromptText }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens,
    },
  };

  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;
      console.log(`[AI] Attempt ${attempt}/${MAX_RETRIES} with ${MODEL}`);

      const model = genAI.getGenerativeModel({ model: MODEL });
      const result = await model.generateContentStream(request);
      let finalText = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk?.text?.() || '';
        if (!chunkText) continue;
        finalText += chunkText;
        await onChunk(chunkText);
      }

      console.log(`[AI] Success on attempt ${attempt}`);

      return finalText;

    } catch (err) {
      console.log(`[AI] Attempt ${attempt} failed: ${err.message.slice(0, 80)}`);

      if (attempt < MAX_RETRIES && err.message.includes('503')) {
        console.log(`[AI] Waiting 10s before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        throw err; // not a 503 or max retries reached
      }
    }
  }
};