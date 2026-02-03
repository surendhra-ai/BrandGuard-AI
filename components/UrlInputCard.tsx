
import React, { useState, useMemo } from 'react';
import { Globe, FileText, Lock, Download, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';

interface UrlInputCardProps {
  title: string;
  url: string;
  content: string;
  hasScreenshot?: boolean;
  onUrlChange: (val: string) => void;
  onContentChange: (val: string) => void;
  onScrape?: () => void;
  isScraping?: boolean;
  isReference?: boolean;
  placeholder?: string;
  className?: string;
}

export const UrlInputCard: React.FC<UrlInputCardProps> = ({
  title,
  url,
  content,
  hasScreenshot = false,
  onUrlChange,
  onContentChange,
  onScrape,
  isScraping = false,
  isReference = false,
  placeholder,
  className = ''
}) => {
  // If content is empty but URL is present, default to URL mode, otherwise text mode
  const [mode, setMode] = useState<'url' | 'text'>(url && !content ? 'url' : 'text');

  const isValidUrl = useMemo(() => {
    if (!url) return true; // Treat empty as valid (initial state)
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, [url]);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col h-full ${className}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isReference ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/50' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'}`}>
        <div className="flex items-center space-x-2">
          {isReference ? <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <Globe className="w-4 h-4 text-gray-600 dark:text-slate-400" />}
          <h3 className={`text-sm font-semibold ${isReference ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-slate-100'}`}>{title}</h3>
        </div>
        <div className="flex bg-gray-200 dark:bg-slate-700 rounded-md p-0.5">
          <button 
            onClick={() => setMode('text')}
            className={`px-2 py-0.5 text-xs font-medium rounded transition-all ${mode === 'text' ? 'bg-white dark:bg-slate-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
          >
            Content
          </button>
           <button 
            onClick={() => setMode('url')}
            className={`px-2 py-0.5 text-xs font-medium rounded transition-all ${mode === 'url' ? 'bg-white dark:bg-slate-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
          >
            URL Import
          </button>
        </div>
      </div>

      <div className="p-4 flex-grow space-y-4 flex flex-col">
        {mode === 'url' ? (
          <div className="flex flex-col h-full justify-center space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Web Page URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://example.com/landing-page"
                className={`w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm border p-2 bg-white dark:bg-slate-900 dark:text-white ${
                    url && !isValidUrl 
                    ? 'border-red-300 dark:border-red-700 focus:border-red-500 text-red-900 dark:text-red-300 placeholder-red-300' 
                    : 'border-gray-300 dark:border-slate-600 focus:border-indigo-500'
                }`}
              />
              {url && !isValidUrl && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">Please enter a valid URL (including http:// or https://)</p>
              )}
            </div>
            
            {onScrape && (
              <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-md border border-gray-100 dark:border-slate-700 text-center">
                <Globe className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Import content directly from the live webpage using Firecrawl.</p>
                <Button 
                  onClick={onScrape} 
                  disabled={!url || isScraping || !isValidUrl}
                  isLoading={isScraping}
                  variant="secondary"
                  className="w-full sm:w-auto dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                  icon={<Download className="w-4 h-4" />}
                >
                  {isScraping ? 'Scraping...' : 'Fetch Content'}
                </Button>
                {hasScreenshot && (
                    <div className="mt-3 flex items-center justify-center text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 p-1 rounded border border-green-100 dark:border-green-900/50">
                        <ImageIcon className="w-3 h-3 mr-1" />
                        Screenshot Captured
                    </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full">
             <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400">Content to Analyze</label>
                <div className="flex items-center space-x-2">
                    {hasScreenshot && (
                        <span className="flex items-center text-xs text-green-600 dark:text-green-400" title="Screenshot available for visual analysis">
                            <ImageIcon className="w-3 h-3 mr-1" />
                            Visual Data Ready
                        </span>
                    )}
                    {content && onScrape && url && isValidUrl && (
                        <button 
                            onClick={onScrape}
                            disabled={isScraping}
                            className="text-xs flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                            title="Re-scrape content from URL"
                        >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isScraping ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    )}
                </div>
             </div>
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={placeholder || "Paste content manually or use URL Import..."}
              className="w-full flex-grow rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 min-h-[200px] font-mono text-xs text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-900 resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
