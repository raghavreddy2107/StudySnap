// src/services/pdfService.js
import fs from 'fs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const MAX_TEXT_LENGTH = 50000;

export const extractTextFromPDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  let text = data.text || '';

  const truncated = text.length > MAX_TEXT_LENGTH;
  if (truncated) {
    text = text.slice(0, MAX_TEXT_LENGTH);
  }

  return { text, truncated, pageCount: data.numpages };
};
