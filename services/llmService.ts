
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  referenceUrl: string,
  config: AppConfig,
  referenceScreenshot?: string,
  targetScreenshot?: string
): Promise<AnalysisResponse> => {
  
  if (!config.llmApiKey) {
    throw new Error("LLM API Key is missing. Please configure it in Settings.");
  }

  // --- 1. Prepare Prompt ---
  const systemInstruction = `
    You are a Real Estate Compliance Auditor AI for Tridasa. 
    Your task is to compare the "Reference Data" (Official Source) against the "Published Landing Page Data".
    
    Context:
    - Official Reference Source: ${referenceUrl}
    - Target Published Page: ${targetUrl}

    Identify ANY discrepancies in pricing, location, dates, amenities, specifications, contact details, OR visual branding/imagery.
    
    Classify discrepancies by severity:
    - CRITICAL: Wrong price, wrong location, wrong completion date, misleading legal terms, completely wrong building image.
    - MAJOR: Missing key amenities, wrong contact info, significantly wrong description, low quality or mismatched images.
    - MINOR: Typos, slight tonal differences, vague wording.

    Calculate a compliance score (0-100), where 100 is a perfect match.
    
    Return ONLY JSON.
  `;

  const userPrompt = `
    Reference Data (Text Source: ${referenceUrl}):
    """
    ${referenceContent}
    """

    Published Landing Page Data (Text Source: ${targetUrl}):
    """
    ${targetContent}
    """
    
    ${(referenceScreenshot || targetScreenshot) ? "IMAGES PROVIDED: I have attached screenshots. Compare visually for branding consistency and text overlays." : ""}
  `;

  try {
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

      try {
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

      } catch (geminiError: any) {
        // Detailed Gemini Error Handling
        const msg = geminiError.message || geminiError.toString();
        
        if (msg.includes('401') || msg.includes('API key') || msg.includes('permission denied')) {
          throw new Error("Invalid Gemini API Key. Please check your settings.");
        }
        if (msg.includes('429') || msg.includes('Quota') || msg.includes('Resource exhausted')) {
          throw new Error("Gemini API Rate Limit Exceeded. Please try again later or upgrade your plan.");
        }
        if (msg.includes('503') || msg.includes('Overloaded')) {
          throw new Error("Gemini Model is currently overloaded. Please retry.");
        }
        throw new Error(`Gemini API Error: ${msg}`);
      }
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
        const err = await res.json().catch(() => ({}));
        
        // Detailed OpenAI Error Handling
        if (res.status === 401) throw new Error("Invalid OpenAI API Key.");
        if (res.status === 429) throw new Error("OpenAI Rate Limit Exceeded or Quota reached.");
        if (res.status >= 500) throw new Error("OpenAI Server Error.");
        
        throw new Error(`OpenAI Error: ${err.error?.message || res.statusText}`);
      }

      const data = await res.json();
      const content = data.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenAI");

      return JSON.parse(content) as AnalysisResponse;
    }

    throw new Error("Invalid LLM Provider specified");

  } catch (error: any) {
    console.error("Analysis Error:", error);
    // Ensure the error message is user-friendly before re-throwing
    if (error.message.includes("JSON")) {
       throw new Error("Failed to parse AI response. The model might be hallucinating or the service is unstable.");
    }
    throw error;
  }
};
