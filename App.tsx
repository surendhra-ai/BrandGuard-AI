
import React, { useState, useEffect } from 'react';
import { Shield, Play, RotateCcw, Plus, Trash2, PieChart, Activity, AlertTriangle, Settings, Key, LogOut, History, FileText, Filter, ArrowUpDown, CheckCircle, AlertOctagon, ExternalLink, ChevronRight, LayoutDashboard, BarChart3, AlertCircle, Code, Download, Moon, Sun } from 'lucide-react';
import { UrlInputCard } from './components/UrlInputCard';
import { Button } from './components/Button';
import { StatusBadge } from './components/StatusBadge';
import { DiscrepancyModal } from './components/DiscrepancyModal';
import { ContentPreviewModal } from './components/ContentPreviewModal';
import { SettingsModal } from './components/ApiKeyModal'; 
import { AuthForm } from './components/AuthForm';
import { analyzeDiscrepancies } from './services/llmService'; 
import { scrapeUrl } from './services/firecrawlService';
import { 
  dbGetCurrentUser, 
  dbLogoutUser, 
  dbAddLog, 
  dbSaveAnalysis, 
  dbGetHistory, 
  dbGetLogs, 
  dbDeleteHistory,
  dbClearAllHistory
} from './services/db';
import { initSupabase as configSupabase } from './services/supabase';
import { PageAnalysis, ProjectReference, Discrepancy, DiscrepancySeverity, User, AnalysisSession, LogEntry, AppConfig } from './types';
import { MOCK_REFERENCE_TEXT, MOCK_LANDING_PAGE_1, MOCK_LANDING_PAGE_2_WITH_ERRORS } from './constants';

interface TargetPageInput {
  id: string;
  url: string;
  content: string;
  screenshot?: string;
  isScraping?: boolean;
}

type Tab = 'DASHBOARD' | 'HISTORY' | 'LOGS';
type FilterStatus = 'ALL' | 'COMPLIANT' | 'NON_COMPLIANT' | 'ERROR';
type SortOption = 'DATE_NEW' | 'DATE_OLD' | 'SCORE_HIGH' | 'SCORE_LOW';

// Default Config
const DEFAULT_CONFIG: AppConfig = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    firecrawlKey: process.env.FIRECRAWL_API_KEY || '',
    llmProvider: 'GEMINI',
    llmApiKey: process.env.API_KEY || '',
    llmModel: 'gemini-3-flash-preview'
};

const isValidUrl = (urlString: string) => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

