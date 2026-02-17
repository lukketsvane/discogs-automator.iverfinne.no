import { GoogleGenAI, Type, Schema } from "@google/genai";
import { VinylRecord } from "../types";

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g., "data:image/jpeg;base64,")
      const base64Content = base64String.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const identifyVinyls = async (files: File[]): Promise<VinylRecord[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing from environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepare images
  const imageParts = await Promise.all(
    files.map(async (file) => ({
      inlineData: {
        data: await fileToGenerativePart(file),
        mimeType: file.type,
      },
    }))
  );

  // Define the schema for structured JSON output
  const vinylSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        artist: { type: Type.STRING, description: "Name of the artist or band." },
        title: { type: Type.STRING, description: "Title of the album or EP." },
        year: { type: Type.STRING, description: "Release year if visible or deducible." },
        label: { type: Type.STRING, description: "Record label name." },
        catalogNumber: { type: Type.STRING, description: "Catalog number (e.g., SHVL 804)." },
        estimatedPrice: { type: Type.STRING, description: "Estimated market value range based on condition and rarity found via search." },
        discogsUrl: { type: Type.STRING, description: "A likely URL to the release on Discogs.com found via search." },
        description: { type: Type.STRING, description: "Brief details about the pressing, edition, or visual condition notes." },
        genre: { type: Type.STRING, description: "Primary genre." },
        index: { type: Type.INTEGER, description: "The index of the image this result corresponds to (0-based)." },
      },
      required: ["artist", "title", "description", "index"],
    },
  };

  const systemInstruction = `
    You are an expert vinyl record appraiser and archivist. 
    You will be provided with images of vinyl records (covers or center labels).
    For EACH image provided:
    1. Identify the Artist and Album Title.
    2. Identify the specific pressing if possible (Catalog Number, Label).
    3. Use the googleSearch tool to find the current estimated market value (price) and the specific Discogs URL for this release.
    4. Provide a brief description of the album and specific pressing details identified.
    5. Return the result as a strictly structured JSON array, where the 'index' property corresponds to the order of the images uploaded (0 for the first image, 1 for the second, etc.).
    
    If an image is not a vinyl record, mark the artist as "Unknown" and description as "Not a vinyl record".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Using Pro for better reasoning and search capabilities
      contents: {
        parts: [
          ...imageParts,
          { text: "Identify these vinyl records. Use Google Search to find real-time pricing and Discogs links." }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: vinylSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from Gemini");

    const parsedData = JSON.parse(jsonText);
    
    // Map the results back to the original files to attach the preview images locally
    // Note: The model is asked to return an 'index' to map back to the input array
    const mappedResults: VinylRecord[] = parsedData.map((item: any) => ({
      id: crypto.randomUUID(),
      originalImage: "", // We will attach this in the UI component using the file list
      artist: item.artist,
      title: item.title,
      year: item.year,
      label: item.label,
      catalogNumber: item.catalogNumber,
      estimatedPrice: item.estimatedPrice,
      discogsUrl: item.discogsUrl,
      description: item.description,
      genre: item.genre,
      confidenceScore: 90, // Placeholder, usually inferred
      _originalIndex: item.index // Helper to map back to UI state
    }));

    return mappedResults;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
