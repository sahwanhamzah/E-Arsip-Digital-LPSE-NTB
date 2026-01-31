
import { GoogleGenAI } from "@google/genai";

/**
 * Meringkas detail dokumen menjadi kalimat profesional menggunakan Gemini AI.
 * Inisialisasi dilakukan di dalam fungsi untuk memastikan aplikasi tidak crash
 * saat pemuatan modul jika API Key belum tersedia.
 */
export const summarizeDocument = async (perihal: string, pihak: string): Promise<string> => {
  try {
    // Validasi API Key secara ketat untuk mencegah error "API Key must be set"
    const apiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
      console.warn("API_KEY tidak ditemukan atau kosong. Melewati ringkasan AI.");
      return "Ringkasan otomatis tidak tersedia (Konfigurasi API belum lengkap).";
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Buatkan ringkasan profesional satu kalimat dalam Bahasa Indonesia untuk surat dengan perihal: "${perihal}" dari/untuk: "${pihak}". Fokus pada inti pesan surat tersebut.`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 150,
      }
    });

    return response.text || "Gagal menghasilkan ringkasan.";
  } catch (error) {
    console.error("Kesalahan Ringkasan AI:", error);
    return "Gagal memproses ringkasan otomatis.";
  }
};
