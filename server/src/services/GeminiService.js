// src/services/GeminiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export const streamSummary = async (prompt, onChunk) => {
  // Prioritize completeness over fancy live streaming:
  // 1. Call Gemini once with a generous token limit.
  // 2. Take the full text and "stream" it out in chunks via onChunk.

  let maxOutputTokens = 8192;
  if (
    prompt.includes('Keep total output under 300 words') ||
    prompt.includes('ONLY the most critical key terms')
  ) {
    maxOutputTokens = 1200; // plenty for a short summary
  }

  const request = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens,
    },
  };

  const result = await model.generateContent(request);
  const finalText = result.response.text();

  // Stream the already-complete text to the caller so the UI still updates
  // progressively, but without risking partial SDK streams.
  const parts = finalText.match(/\S+\s*/g) || [finalText];
  for (const part of parts) {
    await onChunk(part);
  }

  return finalText;
};
