import { GoogleGenAI, Type, Schema, ChatSession } from "@google/genai";
import { AgentResponse } from "../types";

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string, mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export class DiscogsAgent {
  private chat: ChatSession;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    const ai = new GoogleGenAI({ apiKey });
    
    // Define the schema for the agent's interaction
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        logs: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "A chronological list of actions and thoughts performed during this step. Be verbose. E.g., 'Scanning cover art...', 'Detected text: SHVL 804', 'Searching Discogs for matching matrix numbers...'"
        },
        status: {
          type: Type.STRING,
          enum: ["complete", "clarification_needed", "error"],
          description: "The current state of the identification process."
        },
        question: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The question to ask the user." },
            type: { type: Type.STRING, enum: ["text", "choice", "image_request"] },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING }
                }
              },
              description: "Options for multiple choice questions."
            },
            allowImageUpload: { type: Type.BOOLEAN, description: "True if the user should provide a photo (e.g., of the matrix runout)." }
          }
        },
        record: {
          type: Type.OBJECT,
          description: "The final identified record. Required only if status is 'complete'.",
          properties: {
            artist: { type: Type.STRING },
            title: { type: Type.STRING },
            year: { type: Type.STRING },
            label: { type: Type.STRING },
            catalogNumber: { type: Type.STRING },
            country: { type: Type.STRING },
            format: { type: Type.STRING },
            estimatedPrice: { type: Type.STRING },
            discogsUrl: { type: Type.STRING },
            description: { type: Type.STRING },
            isValid: { type: Type.BOOLEAN },
            validationWarning: { type: Type.STRING },
          },
          required: ["artist", "title", "isValid"]
        },
        error: { type: Type.STRING, description: "Error message if status is 'error'." }
      },
      required: ["logs", "status"]
    };

    const systemInstruction = `
      You are an expert Vinyl Archivist Agent. Your goal is to identify the *exact* pressing of a vinyl record.
      
      PROCESS:
      1. Analyze the provided images (covers, labels, spine, matrix).
      2. Log your observations in the 'logs' array (e.g., "Found catalog number...", "Label design matches 1970s reissues...").
      3. Use Google Search to find Discogs matches.
      4. If you have high confidence (90%+), set status to "complete" and fill the 'record' object.
      5. If you are unsure (e.g., same catalog number exists for 5 different years), set status to "clarification_needed" and ask a specific Question.
         - Ask about: Matrix numbers (runout etchings), specific text on the label, or barcode.
         - You can provide multiple choice options if you suspect a few specific variants.
         - You can ask for an image (set type: 'image_request') if the user missed the back cover or center label.
      
      BEHAVIOR:
      - Be conversational but professional in your 'logs'.
      - If the user provides a matrix number, PRIORITIZE that for identification.
      - Always extract the estimated price range from search results if possible.
    `;

    this.chat = ai.chats.create({
      model: "gemini-3-pro-preview",
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });
  }

  async startAnalysis(files: File[]): Promise<AgentResponse> {
    try {
      const imageParts = await Promise.all(files.map(fileToGenerativePart));
      
      const response = await this.chat.sendMessage({
        content: {
          parts: [
            ...imageParts,
            { text: "Identify this record. Please be thorough and check for specific pressing variations." }
          ]
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Agent");
      return JSON.parse(text) as AgentResponse;

    } catch (e: any) {
      console.error(e);
      return {
        logs: ["System Error: " + e.message],
        status: "error",
        error: e.message
      };
    }
  }

  async replyToAgent(textAnswer?: string, imageFile?: File): Promise<AgentResponse> {
    try {
      const parts: any[] = [];
      
      if (imageFile) {
        const imgPart = await fileToGenerativePart(imageFile);
        parts.push(imgPart);
        parts.push({ text: "Here is the additional image you requested." });
      }
      
      if (textAnswer) {
        parts.push({ text: textAnswer });
      }

      if (parts.length === 0) {
        parts.push({ text: "Proceed." }); // Fallback
      }

      const response = await this.chat.sendMessage({
        content: { parts }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Agent");
      return JSON.parse(text) as AgentResponse;

    } catch (e: any) {
      return {
        logs: ["System Error during reply: " + e.message],
        status: "error",
        error: e.message
      };
    }
  }
}
