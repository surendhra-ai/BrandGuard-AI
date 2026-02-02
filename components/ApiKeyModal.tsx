
import React, { useState, useEffect } from 'react';
import { X, Key, Save } from 'lucide-react';
import { Button } from './Button';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  firecrawlKey: string;
  onSaveFirecrawlKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ 
  isOpen, 
  onClose, 
  firecrawlKey, 
  onSaveFirecrawlKey 
}) => {
  const [tempKey, setTempKey] = useState(firecrawlKey);

  useEffect(() => {
    setTempKey(firecrawlKey);
  }, [firecrawlKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveFirecrawlKey(tempKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
              <Key className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                API Configuration
              </h3>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Firecrawl API Key</label>
                <div className="mt-1">
                  <input
                    type="password"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 border rounded-md p-2"
                    placeholder="fc-..."
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Required for scraping URLs. 
                  <a href="https://www.firecrawl.dev/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline ml-1">
                    Get a key
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <Button onClick={handleSave} icon={<Save className="w-4 h-4" />}>
              Save Credentials
            </Button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm sm:mr-3"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
