
import { ScrapeResult } from '../types';

interface ScrapeOptions {
  waitFor?: number;
  timeout?: number;
}

const MAX_RETRIES = 2; // Reduced retries to avoid long waits if config is bad
const INITIAL_BACKOFF = 1000; // 1 second

export const scrapeUrl = async (
  url: string, 
  apiKey: string, 
  options: ScrapeOptions = {}
): Promise<ScrapeResult> => {
  if (!apiKey) throw new Error("Firecrawl API Key is required");

  // Validate URL basic format
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  const timeoutDuration = options.timeout || 60000; // Default 60s
  let attempt = 0;
  
  while (attempt <= MAX_RETRIES) {
    try {
      // Create a local abort controller for this request attempt
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration); 

      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'screenshot'],
          // Wait 2 seconds by default for JavaScript hydration/dynamic content
          waitFor: options.waitFor || 2000, 
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // --- Granular Error Handling ---
      if (!response.ok) {
        let errorMsg = `Scraping failed with status: ${response.status}`;
        
        // Try to parse detailed error from Firecrawl
        try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch {
          // If JSON parse fails, stick to status code
        }

        switch (response.status) {
          case 400:
            throw new Error(`Bad Request: ${errorMsg}`);
          case 401:
            throw new Error("Unauthorized: Invalid Firecrawl API Key.");
          case 402:
            throw new Error("Payment Required: Firecrawl credit limit reached.");
          case 403:
             // Firecrawl specific: 403 often means the target site blocked the crawler
            throw new Error("Access Denied: The target website blocked the crawler.");
          case 404:
            throw new Error("Page Not Found: The URL does not exist (404).");
          case 408:
            throw new Error("Request Timeout: Firecrawl took too long to respond.");
          case 429:
            // Let the retry logic handle this, but throw specific error so we know
            throw new Error("Rate Limit Exceeded"); 
          case 500:
          case 502:
          case 503:
          case 504:
             throw new Error(`Firecrawl Server Error (${response.status}). Please try again later.`);
          default:
             throw new Error(errorMsg);
        }
      }

      const json = await response.json();
      
      // Validate response structure
      if (!json.success || !json.data) {
         throw new Error("Failed to retrieve valid data from Firecrawl");
      }

      return {
        markdown: json.data.markdown || "No markdown content returned.",
        screenshot: json.data.screenshot
      };

    } catch (error: any) {
      // Determine if error is retry-able
      const isRateLimit = error.message && error.message.includes("Rate Limit");
      const isServerErr = error.message && (error.message.includes("Server Error") || error.message.includes("50"));
      const isNetwork = error.name === 'TypeError' || error.name === 'AbortError'; 

      // Do NOT retry on 400, 401, 402, 403, 404
      const isFatal = 
        error.message.includes("Bad Request") || 
        error.message.includes("Unauthorized") || 
        error.message.includes("Payment Required") ||
        error.message.includes("Access Denied") ||
        error.message.includes("Page Not Found");

      if (!isFatal && (isRateLimit || isServerErr || isNetwork) && attempt < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF * Math.pow(2, attempt);
        console.warn(`Scrape attempt ${attempt + 1} failed for ${url}. Retrying in ${backoff}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, backoff));
        attempt++;
        continue;
      }
      
      console.error("Firecrawl Scrape Fatal Error:", error);
      throw error;
    }
  }
  
  throw new Error("Max retries exceeded or fatal error occurred");
};
