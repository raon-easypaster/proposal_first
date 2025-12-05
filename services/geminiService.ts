import { GoogleGenAI } from "@google/genai";
import { FileData } from "../types";

export const generateProposalFromGemini = async (prompt: string, apiKey: string, file?: FileData): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key가 필요합니다.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const parts: any[] = [{ text: prompt }];

    if (file) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        // High thinking budget for detailed reasoning
        thinkingConfig: { thinkingBudget: 4096 },
        temperature: 0.7,
      }
    });

    return response.text || "생성된 내용이 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};