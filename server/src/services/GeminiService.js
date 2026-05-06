// src/services/GeminiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Fallback chain — tries each model in order if 503/429
const MODELS = [
  'gemini-2.5-flash',
];

export const streamSummary = async (prompt, onChunk) => {
  let maxOutputTokens = 8192;
  if (
    prompt.includes('Keep total output under 300 words') ||
    prompt.includes('ONLY the most critical key terms')
  ) {
    maxOutputTokens = 1200;
  }

  const request = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens,
    },
  };

  let lastError;

  for (const modelName of MODELS) {
    try {
      console.log(`[AI] Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(request);
      const finalText = result.response.text();
      console.log(`[AI] Success with: ${modelName}`);

      // Your original streaming logic — unchanged
      const parts = finalText.match(/\S+\s*/g) || [finalText];
      for (const part of parts) {
        await onChunk(part);
      }

      return finalText;

    } catch (err) {
      console.log(`[AI] ${modelName} failed: ${err.message}`);
      lastError = err;
      if (!err.message.includes('503') && !err.message.includes('429')) {
        throw err; // non-quota error — don't retry
      }
    }
  }

  throw lastError; // all models failed
};