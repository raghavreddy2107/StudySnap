import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Only model that works — retry if overloaded
const MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const RETRY_DELAY = 10000; // wait 10 seconds between retries
const STREAM_PARSE_ERROR_TEXT = 'failed to parse stream';
const DISABLE_STREAM = String(process.env.GEMINI_DISABLE_STREAM || '').toLowerCase() === 'true';

function getErrorMessage(err) {
  if (!err) return '';
  if (typeof err.message === 'string') return err.message;
  return String(err);
}

function shouldRetry(err) {
  const msg = getErrorMessage(err).toLowerCase();
  return msg.includes('503') || msg.includes('overloaded') || msg.includes('timeout');
}

function shouldFallbackToNonStream(err) {
  const msg = getErrorMessage(err).toLowerCase();
  return msg.includes(STREAM_PARSE_ERROR_TEXT);
}

export const streamSummary = async (prompt, onChunk) => {
  const systemText = typeof prompt === 'object' && prompt ? (prompt.system || '') : '';
  const userText = typeof prompt === 'object' && prompt ? (prompt.user || '') : String(prompt || '');
  const fullPromptText = [systemText, userText].filter(Boolean).join('\n\n');

  let maxOutputTokens =20000;
  if (
    fullPromptText.includes('Keep total output under 300 words') ||
    fullPromptText.includes('ONLY the most critical key terms')
  ) {
    maxOutputTokens = 20000;
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
      let finalText = '';

      if (DISABLE_STREAM) {
        const nonStreamResult = await model.generateContent(request);
        finalText = nonStreamResult?.response?.text?.() || '';
        if (finalText) {
          await onChunk(finalText);
        }
      } else {
        try {
          const result = await model.generateContentStream(request);
          for await (const chunk of result.stream) {
            const chunkText = chunk?.text?.() || '';
            if (!chunkText) continue;
            finalText += chunkText;
            await onChunk(chunkText);
          }
        } catch (streamErr) {
          if (!shouldFallbackToNonStream(streamErr)) {
            throw streamErr;
          }

          console.warn('[AI] Stream parse failed, falling back to non-stream response');
          const nonStreamResult = await model.generateContent(request);
          finalText = nonStreamResult?.response?.text?.() || '';
          if (finalText) {
            await onChunk(finalText);
          }
        }
      }

      console.log(`[AI] Success on attempt ${attempt}`);

      return finalText;

    } catch (err) {
      const errMsg = getErrorMessage(err);
      console.log(`[AI] Attempt ${attempt} failed: ${errMsg.slice(0, 80)}`);

      if (attempt < MAX_RETRIES && shouldRetry(err)) {
        console.log(`[AI] Waiting 10s before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        throw err; // not a 503 or max retries reached
      }
    }
  }
};