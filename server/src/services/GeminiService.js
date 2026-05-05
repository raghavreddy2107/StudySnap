// src/services/GeminiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export const streamSummary = async (prompt, onChunk) => {
  // Non-streaming — avoids broken stream parser
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
    },
  });

  const fullText = result.response.text();

  // Simulate word-by-word streaming so frontend still feels live
  const words = fullText.split(' ');
  for (const word of words) {
    await onChunk(word + ' ');
    await new Promise(resolve => setTimeout(resolve, 25));
  }

  return fullText;
};