const App: React.FC = () => {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Config State
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');

  // App State
  const [reference, setReference] = useState<ProjectReference & { isScraping?: boolean }>({
    name: 'Official Project Specs',
    url: 'https://auroraheights.com/specs',
    content: '',
    lastUpdated: new Date().toISOString()
  });

  const [targets, setTargets] = useState<TargetPageInput[]>([
    { id: '1', url: '', content: '' }
  ]);

  // Analysis Results
  const [results, setResults] = useState<PageAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<PageAnalysis | null>(null);
  const [previewContent, setPreviewContent] = useState<{title: string, content: string} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History & Logs Data
  const [history, setHistory] = useState<AnalysisSession[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Filtering & Sorting State
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('DATE_NEW');

  // Theme Toggle Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Load Config from LocalStorage on Mount
  useEffect(() => {
    const stored = localStorage.getItem('bg_app_config');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            setConfig(prev => ({ ...prev, ...parsed }));
            if (parsed.supabaseUrl && parsed.supabaseKey) {
                configSupabase(parsed.supabaseUrl, parsed.supabaseKey);
            }
        } catch (e) {
            console.error("Failed to load config", e);
        }
    } else {
        if (DEFAULT_CONFIG.supabaseUrl && DEFAULT_CONFIG.supabaseKey) {
             configSupabase(DEFAULT_CONFIG.supabaseUrl, DEFAULT_CONFIG.supabaseKey);
        }
    }
  }, []);

  // Initialize User
  useEffect(() => {
    const initUser = async () => {
      setLoadingAuth(true);
      try {
          const currentUser = await dbGetCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          }
      } catch (e) {
          console.warn("User fetch error (likely harmless first run):", e);
      }
      setLoadingAuth(false);
    };
    initUser();
  }, [config.supabaseUrl]);

  // Fetch History/Logs
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      if (activeTab === 'HISTORY') {
        try {
          const h = await dbGetHistory(user.id);
          setHistory(h);
        } catch (e) {
          console.error("Failed to fetch history", e);
        }
      } else if (activeTab === 'LOGS') {
        try {
          const l = await dbGetLogs();
          setLogs(l);
        } catch (e) {
          console.error("Failed to fetch logs", e);
        }
      }
    };
    fetchData();
  }, [activeTab, user, config.supabaseUrl]);

  // Handlers
  const handleConfigSave = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('bg_app_config', JSON.stringify(newConfig));
    if (newConfig.supabaseUrl && newConfig.supabaseKey) {
        try {
            configSupabase(newConfig.supabaseUrl, newConfig.supabaseKey);
        } catch (e) {
            console.error("Failed to re-init supabase", e);
        }
    }
  };

  const handleLogout = async () => {
    if (user) {
      await dbAddLog(user.id, user.name, 'LOGOUT', 'User logged out');
      await dbLogoutUser();
      setUser(null);
      setResults([]);
      setReference({
        name: 'Official Project Specs',
        url: '',
        content: '',
        lastUpdated: new Date().toISOString()
      });
      setTargets([{ id: '1', url: '', content: '' }]);
    }
  };

  const handleLoginSuccess = async (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const addTarget = () => {
    setTargets(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), url: '', content: '' }]);
  };

  const removeTarget = (id: string) => {
    setTargets(prev => {
      if (prev.length > 1) {
        return prev.filter(t => t.id !== id);
      }
      return prev;
    });
  };

  const updateTarget = (id: string, field: 'url' | 'content' | 'isScraping' | 'screenshot', value: any) => {
    setTargets(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const loadDemoData = () => {
    setReference({
      ...reference,
      url: 'https://official-project-site.com/master-plan',
      content: MOCK_REFERENCE_TEXT.trim(),
      screenshot: undefined
    });

    setTargets([
      { id: 'demo1', url: 'https://landing-page-campaign-a.com', content: MOCK_LANDING_PAGE_1.trim(), screenshot: undefined },
      { id: 'demo2', url: 'https://affiliate-broker-site.com/deals', content: MOCK_LANDING_PAGE_2_WITH_ERRORS.trim(), screenshot: undefined }
    ]);
    setResults([]);
    setErrorMsg(null);
  };

  const handleDiscrepancyFeedback = async (discrepancyId: string, isAccurate: boolean, details: string) => {
    if (!user) return;
    const action = isAccurate ? 'FEEDBACK_CONFIRMED' : 'FEEDBACK_REJECTED';
    const logDetails = `User marked discrepancy (${discrepancyId}) as ${isAccurate ? 'CORRECT' : 'FALSE POSITIVE'}. Context: ${details}`;
    try {
        await dbAddLog(user.id, user.name, action, logDetails); 
    } catch (e) { console.error(e); }
  };

  const handleManualScrape = async (type: 'reference' | 'target', id?: string) => {
    if (!config.firecrawlKey) {
      setIsSettingsOpen(true);
      setErrorMsg("Please configure your Firecrawl API Key in settings.");
      return;
    }

    const urlToScrape = type === 'reference' 
      ? reference.url 
      : targets.find(t => t.id === id)?.url;

    if (!urlToScrape || !isValidUrl(urlToScrape)) {
      setErrorMsg(`Invalid URL format: ${urlToScrape}`);
      return;
    }

    try {
      if (user) await dbAddLog(user.id, user.name, 'SCRAPE_URL', `Manually scraped: ${urlToScrape}`);
      
      if (type === 'reference') {
        setReference(prev => ({ ...prev, isScraping: true }));
        const result = await scrapeUrl(urlToScrape, config.firecrawlKey);
        setReference(prev => ({ ...prev, content: result.markdown, screenshot: result.screenshot, isScraping: false }));
      } else if (id) {
        updateTarget(id, 'isScraping', true);
        const result = await scrapeUrl(urlToScrape, config.firecrawlKey);
        updateTarget(id, 'content', result.markdown);
        updateTarget(id, 'screenshot', result.screenshot);
        updateTarget(id, 'isScraping', false);
      }
      setErrorMsg(null);
    } catch (err: any) {
      const msg = err.message || "Scraping failed";
      setErrorMsg(msg);
      if (type === 'reference') setReference(prev => ({ ...prev, isScraping: false }));
      else if (id) updateTarget(id, 'isScraping', false);
    }
  };

  const handleClearAllHistory = async () => {
    if (!user) return;
    if (confirm('Are you sure you want to delete all history? This action cannot be undone.')) {
        try {
            await dbClearAllHistory(user.id);
            setHistory([]);
            await dbAddLog(user.id, user.name, 'VIEW_HISTORY', 'Cleared all analysis history');
        } catch (e) {
            console.error("Failed to clear history", e);
        }
    }
  };

  // Robust Analysis Workflow
  const runAnalysis = async () => {
    if (!config.llmApiKey) {
      setIsSettingsOpen(true);
      setErrorMsg("Missing AI API Key. Please configure it in settings.");
      return;
    }

    setIsAnalyzing(true);
    setResults([]);
    setErrorMsg(null);
    if(user) await dbAddLog(user.id, user.name, 'ANALYSIS_RUN', 'Started comparison analysis');

    try {
      let refContent = reference.content;
      let refScreenshot = reference.screenshot;

      if (!refContent && reference.url && config.firecrawlKey) {
        if (!isValidUrl(reference.url)) throw new Error(`Invalid Reference URL: ${reference.url}`);

        setReference(prev => ({ ...prev, isScraping: true }));
        try {
          const scrapeResult = await scrapeUrl(reference.url, config.firecrawlKey);
          refContent = scrapeResult.markdown;
          refScreenshot = scrapeResult.screenshot;
          setReference(prev => ({ ...prev, content: refContent, screenshot: refScreenshot, isScraping: false }));
        } catch (e) {
          setReference(prev => ({ ...prev, isScraping: false }));
          throw new Error("Could not scrape reference URL.");
        }
      }

      if (!refContent) throw new Error("Reference content is missing.");

      const newResults: PageAnalysis[] = [];

      for (const target of targets) {
        let contentToAnalyze = target.content;
        let screenshotToAnalyze = target.screenshot;
        
        if (!contentToAnalyze && target.url && config.firecrawlKey) {
             if (!isValidUrl(target.url)) {
                 newResults.push({ id: target.id, url: target.url, timestamp: new Date().toISOString(), status: 'ERROR', complianceScore: 0, discrepancies: [], rawText: "Invalid URL" });
                 continue;
             }
             try {
                updateTarget(target.id, 'isScraping', true);
                const scrapeResult = await scrapeUrl(target.url, config.firecrawlKey);
                contentToAnalyze = scrapeResult.markdown;
                screenshotToAnalyze = scrapeResult.screenshot;
                updateTarget(target.id, 'content', contentToAnalyze);
                updateTarget(target.id, 'screenshot', screenshotToAnalyze);
                updateTarget(target.id, 'isScraping', false);
             } catch (e) {
                 newResults.push({ id: target.id, url: target.url, timestamp: new Date().toISOString(), status: 'ERROR', complianceScore: 0, discrepancies: [], rawText: "Scraping Failed" });
                 updateTarget(target.id, 'isScraping', false);
                 continue;
             }
        }

        if (!contentToAnalyze) continue; 

        // USE GENERIC LLM SERVICE with REFERENCE URL Context
        const analysis = await analyzeDiscrepancies(
            refContent, 
            contentToAnalyze, 
            target.url || 'Manual Input',
            reference.url || 'Manual Input Reference',
            config,
            refScreenshot,
            screenshotToAnalyze
        );
        
        const mappedDiscrepancies: Discrepancy[] = analysis.discrepancies.map((d, idx) => ({
          id: `${target.id}-d-${idx}`,
          ...d,
          severity: d.severity as DiscrepancySeverity
        }));

        newResults.push({
          id: target.id,
          url: target.url || 'Manual Input Text',
          timestamp: new Date().toISOString(),
          status: mappedDiscrepancies.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
          complianceScore: analysis.complianceScore,
          discrepancies: mappedDiscrepancies,
          rawText: contentToAnalyze,
          screenshot: screenshotToAnalyze
        });
      }

      setResults(newResults);

      if (newResults.length > 0 && user) {
        try {
            await dbSaveAnalysis({
                userId: user.id,
                projectName: reference.name || 'Untitled Project',
                referenceUrl: reference.url,
                results: newResults
            });
            await dbAddLog(user.id, user.name, 'ANALYSIS_RUN', `Analysis complete. Processed ${newResults.length} pages.`);
        } catch (dbErr) {
            console.warn("Could not save to DB", dbErr);
        }
      }

    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Unknown error";
      setErrorMsg(msg);
      if(user) await dbAddLog(user.id, user.name, 'ANALYSIS_RUN', `Analysis failed: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredResults = results.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  }).sort((a, b) => {
    if (sortBy === 'DATE_NEW') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (sortBy === 'DATE_OLD') return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    if (sortBy === 'SCORE_HIGH') return b.complianceScore - a.complianceScore;
    if (sortBy === 'SCORE_LOW') return a.complianceScore - b.complianceScore;
    return 0;
  });

  const handleExportCSV = () => {
    if (filteredResults.length === 0) return;
    const headers = ['URL', 'Status', 'Score', 'Timestamp', 'Critical Issues', 'Major Issues', 'Minor Issues', 'Discrepancy Details'];
    const csvContent = [
      headers.join(','),
      ...filteredResults.map(res => {
        const critical = res.discrepancies.filter(d => d.severity === 'CRITICAL').length;
        const major = res.discrepancies.filter(d => d.severity === 'MAJOR').length;
        const minor = res.discrepancies.filter(d => d.severity === 'MINOR').length;
        const details = res.discrepancies.map(d => `[${d.severity}] ${d.field}: ${d.description}`).join('; ').replace(/"/g, '""');
        return [`"${res.url}"`, res.status, res.complianceScore, `"${new Date(res.timestamp).toLocaleString()}"`, critical, major, minor, `"${details}"`].join(',');
      })
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analysis_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Render ---

  if (loadingAuth) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
    </div>;
  }

  // Determine if we show Auth form. We show it if we have DB config but no user.
  // If no DB config, we let them into the app to set it up via settings (Local Mode auto-creates user in handleLoginSuccess usually, or allows creating local profile)
  // However, `user` check handles the main gate. 
  // If no Supabase config exists, we still want to show Auth form to create a "Local Profile".
  
  if (!user) {
    return (
        <>
            <div className="absolute top-4 right-4 z-50 flex gap-2">
                <Button variant="ghost" onClick={toggleTheme} className="text-white hover:bg-slate-800">
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
                <Button variant="ghost" onClick={() => setIsSettingsOpen(true)} className="text-white hover:bg-slate-800">
                    <Settings className="w-5 h-5" />
                </Button>
            </div>
            <AuthForm onLogin={handleLoginSuccess} />
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                config={config}
                onSave={handleConfigSave}
            />
        </>
    );
  }

  // Logged In View
  const compliantCount = results.filter(r => r.status === 'COMPLIANT').length;
  const totalPages = results.length;
  const avgScore = totalPages > 0 ? Math.round(results.reduce((acc, curr) => acc + curr.complianceScore, 0) / totalPages) : 0;
  const criticalIssuesCount = results.reduce((acc, curr) => acc + curr.discrepancies.filter(d => d.severity === 'CRITICAL').length, 0);

  return (
    <div className="min-h-screen bg-brand-light dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Header */}
      <header className="bg-brand-navy text-white shadow-lg sticky top-0 z-40 border-b border-brand-blue">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <img 
                src="https://raw.githubusercontent.com/stackblitz/stackblitz-images/main/tridasa-logo.jpg" 
                alt="Tridasa Logo" 
                className="h-10 w-auto rounded bg-white p-0.5"
             />
            <div className="hidden sm:block">
                <h1 className="text-xl font-bold tracking-tight">Compliance Monitor</h1>
                <p className="text-xs text-slate-300">Powered by BrandGuard AI</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
             <nav className="hidden md:flex space-x-1 mr-4">
                <button onClick={() => setActiveTab('DASHBOARD')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'DASHBOARD' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Dashboard</button>
                <button onClick={() => setActiveTab('HISTORY')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'HISTORY' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>History</button>
                <button onClick={() => setActiveTab('LOGS')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'LOGS' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Logs</button>
             </nav>
             <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block"></div>
             
             {/* Theme Toggle */}
             <button onClick={toggleTheme} className="p-2 rounded-full text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>

             {user && <span className="text-sm text-slate-300 mr-2 hidden sm:inline">{user.name}</span>}
             <Button variant="ghost" onClick={handleLogout} className="text-slate-300 hover:bg-red-900/50 hover:text-red-300 p-2">
                <LogOut className="w-4 h-4" />
             </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-md shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{errorMsg}</p>
              </div>
              <div className="ml-auto pl-3">
                 <button onClick={() => setErrorMsg(null)} className="text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 p-1 rounded">
                    <Trash2 className="h-4 w-4" />
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* DASHBOARD VIEW */}
        {activeTab === 'DASHBOARD' && (
          <div className="animate-fade-in">
             <div className="flex justify-end mb-4">
                 <Button variant="ghost" onClick={loadDemoData} className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 mr-2 border border-transparent dark:border-slate-700">
                   <RotateCcw className="w-4 h-4 mr-2" /> Load Demo Data
                 </Button>
                 <Button variant="secondary" onClick={() => setIsSettingsOpen(true)} className="text-gray-600 dark:text-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700">
                    <Settings className="w-4 h-4 mr-2" /> Settings
                 </Button>
             </div>

            {/* Input Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
              {/* Reference */}
              <div className="lg:col-span-5 h-full">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
                    <div className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mr-2 text-xs font-bold">1</div>
                    Reference Source
                </h2>
                <UrlInputCard 
                  title="Official Project Data"
                  isReference={true}
                  url={reference.url}
                  content={reference.content}
                  hasScreenshot={!!reference.screenshot}
                  onUrlChange={(val) => setReference({...reference, url: val})}
                  onContentChange={(val) => setReference({...reference, content: val})}
                  placeholder="Paste specs or scrape from official URL..."
                  className="h-[450px]"
                  onScrape={() => handleManualScrape('reference')}
                  isScraping={reference.isScraping}
                />
              </div>

              {/* Action */}
              <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-4 py-4">
                <div className="text-gray-400 dark:text-slate-600 rotate-90 lg:rotate-0">
                    <Activity className="w-8 h-8 animate-pulse" />
                </div>
                <Button 
                    onClick={runAnalysis} 
                    isLoading={isAnalyzing} 
                    className="w-full lg:w-auto shadow-xl py-4 font-bold text-lg bg-brand-red hover:bg-red-700 focus:ring-red-500 border-transparent text-white"
                    disabled={(!reference.content && !reference.url) || targets.every(t => !t.content && !t.url)}
                >
                    {isAnalyzing ? 'Analyzing...' : `Run Analysis`}
                </Button>
                <p className="text-xs text-gray-500 dark:text-slate-400 text-center max-w-[150px]">
                    Analysis via <br/> <b>{config.llmModel}</b>
                </p>
              </div>

              {/* Targets */}
              <div className="lg:col-span-5 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 flex items-center">
                        <div className="w-6 h-6 rounded bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 flex items-center justify-center mr-2 text-xs font-bold">2</div>
                        Published Pages
                    </h2>
                    <button onClick={addTarget} className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline flex items-center font-medium">
                        <Plus className="w-3 h-3 mr-1" /> Add Page
                    </button>
                </div>
                
                <div className="space-y-4 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
                    {targets.map((target, idx) => (
                        <div key={target.id} className="relative group">
                            <UrlInputCard 
                                title={`Landing Page #${idx + 1}`}
                                url={target.url}
                                content={target.content}
                                hasScreenshot={!!target.screenshot}
                                onUrlChange={(val) => updateTarget(target.id, 'url', val)}
                                onContentChange={(val) => updateTarget(target.id, 'content', val)}
                                placeholder="Paste content or provide URL..."
                                className="h-[280px]"
                                onScrape={() => handleManualScrape('target', target.id)}
                                isScraping={target.isScraping}
                            />
                             {targets.length > 1 && (
                                <button 
                                    onClick={() => removeTarget(target.id)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Results Section */}
            {results.length > 0 && (
              <div className="border-t border-gray-200 dark:border-slate-700 pt-10 animate-fade-in pb-20">
                 <div className="flex flex-col mb-8">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center mb-2">
                                <LayoutDashboard className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                                Analysis Report
                            </h2>
                            <p className="text-gray-500 dark:text-slate-400 text-sm">Real-time discrepancies and compliance metrics across all published pages.</p>
                        </div>
                        <Button 
                            variant="secondary" 
                            onClick={handleExportCSV}
                            icon={<Download className="w-4 h-4" />}
                            className="dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                        >
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex items-center justify-between">
                         <div>
                             <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Overall Score</p>
                             <p className={`text-3xl font-bold ${avgScore >= 90 ? 'text-green-600 dark:text-green-400' : avgScore >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                 {avgScore}%
                             </p>
                         </div>
                         <div className={`p-3 rounded-full ${avgScore >= 90 ? 'bg-green-100 dark:bg-green-900/30' : avgScore >= 70 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                             <BarChart3 className={`w-6 h-6 ${avgScore >= 90 ? 'text-green-600 dark:text-green-400' : avgScore >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`} />
                         </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex items-center justify-between">
                         <div>
                             <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Pages Checked</p>
                             <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalPages}</p>
                         </div>
                         <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                             <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                         </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex items-center justify-between">
                         <div>
                             <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Critical Issues</p>
                             <p className={`text-3xl font-bold ${criticalIssuesCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{criticalIssuesCount}</p>
                         </div>
                         <div className={`p-3 rounded-full ${criticalIssuesCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-slate-700'}`}>
                             <AlertOctagon className={`w-6 h-6 ${criticalIssuesCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-slate-400'}`} />
                         </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex items-center justify-between">
                         <div>
                             <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Compliance Rate</p>
                             <p className="text-3xl font-bold text-gray-900 dark:text-white">{Math.round((compliantCount / totalPages) * 100)}%</p>
                         </div>
                         <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                             <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                         </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                     {/* Filter Sidebar */}
                    <div className="w-full md:w-64 flex-shrink-0 space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                <Filter className="w-4 h-4 mr-2" /> Filters
                            </h3>
                            <div className="space-y-2">
                                {['ALL', 'COMPLIANT', 'NON_COMPLIANT', 'ERROR'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status as FilterStatus)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                            filterStatus === status 
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                                            : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {status === 'ALL' ? 'All Results' : 
                                         status === 'COMPLIANT' ? 'Compliant' :
                                         status === 'NON_COMPLIANT' ? 'Issues Found' : 'Errors'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                             <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Sort By</h3>
                             <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="w-full text-sm border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-200 p-2"
                            >
                                <option value="DATE_NEW">Newest First</option>
                                <option value="DATE_OLD">Oldest First</option>
                                <option value="SCORE_HIGH">Score: High to Low</option>
                                <option value="SCORE_LOW">Score: Low to High</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Main Results List */}
                    <div className="flex-grow space-y-4">
                         {filteredResults.length === 0 && (
                            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-gray-300 dark:border-slate-600">
                                <Filter className="w-12 h-12 text-gray-300 dark:text-slate-500 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No matching results</h3>
                                <p className="text-gray-500 dark:text-slate-400">Try adjusting your filters or analysis criteria.</p>
                            </div>
                         )}

                         {filteredResults.map((res) => {
                             const critical = res.discrepancies.filter(d => d.severity === 'CRITICAL').length;
                             const major = res.discrepancies.filter(d => d.severity === 'MAJOR').length;
                             const minor = res.discrepancies.filter(d => d.severity === 'MINOR').length;

                             return (
                                <div 
                                    key={res.id} 
                                    className={`group relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 transition-all hover:shadow-md cursor-pointer overflow-hidden ${
                                        res.status === 'COMPLIANT' ? 'border-l-4 border-l-green-500' : 
                                        res.status === 'ERROR' ? 'border-l-4 border-l-gray-400' :
                                        'border-l-4 border-l-red-500'
                                    }`}
                                    onClick={() => setSelectedAnalysis(res)}
                                >
                                    <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate" title={res.url}>
                                                    {res.url}
                                                </h4>
                                                {res.url.startsWith('http') && (
                                                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400" onClick={(e) => e.stopPropagation()}>
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
                                                <span>{new Date(res.timestamp).toLocaleTimeString()}</span>
                                                {res.status === 'ERROR' && <span className="text-red-500 font-medium">Analysis Failed</span>}
                                                {res.status === 'COMPLIANT' && <span className="text-green-600 dark:text-green-400 font-medium flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> All Good</span>}
                                            </div>

                                            {/* Discrepancy Badges */}
                                            {res.status === 'NON_COMPLIANT' && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {critical > 0 && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200">
                                                            {critical} Critical
                                                        </span>
                                                    )}
                                                    {major > 0 && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200">
                                                            {major} Major
                                                        </span>
                                                    )}
                                                    {minor > 0 && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200">
                                                            {minor} Minor
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Score Section */}
                                        <div className="flex items-center gap-6 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t dark:border-slate-700 sm:border-t-0 pt-4 sm:pt-0 mt-2 sm:mt-0">
                                             <div className="text-right">
                                                <span className="block text-xs text-gray-500 dark:text-slate-400 uppercase font-medium tracking-wider">Score</span>
                                                <span className={`text-2xl font-bold ${
                                                    res.complianceScore >= 90 ? 'text-green-600 dark:text-green-400' : 
                                                    res.complianceScore >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                    {res.complianceScore}
                                                </span>
                                             </div>
                                             
                                             <div className="h-10 w-px bg-gray-200 dark:bg-slate-600 hidden sm:block"></div>
                                             
                                             <div className="flex items-center space-x-2">
                                                <Button 
                                                    variant="secondary" 
                                                    className="text-xs h-8 px-3 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewContent({
                                                            title: res.url,
                                                            content: res.rawText || "No source content captured."
                                                        });
                                                    }}
                                                    icon={<FileText className="w-3 h-3" />}
                                                >
                                                    View Source
                                                </Button>
                                                <Button variant="ghost" className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 h-8 px-3 text-xs">
                                                    Details <ChevronRight className="w-3 h-3 ml-1" />
                                                </Button>
                                             </div>
                                        </div>
                                    </div>
                                    
                                    {/* Critical Issue Preview (if any) */}
                                    {res.discrepancies.some(d => d.severity === 'CRITICAL') && (
                                        <div className="bg-red-50 dark:bg-red-900/20 px-5 py-2 border-t border-red-100 dark:border-red-900/30 flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                            <p className="text-xs text-red-800 dark:text-red-200 truncate">
                                                <span className="font-bold">Critical Alert:</span> {res.discrepancies.find(d => d.severity === 'CRITICAL')?.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                             );
                         })}
                    </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORY VIEW */}
        {activeTab === 'HISTORY' && (
           <div className="animate-fade-in bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                        <History className="w-5 h-5 mr-2 text-gray-500 dark:text-slate-400" /> Analysis History
                    </h3>
                    {history.length > 0 && (
                        <Button 
                            variant="danger" 
                            className="text-sm px-3 py-1.5"
                            onClick={handleClearAllHistory}
                            icon={<Trash2 className="w-4 h-4" />}
                        >
                            Clear History
                        </Button>
                    )}
                </div>
                {/* History Table Implementation */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Project</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ref URL</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {history.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-slate-400">No history available yet.</td></tr>
                            ) : (
                                history.map((session) => (
                                    <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{new Date(session.timestamp).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{session.projectName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 truncate max-w-xs">{session.referenceUrl || 'Manual Input'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => { setResults(session.results); setReference(prev => ({...prev, url: session.referenceUrl, name: session.projectName})); setActiveTab('DASHBOARD'); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4">Load</button>
                                            <button onClick={() => { dbDeleteHistory(session.id); setHistory(prev => prev.filter(h => h.id !== session.id)); }} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
           </div>
        )}

        {/* LOGS VIEW */}
        {activeTab === 'LOGS' && (
           <div className="animate-fade-in bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                 <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center"><FileText className="w-5 h-5 mr-2 text-gray-500 dark:text-slate-400" /> System Logs</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-800/50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Time</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Action</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Details</th></tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                             {logs.length === 0 ? (<tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-slate-400">No logs found.</td></tr>) : (
                                logs.map((log) => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400 font-mono">{new Date(log.timestamp).toISOString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-300"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200">{log.action}</span></td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 truncate max-w-lg" title={log.details}>{log.details}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
           </div>
        )}
      </main>

      <DiscrepancyModal 
        isOpen={!!selectedAnalysis} 
        analysis={selectedAnalysis} 
        onClose={() => setSelectedAnalysis(null)} 
        onFeedback={handleDiscrepancyFeedback}
      />

      <ContentPreviewModal
        isOpen={!!previewContent}
        title={previewContent?.title || ''}
        content={previewContent?.content || ''}
        onClose={() => setPreviewContent(null)}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        config={config}
        onSave={handleConfigSave}
      />

    </div>
  );
};

export default App;
