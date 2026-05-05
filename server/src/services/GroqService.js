// src/services/GroqService.js
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const streamSummary = async (prompt, onChunk) => {
  const stream = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    stream: true,
  });

  let fullText = '';
  for await (const chunk of stream) {
    const chunkText = chunk.choices?.[0]?.delta?.content || '';
    if (chunkText) {
      fullText += chunkText;
      await onChunk(chunkText);
    }
  }

  return fullText;
};
