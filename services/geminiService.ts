import { GoogleGenAI } from "@google/genai";
import { AgentResponse } from "../types";

// Default API key from env vars (set at hosting/build time)
const DEFAULT_GEMINI_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

export function getDefaultGeminiKey(): string {
  return DEFAULT_GEMINI_KEY;
}

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

const extractJSON = (text: string): any => {
  // Handle models that wrap JSON in markdown code fences despite instructions
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const toParse = fenced ? fenced[1].trim() : text.trim();
  try {
    return JSON.parse(toParse);
  } catch {
    throw new Error("Failed to parse JSON from model response");
  }
};

export class DiscogsAgent {
  private chat: any;

  constructor(apiKey: string, discogsToken?: string) {
    const effectiveKey = apiKey || DEFAULT_GEMINI_KEY;
    if (!effectiveKey) throw new Error("No Gemini API key available");

    const ai = new GoogleGenAI({ apiKey: effectiveKey });

    const systemInstruction = `You are an expert Vinyl Record Identification & Valuation Agent. You identify the EXACT pressing of vinyl records from photos and provide accurate market pricing.

YOU MUST ALWAYS RESPOND WITH VALID JSON (no markdown, no code fences, no extra text). Use this exact schema:
{
  "logs": ["string array of chronological actions/thoughts - be verbose, 5-10 entries per step"],
  "status": "complete" | "clarification_needed" | "error",
  "question": {                          // include when status="clarification_needed"
    "text": "clear specific question",
    "type": "text" | "choice" | "image_request",
    "options": [{"label": "short label", "value": "detailed value"}],  // for choice type, 2-6 options
    "allowImageUpload": true/false
  },
  "record": {                            // include when status="complete"
    "artist": "string",
    "title": "string",
    "year": "string",
    "label": "string",
    "catalogNumber": "string",
    "country": "string",
    "format": "e.g. LP, Album",
    "estimatedPrice": "price range in USD based on Discogs marketplace data – include median, low, and high",
    "discogsUrl": "full URL to Discogs release",
    "discogsReleaseId": 123456,
    "description": "detailed notes: pressing info, rarity, condition observations, and pricing rationale",
    "isValid": true/false,
    "validationWarning": "optional warning"
  },
  "error": "string"                      // include when status="error"
}

WORKFLOW:
1. ANALYZE images thoroughly - read ALL text on covers, labels, spines, and any visible matrix/runout etchings.
2. LOG every observation with specific details: catalog numbers, matrix numbers, label text, barcode numbers, pressing plant codes.
3. SEARCH using Google Search to find the exact Discogs release page. Search for: "[artist] [title] [catalog number] discogs" or "[matrix number] discogs".
4. COMPARE your observations against search results. Check label design, catalog number format, country of origin, and pressing details.
5. PRICE RESEARCH: Search for current marketplace prices on Discogs. Look up "[artist] [title] discogs marketplace" and note the median, lowest, and highest prices. Factor in condition, pressing rarity, and demand. Provide a clear price range with reasoning.
6. CONDITION ASSESSMENT: Examine the photos for visible wear, ring wear, seam splits, writing, stickers, or other condition issues. Note the estimated vinyl grade (M/NM/VG+/VG/G+/G) and sleeve grade separately.
7. DECIDE:
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
- ALWAYS search for and include current Discogs marketplace pricing data (last sold, median, lowest, highest)
- Include the estimated condition grade in the description (e.g. "Vinyl: VG+, Sleeve: VG")
- Note any quality/condition observations from the photos
- If the record is rare or valuable, mention it prominently in the description with pricing context
- In the estimatedPrice field, format as "$X – $Y (Median: $Z)" based on real marketplace data
- Explain your pricing rationale in the description field
${discogsToken ? '\nThe user has a Discogs account connected. When identification is complete, they can add it directly to their collection or list it for sale on the Discogs marketplace.' : ''}`;

    this.chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 8192 },
      },
    });
  }

  async startAnalysis(files: File[]): Promise<AgentResponse> {
    try {
      const imageParts = await Promise.all(files.map(fileToGenerativePart));

      const message = [
        ...imageParts,
        { text: "Identify this vinyl record. Analyze all provided images carefully. Check for specific pressing variations - look at label design, catalog numbers, matrix/runout etchings, barcode, country of origin, and any other distinguishing features. Search Discogs to find the exact release. Research current marketplace prices and provide a detailed price estimate with range. Assess the condition of the vinyl and sleeve from the photos. Be thorough and show your work in the logs." }
      ];

      const response = await this.chat.sendMessage({
        message,
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from agent");
      return extractJSON(text) as AgentResponse;

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
        message: parts,
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from agent");
      return extractJSON(text) as AgentResponse;

    } catch (e: any) {
      return {
        logs: ["Error processing reply: " + e.message],
        status: "error",
        error: e.message
      };
    }
  }
}
