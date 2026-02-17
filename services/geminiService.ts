import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DraftRecord } from "../types";

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeRecordImages = async (files: File[], apiKey: string): Promise<DraftRecord> => {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please set it in the settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const imageParts = await Promise.all(
    files.map(async (file) => ({
      inlineData: {
        data: await fileToGenerativePart(file),
        mimeType: file.type,
      },
    }))
  );

  const draftSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      artist: { type: Type.STRING, description: "Artist or Band Name" },
      title: { type: Type.STRING, description: "Album Title" },
      year: { type: Type.STRING, description: "Release Year (check dates on back or labels)" },
      label: { type: Type.STRING, description: "Record Label" },
      catalogNumber: { type: Type.STRING, description: "Catalog Number (Matrix/Runout if visible, or spine/back cover)" },
      country: { type: Type.STRING, description: "Country of manufacture" },
      format: { type: Type.STRING, description: "Format details (e.g., LP, Album, Reissue, 180g)" },
      estimatedPrice: { type: Type.STRING, description: "Estimated market value range" },
      discogsUrl: { type: Type.STRING, description: "Best matching Discogs URL" },
      description: { type: Type.STRING, description: "Specific notes on pressing, condition of cover visible, and identifying features." },
      isValid: { type: Type.BOOLEAN, description: "True if images are sufficient (Front AND Back usually required) to identify specific pressing." },
      validationWarning: { type: Type.STRING, description: "Warning message if images are insufficient (e.g. 'Missing back cover', 'Cannot read runout')." },
    },
    required: ["artist", "title", "isValid"],
  };

  const systemInstruction = `
    You are a strict, professional vinyl archivist. 
    Your task is to identify a SPECIFIC vinyl pressing based on a set of images.
    
    CRITICAL RULES:
    1.  You typically need both FRONT and BACK cover images, and ideally center labels, to confirm a specific pressing (year, country, version).
    2.  If the images provided are insufficient to distinguish the specific pressing (e.g., only front cover provided), set 'isValid' to false and explain why in 'validationWarning'.
    3.  Check for 'Matrix / Runout' etchings if visible in close-ups to identify the exact variant.
    4.  Use the 'googleSearch' tool to find the exact Discogs release page and current market price.
    5.  Be precise with years and catalog numbers.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          ...imageParts,
          { text: "Analyze these images as one single vinyl record release. Identify the exact pressing details." }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: draftSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from Gemini");

    return JSON.parse(jsonText) as DraftRecord;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
