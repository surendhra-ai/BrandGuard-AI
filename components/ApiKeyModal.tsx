
import React, { useState, useEffect } from 'react';
import { X, Key, Save, Database, Bot, Globe, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { AppConfig, LLMProvider } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  config, 
  onSave 
}) => {
  const [activeTab, setActiveTab] = useState<'DB' | 'LLM' | 'SCRAPE'>('DB');
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localConfig);
    setShowSaved(true);
    setTimeout(() => {
        setShowSaved(false);
        onClose();
    }, 1000);
  };

  const handleChange = (key: keyof AppConfig, value: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            
            {/* Header */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-between items-center border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                    <Key className="h-5 w-5 text-indigo-500 mr-2" />
                    System Configuration
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="flex flex-col md:flex-row h-[450px]">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-1/4 bg-gray-50 border-r border-gray-200 pt-4">
                    <nav className="space-y-1 px-2">
                        <button
                            onClick={() => setActiveTab('DB')}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'DB' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Database className="flex-shrink-0 -ml-1 mr-3 h-4 w-4" /> Database
                        </button>
                        <button
                            onClick={() => setActiveTab('LLM')}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'LLM' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Bot className="flex-shrink-0 -ml-1 mr-3 h-4 w-4" /> AI Model
                        </button>
                        <button
                            onClick={() => setActiveTab('SCRAPE')}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'SCRAPE' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Globe className="flex-shrink-0 -ml-1 mr-3 h-4 w-4" /> Scraping
                        </button>
                    </nav>
                </div>

                {/* Content Area */}
                <div className="w-full md:w-3/4 p-6 overflow-y-auto">
                    
                    {activeTab === 'DB' && (
                        <div className="space-y-4">
                            <h4 className="text-md font-medium text-gray-900 border-b pb-2">Supabase Connection</h4>
                            <p className="text-xs text-gray-500">Connect to your database to store analysis history and logs.</p>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Project URL</label>
                                <input
                                    type="text"
                                    value={localConfig.supabaseUrl}
                                    onChange={(e) => handleChange('supabaseUrl', e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="https://xyz.supabase.co"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Anon Key</label>
                                <input
                                    type="password"
                                    value={localConfig.supabaseKey}
                                    onChange={(e) => handleChange('supabaseKey', e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="eyJh..."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'LLM' && (
                        <div className="space-y-4">
                            <h4 className="text-md font-medium text-gray-900 border-b pb-2">AI Provider Settings</h4>
                            <p className="text-xs text-gray-500">Choose your Intelligence Provider (LLM).</p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Provider</label>
                                <select
                                    value={localConfig.llmProvider}
                                    onChange={(e) => handleChange('llmProvider', e.target.value as LLMProvider)}
                                    className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="GEMINI">Google Gemini</option>
                                    <option value="OPENAI">OpenAI (ChatGPT)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">API Key</label>
                                <input
                                    type="password"
                                    value={localConfig.llmApiKey}
                                    onChange={(e) => handleChange('llmApiKey', e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder={localConfig.llmProvider === 'GEMINI' ? "AIza..." : "sk-..."}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Model Name</label>
                                <input
                                    type="text"
                                    value={localConfig.llmModel}
                                    onChange={(e) => handleChange('llmModel', e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder={localConfig.llmProvider === 'GEMINI' ? "gemini-1.5-pro" : "gpt-4o"}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Recommended: {localConfig.llmProvider === 'GEMINI' ? 'gemini-1.5-pro, gemini-1.5-flash' : 'gpt-4o, gpt-4-turbo'}
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'SCRAPE' && (
                        <div className="space-y-4">
                            <h4 className="text-md font-medium text-gray-900 border-b pb-2">Firecrawl Settings</h4>
                            <p className="text-xs text-gray-500">Required for converting websites to markdown.</p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">API Key</label>
                                <input
                                    type="password"
                                    value={localConfig.firecrawlKey}
                                    onChange={(e) => handleChange('firecrawlKey', e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="fc-..."
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    <a href="https://www.firecrawl.dev/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                                        Get a Firecrawl Key
                                    </a>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button onClick={handleSave} icon={showSaved ? <CheckCircle className="w-4 h-4"/> : <Save className="w-4 h-4" />} className={showSaved ? "bg-green-600 hover:bg-green-700" : ""}>
                    {showSaved ? "Saved!" : "Save Configuration"}
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
