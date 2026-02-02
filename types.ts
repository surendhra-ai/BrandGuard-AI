export enum DiscrepancySeverity {
  CRITICAL = 'CRITICAL', // e.g., Wrong Price, Wrong Location
  MAJOR = 'MAJOR',       // e.g., Missing Amenity, Wrong Date
  MINOR = 'MINOR'        // e.g., Typos, Tone mismatch
}

export interface Discrepancy {
  id: string;
  field: string;
  referenceValue: string;
  foundValue: string;
  severity: DiscrepancySeverity;
  description: string;
  suggestion: string;
}

export interface PageAnalysis {
  id: string;
  url: string;
  timestamp: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'ANALYZING' | 'ERROR';
  complianceScore: number;
  discrepancies: Discrepancy[];
  rawText?: string; // Stored for debugging/context
  screenshot?: string; // URL of the screenshot
}

export interface ProjectReference {
  name: string;
  url: string;
  content: string; // Extracted text content
  screenshot?: string; // URL of the screenshot
  lastUpdated: string;
}

// Scrape Result Type
export interface ScrapeResult {
  markdown: string;
  screenshot?: string;
}

// Gemini Response Schema Structure
export interface GeminiAnalysisResponse {
  complianceScore: number;
  discrepancies: {
    field: string;
    referenceValue: string;
    foundValue: string;
    severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
    description: string;
    suggestion: string;
  }[];
}

// Auth & DB Types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  action: 'LOGIN' | 'LOGOUT' | 'ANALYSIS_RUN' | 'SCRAPE_URL' | 'VIEW_HISTORY';
  details: string;
}

export interface AnalysisSession {
  id: string;
  userId: string;
  timestamp: string;
  projectName: string;
  referenceUrl: string;
  results: PageAnalysis[];
}