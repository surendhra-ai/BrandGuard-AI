
import React, { useState } from 'react';
import { X, Clipboard, Check, Code } from 'lucide-react';

interface ContentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export const ContentPreviewModal: React.FC<ContentPreviewModalProps> = ({ isOpen, onClose, title, content }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="sm:flex sm:items-start mb-4">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
              <Code className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full pr-8">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Source Content Viewer
              </h3>
              <p className="text-sm text-gray-500 mt-1 truncate max-w-2xl">{title}</p>
            </div>
          </div>

          <div className="relative mt-2">
             <div className="absolute top-2 right-4 z-10">
                <button
                    onClick={handleCopy}
                    className="flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                    {copied ? (
                        <>
                            <Check className="h-3 w-3 mr-1 text-green-500" /> Copied
                        </>
                    ) : (
                        <>
                            <Clipboard className="h-3 w-3 mr-1" /> Copy Text
                        </>
                    )}
                </button>
             </div>
             <div className="w-full h-[60vh] bg-slate-900 rounded-lg p-4 overflow-y-auto custom-scrollbar border border-slate-700">
                <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300 break-words">
                    {content || "No content available for this page."}
                </pre>
             </div>
          </div>

          <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
