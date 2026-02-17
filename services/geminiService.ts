import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AgentResponse } from "../types";

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
  private chat: any;

  constructor(apiKey: string, discogsToken?: string) {
    const ai = new GoogleGenAI({ apiKey });

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        logs: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Chronological list of actions/thoughts. Be verbose and specific. Each entry is one step: 'Analyzing front cover artwork...', 'Detected catalog number: SHVL 804 on spine', 'Searching Discogs for pressings with this catalog number...', 'Found 12 matching releases, narrowing by label design...'"
        },
        status: {
          type: Type.STRING,
          enum: ["complete", "clarification_needed", "error"],
          description: "Current state. Use 'clarification_needed' liberally - it's better to ask than guess wrong."
        },
        question: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "Clear, specific question for the user." },
            type: {
              type: Type.STRING,
              enum: ["text", "choice", "image_request"],
              description: "Use 'choice' when you can enumerate options (pressing variants, years, etc). Use 'image_request' when you need a photo of something specific (matrix, label, barcode). Use 'text' for open-ended questions."
            },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "Short display label" },
                  value: { type: Type.STRING, description: "Detailed value with context" }
                }
              },
              description: "2-6 options for choice questions. Include a 'None of these / Not sure' option."
            },
            allowImageUpload: { type: Type.BOOLEAN, description: "Set true if user can optionally provide an image alongside text answer." }
          }
        },
        record: {
          type: Type.OBJECT,
          description: "The identified record. Required when status='complete'.",
          properties: {
            artist: { type: Type.STRING },
            title: { type: Type.STRING },
            year: { type: Type.STRING },
            label: { type: Type.STRING },
            catalogNumber: { type: Type.STRING },
            country: { type: Type.STRING },
            format: { type: Type.STRING, description: "e.g. 'LP, Album', 'LP, Album, Reissue, Gatefold'" },
            estimatedPrice: { type: Type.STRING, description: "Price range in USD from Discogs marketplace data" },
            discogsUrl: { type: Type.STRING, description: "Full URL to the specific Discogs release page" },
            discogsReleaseId: { type: Type.NUMBER, description: "The numeric Discogs release ID" },
            description: { type: Type.STRING, description: "Brief notes about the pressing, notable features, condition notes" },
            isValid: { type: Type.BOOLEAN, description: "true if high confidence identification" },
            validationWarning: { type: Type.STRING, description: "Warning message if identification has caveats" },
          },
          required: ["artist", "title", "isValid"]
        },
        error: { type: Type.STRING }
      },
      required: ["logs", "status"]
    };

    const systemInstruction = `You are an expert Vinyl Record Identification Agent. You identify the EXACT pressing of vinyl records from photos.

WORKFLOW:
1. ANALYZE images thoroughly - read ALL text on covers, labels, spines, and any visible matrix/runout etchings.
2. LOG every observation with specific details: catalog numbers, matrix numbers, label text, barcode numbers, pressing plant codes.
3. SEARCH using Google Search to find the exact Discogs release page. Search for: "[artist] [title] [catalog number] discogs" or "[matrix number] discogs".
4. COMPARE your observations against search results. Check label design, catalog number format, country of origin, and pressing details.
5. DECIDE:
   - If 90%+ confident -> status: "complete" with full record data
   - If multiple possible variants -> status: "clarification_needed" with a choice question listing the variants
   - If missing critical info -> status: "clarification_needed" asking for specific photo or detail

WHEN ASKING QUESTIONS:
- For pressing variants: Use "choice" type with each variant as an option (include year, country, label variation details)
- For missing photos: Use "image_request" type (ask for matrix/runout, center label close-up, barcode, etc.)
- For specific details: Use "text" type with allowImageUpload=true
- ALWAYS include a "Not sure / None of these" option in choice questions

IMPORTANT RULES:
- Be thorough in logs - the user wants to follow your research process
- Include 5-10 log entries per step showing your reasoning
- When you find the Discogs URL, always include the release ID number
- Extract price data from Discogs marketplace when available
- Note any quality/condition observations from the photos
- If the record is rare or valuable, mention it in the description
${discogsToken ? '\nThe user has a Discogs account connected. When identification is complete, they can add it directly to their collection.' : ''}`;

    this.chat = ai.chats.create({
      model: "gemini-2.5-flash",
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
            { text: "Identify this vinyl record. Analyze all provided images carefully. Check for specific pressing variations - look at label design, catalog numbers, matrix/runout etchings, barcode, country of origin, and any other distinguishing features. Search Discogs to find the exact release. Be thorough and show your work in the logs." }
          ]
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from agent");
      return JSON.parse(text) as AgentResponse;

    } catch (e: any) {
      console.error("Agent start error:", e);
      return {
        logs: ["Failed to initialize analysis: " + e.message],
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
        parts.push({ text: textAnswer || "Here is the additional image you requested." });
      } else if (textAnswer) {
        parts.push({ text: textAnswer });
      } else {
        parts.push({ text: "Continue with your analysis." });
      }

      const response = await this.chat.sendMessage({
        content: { parts }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from agent");
      return JSON.parse(text) as AgentResponse;

    } catch (e: any) {
      return {
        logs: ["Error processing reply: " + e.message],
        status: "error",
        error: e.message
      };
    }
  }
}
