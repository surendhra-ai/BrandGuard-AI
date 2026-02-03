
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, AppConfig } from "../types";

// Helper to fetch image URL and convert to base64
const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Keep header for OpenAI (data:image/...) but strip for Gemini if needed later
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Failed to fetch image for LLM:", url);
    return null;
  }
};

export const analyzeDiscrepancies = async (
  referenceContent: string,
  targetContent: string,
  targetUrl: string,
  config: AppConfig,
  referenceScreenshot?: string,
  targetScreenshot?: string
): Promise<AnalysisResponse> => {
  
  if (!config.llmApiKey) {
    throw new Error("LLM API Key is missing. Please configure it in Settings.");
  }

  // --- 1. Prepare Prompt ---
  const systemInstruction = `
    You are a Real Estate Compliance Auditor AI. 
    Your task is to compare the "Reference Data" (Official Source) against the "Published Landing Page Data".
    Identify ANY discrepancies in pricing, location, dates, amenities, specifications, contact details, OR visual branding/imagery.
    
    Classify discrepancies by severity:
    - CRITICAL: Wrong price, wrong location, wrong completion date, misleading legal terms, completely wrong building image.
    - MAJOR: Missing key amenities, wrong contact info, significantly wrong description, low quality or mismatched images.
    - MINOR: Typos, slight tonal differences, vague wording.

    Calculate a compliance score (0-100), where 100 is a perfect match.
    
    Return ONLY JSON.
  `;

  const userPrompt = `
    Reference Data (Text):
    """
    ${referenceContent}
    """

    Published Landing Page Data (Text from ${targetUrl}):
    """
    ${targetContent}
    """
    
    ${(referenceScreenshot || targetScreenshot) ? "IMAGES PROVIDED: I have attached screenshots. Compare visually for branding consistency and text overlays." : ""}
  `;

  // --- 2. Gemini Implementation ---
  if (config.llmProvider === 'GEMINI') {
    const ai = new GoogleGenAI({ apiKey: config.llmApiKey });
    
    const parts: any[] = [{ text: userPrompt }];

    // Handle Images for Gemini (Needs raw base64 without data URI header)
    if (referenceScreenshot) {
      const b64 = await fetchImageAsBase64(referenceScreenshot);
      if (b64) parts.push({ inlineData: { mimeType: "image/png", data: b64.split(',')[1] } });
    }
    if (targetScreenshot) {
      const b64 = await fetchImageAsBase64(targetScreenshot);
      if (b64) parts.push({ inlineData: { mimeType: "image/png", data: b64.split(',')[1] } });
    }

    const response = await ai.models.generateContent({
      model: config.llmModel || "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
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
    if (!text) throw new Error("Empty response from Gemini");
    return JSON.parse(text) as AnalysisResponse;
  }

  // --- 3. OpenAI Implementation ---
  if (config.llmProvider === 'OPENAI') {
    const messages: any[] = [
      { role: "system", content: systemInstruction }
    ];

    const contentParts: any[] = [{ type: "text", text: userPrompt }];

    // Handle Images for OpenAI (Expects full data URI or URL)
    if (referenceScreenshot) {
      const b64 = await fetchImageAsBase64(referenceScreenshot);
      if (b64) contentParts.push({ type: "image_url", image_url: { url: b64 } });
    }
    if (targetScreenshot) {
      const b64 = await fetchImageAsBase64(targetScreenshot);
      if (b64) contentParts.push({ type: "image_url", image_url: { url: b64 } });
    }

    messages.push({ role: "user", content: contentParts });

    const payload = {
      model: config.llmModel || "gpt-4o",
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.2
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.llmApiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`OpenAI Error: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from OpenAI");

    // OpenAI returns unstructured JSON, we need to hope it matches the structure or validate it.
    // The prompt explicitly asks for specific fields.
    return JSON.parse(content) as AnalysisResponse;
  }

  throw new Error("Invalid LLM Provider specified");
};
