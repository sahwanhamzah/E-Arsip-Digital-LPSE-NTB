
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI with API Key from environment variables as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Summarizes document details into a professional Indonesian sentence using Gemini AI.
 */
export const summarizeDocument = async (perihal: string, pihak: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Buatkan ringkasan profesional satu kalimat untuk surat dengan perihal: "${perihal}" dari/untuk: "${pihak}". Gunakan bahasa Indonesia yang formal.`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 100,
      }
    });
    // response.text is a property, not a method.
    return response.text || "Gagal menghasilkan ringkasan.";
  } catch (error) {
    console.error("AI Summarization Error:", error);
    return "Layanan AI sedang tidak tersedia.";
  }
};
