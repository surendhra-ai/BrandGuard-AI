import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysisResponse } from "../types";

const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API Key not found in environment variables");
    return "";
  }
  return key;
};

// Helper to fetch image URL and convert to base64 inline data for Gemini
const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data:image/png;base64, header
        resolve(base64.split(',')[1]);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Failed to fetch image for Gemini:", url);
    return null;
  }
};

export const analyzeDiscrepancies = async (
  referenceContent: string,
  targetContent: string,
  targetUrl: string,
  referenceScreenshot?: string,
  targetScreenshot?: string
): Promise<GeminiAnalysisResponse> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Construct parts
  const parts: any[] = [];

  // 1. Text Prompt
  let promptText = `
    You are a Real Estate Compliance Auditor AI. 
    Your task is to compare the "Reference Data" (Official Source) against the "Published Landing Page Data".
    Identify ANY discrepancies in pricing, location, dates, amenities, specifications, contact details, OR visual branding/imagery.
    
    Classify discrepancies by severity:
    - CRITICAL: Wrong price, wrong location, wrong completion date, misleading legal terms, completely wrong building image.
    - MAJOR: Missing key amenities, wrong contact info, significantly wrong description, low quality or mismatched images.
    - MINOR: Typos, slight tonal differences, vague wording.

    Calculate a compliance score (0-100), where 100 is a perfect match.

    Reference Data (Text):
    """
    ${referenceContent}
    """

    Published Landing Page Data (Text from ${targetUrl}):
    """
    ${targetContent}
    """
  `;

  if (referenceScreenshot || targetScreenshot) {
    promptText += `\n\nIMAGES PROVIDED: I have attached screenshots of the pages. Please compare visually as well. Check if the target page looks consistent with a premium real estate offering and if any text overlays contradict the reference data.`;
  }

  parts.push({ text: promptText });

  // 2. Add Images if available
  // Note: We attempt to fetch the screenshot URLs. If they fail (e.g. CORS), we proceed without images.
  if (referenceScreenshot) {
    const refBase64 = await fetchImageAsBase64(referenceScreenshot);
    if (refBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/png", // Firecrawl usually returns PNG screenshots
          data: refBase64
        }
      });
      parts.push({ text: "Above is the REFERENCE PAGE SCREENSHOT." });
    }
  }

  if (targetScreenshot) {
    const targetBase64 = await fetchImageAsBase64(targetScreenshot);
    if (targetBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: targetBase64
        }
      });
      parts.push({ text: "Above is the TARGET LANDING PAGE SCREENSHOT." });
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Updated to gemini-3-flash-preview which supports JSON mode and multimodal input
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            complianceScore: { type: Type.NUMBER },
            discrepancies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  field: { type: Type.STRING },
                  referenceValue: { type: Type.STRING },
                  foundValue: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ["CRITICAL", "MAJOR", "MINOR"] },
                  description: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                },
                required: ["field", "referenceValue", "foundValue", "severity", "description", "suggestion"]
              },
            },
          },
          required: ["complianceScore", "discrepancies"],
        },
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("Empty response from Gemini");
    }
    
    return JSON.parse(text) as GeminiAnalysisResponse;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};