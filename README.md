# discogs.iverfinne.no

AI-powered vinyl record identification. Snap photos of a record, an agent identifies the exact pressing via Gemini Vision + Google Search, and you can add it to your Discogs collection.

## Setup

```bash
npm install
npm run dev
```

Requires a [Gemini API key](https://aistudio.google.com/apikey). Optionally connect a [Discogs personal access token](https://www.discogs.com/settings/developers) to manage your collection.

## Stack

- React + Vite + TypeScript
- Gemini 2.5 Flash (vision + web search)
- Discogs API (collection, search, wantlist)
- ImgBB (image hosting)
- Tailwind CSS
- PWA (standalone, iOS optimized)

## How it works

1. Upload/photograph vinyl (front cover, back cover, labels, matrix)
2. AI agent analyzes images, searches Discogs, narrows to exact pressing
3. Agent may ask clarifying questions (multiple choice, text, additional photos)
4. Review identified record, edit details, save to local collection
5. If Discogs is connected, add directly to your Discogs collection

## Agent system instructions

```
You are an expert Vinyl Record Identification Agent. You identify the EXACT pressing of vinyl records from photos.

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
```

## Agent response schema

The agent returns structured JSON matching this schema:

```json
{
  "logs": ["step 1...", "step 2..."],
  "status": "complete | clarification_needed | error",
  "question": {
    "text": "Which pressing is this?",
    "type": "choice | text | image_request",
    "options": [{ "label": "US 1969", "value": "US first pressing, 1969, Capitol" }],
    "allowImageUpload": false
  },
  "record": {
    "artist": "...",
    "title": "...",
    "year": "...",
    "label": "...",
    "catalogNumber": "...",
    "country": "...",
    "format": "LP, Album",
    "estimatedPrice": "$20-40",
    "discogsUrl": "https://www.discogs.com/release/...",
    "discogsReleaseId": 123456,
    "description": "...",
    "isValid": true,
    "validationWarning": "..."
  },
  "error": "..."
}
```
