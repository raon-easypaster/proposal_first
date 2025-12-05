import { GoogleGenAI } from "@google/genai";
import { FileData } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateProposalFromGemini = async (prompt: string, file?: FileData): Promise<string> => {
  try {
    const ai = getClient();
    
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
        // Enable thinking for more detailed reasoning and structural planning
        thinkingConfig: { thinkingBudget: 4096 },
        temperature: 0.7,
      }
    });

    return response.text || "생성된 내용이 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("제안서 생성 중 오류가 발생했습니다.");
  }
};