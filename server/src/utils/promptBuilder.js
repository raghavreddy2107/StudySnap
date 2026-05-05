// src/utils/promptBuilder.js

const systemPrompts = {
  '1hour': `You are a study assistant. The student has ONLY 1 HOUR before their exam. Extract ONLY the most critical key terms, definitions, and formulas. Format as a tight bullet list. Be ruthless — only what is absolutely essential to pass.`,
  'tomorrow': `You are a study assistant. The student has ONE DAY before their exam. Create a concise structured summary with clear headings per major topic. Include key concepts, definitions, and likely exam points.`,
  '3to5days': `You are a study assistant. The student has a few days. Create a well-structured study guide with headings, subheadings, bullets, and brief explanations. Bold important terms.`,
  '1weekplus': `You are a study assistant. The student has plenty of time. Create comprehensive detailed notes with explanations, examples, concept connections, and 5 potential exam questions at the end.`,
};

const MAX_STUDY_MATERIAL_CHARS = 12000;

export const buildPrompt = ({ examTime, summaryType, focusTopic, extractedText }) => {
  let prompt = systemPrompts[examTime] || systemPrompts['tomorrow'];

  if (summaryType === 'short') {
    prompt += '\n\nKeep total output under 300 words.';
  } else if (summaryType === 'long') {
    prompt += '\n\nBe thorough and detailed.';
  }

  if (focusTopic && focusTopic.trim()) {
    prompt += `\n\nPay special attention to topics related to: ${focusTopic}.`;
  }

  const safeText = (extractedText || '').slice(0, MAX_STUDY_MATERIAL_CHARS);
  prompt += '\n\nStudy material:\n\n' + safeText;

  return prompt;
};
