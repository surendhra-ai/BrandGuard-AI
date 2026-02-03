
import React, { useState } from 'react';
import { X, AlertTriangle, ArrowRight, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { PageAnalysis, DiscrepancySeverity } from '../types';
import { StatusBadge } from './StatusBadge';

interface DiscrepancyModalProps {
  analysis: PageAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
  onFeedback?: (discrepancyId: string, isAccurate: boolean, details: string) => void;
}

export const DiscrepancyModal: React.FC<DiscrepancyModalProps> = ({ analysis, isOpen, onClose, onFeedback }) => {
  const [feedbackState, setFeedbackState] = useState<Record<string, 'ACCURATE' | 'INACCURATE'>>({});

  if (!isOpen || !analysis) return null;

  const handleFeedbackClick = (id: string, isAccurate: boolean, description: string) => {
    setFeedbackState(prev => ({
      ...prev,
      [id]: isAccurate ? 'ACCURATE' : 'INACCURATE'
    }));

    if (onFeedback) {
      onFeedback(id, isAccurate, description);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="relative inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
          
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white dark:bg-slate-800 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                Compliance Report
              </h3>
              <div className="mt-1">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Target URL: <span className="font-mono text-gray-700 dark:text-slate-200">{analysis.url}</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Compliance Score:</span>
                    <div className={`text-lg font-bold ${analysis.complianceScore > 80 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {analysis.complianceScore}%
                    </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 dark:border-slate-700 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">Identified Discrepancies</h4>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {analysis.discrepancies.length === 0 ? (
                 <p className="text-center text-gray-500 dark:text-slate-400 py-8">No discrepancies found. This page matches the reference perfectly.</p>
              ) : (
                  analysis.discrepancies.map((item, idx) => {
                    const status = feedbackState[item.id];
                    return (
                      <div key={item.id || idx} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                          <div className="flex justify-between items-start mb-2">
                              <h5 className="text-sm font-bold text-gray-900 dark:text-white uppercase">{item.field}</h5>
                              <StatusBadge status={item.severity} />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded border border-indigo-100 dark:border-indigo-900/50">
                                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 block mb-1">REFERENCE SAYS</span>
                                  <p className="text-sm text-indigo-900 dark:text-indigo-100">{item.referenceValue}</p>
                              </div>
                              <div className="bg-white dark:bg-slate-800 p-3 rounded border border-gray-200 dark:border-slate-600 relative">
                                  <div className="absolute -left-3 top-1/2 -mt-3 hidden md:block z-10">
                                      <ArrowRight className="w-6 h-6 text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-full border border-gray-200 dark:border-slate-600 p-1" />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 block mb-1">PAGE SAYS</span>
                                  <p className="text-sm text-gray-900 dark:text-white">{item.foundValue}</p>
                              </div>
                          </div>

                          <div className="mt-3 text-sm text-gray-600 dark:text-slate-300">
                              <p><span className="font-medium text-gray-900 dark:text-white">Issue:</span> {item.description}</p>
                              <p className="mt-1 text-gray-500 dark:text-slate-400 text-xs"><span className="font-medium">Suggestion:</span> {item.suggestion}</p>
                          </div>

                          {/* Feedback Controls */}
                          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-600 flex items-center justify-between">
                            <span className="text-xs text-gray-400 dark:text-slate-400">Is this detection accurate?</span>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleFeedbackClick(item.id, true, `Field: ${item.field}, Issue: ${item.description}`)}
                                disabled={!!status}
                                className={`flex items-center px-2 py-1 text-xs rounded border transition-colors ${
                                  status === 'ACCURATE' 
                                    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 font-medium' 
                                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                {status === 'ACCURATE' ? <Check className="w-3 h-3 mr-1" /> : <ThumbsUp className="w-3 h-3 mr-1" />}
                                {status === 'ACCURATE' ? 'Marked Correct' : 'Correct'}
                              </button>
                              
                              <button 
                                onClick={() => handleFeedbackClick(item.id, false, `Field: ${item.field}, Issue: ${item.description}`)}
                                disabled={!!status}
                                className={`flex items-center px-2 py-1 text-xs rounded border transition-colors ${
                                  status === 'INACCURATE' 
                                    ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 font-medium' 
                                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                {status === 'INACCURATE' ? <Check className="w-3 h-3 mr-1" /> : <ThumbsDown className="w-3 h-3 mr-1" />}
                                {status === 'INACCURATE' ? 'Marked False Positive' : 'False Positive'}
                              </button>
                            </div>
                          </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-red hover:bg-red-700 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
