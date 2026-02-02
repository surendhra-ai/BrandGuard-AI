
import { supabase } from './supabase';
import { User, LogEntry, AnalysisSession } from '../types';

// We still use localStorage for session persistence (to know WHO is logged in on refresh)
const SESSION_KEY = 'bg_current_session_user';

// --- Auth / User Management ---

export const dbRegisterUser = async (email: string, name: string): Promise<User> => {
  // Check if exists
  const { data: existing } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', email)
    .single();

  if (existing) {
    throw new Error('User already exists');
  }

  const { data, error } = await supabase
    .from('app_users')
    .insert([{ email, name }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  const user: User = {
    id: data.id,
    email: data.email,
    name: data.name,
    createdAt: data.created_at
  };

  // Set session
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

export const dbLoginUser = async (email: string): Promise<User> => {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
    throw new Error('User not found');
  }

  const user: User = {
    id: data.id,
    email: data.email,
    name: data.name,
    createdAt: data.created_at
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

export const dbLogoutUser = async () => {
  localStorage.removeItem(SESSION_KEY);
};

// Gets user from local session storage (fast check), then verifies with DB if needed
export const dbGetCurrentUser = async (): Promise<User | null> => {
  const sessionStr = localStorage.getItem(SESSION_KEY);
  if (!sessionStr) return null;
  
  try {
    const user = JSON.parse(sessionStr);
    // Optional: Refresh from DB to ensure still valid
    return user;
  } catch {
    return null;
  }
};

// --- API Keys (Stored in User Table) ---

export const dbSaveFirecrawlKey = async (userId: string, key: string): Promise<void> => {
  const { error } = await supabase
    .from('app_users')
    .update({ firecrawl_key: key })
    .eq('id', userId);

  if (error) throw new Error(error.message);
};

export const dbGetFirecrawlKey = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('app_users')
    .select('firecrawl_key')
    .eq('id', userId)
    .single();
    
  if (error) return null;
  return data?.firecrawl_key || null;
};

// --- Logs ---

export const dbAddLog = async (userId: string, userName: string, action: LogEntry['action'], details: string) => {
  // Fire and forget, don't await strictly in UI unless needed
  await supabase
    .from('logs')
    .insert([{ 
      user_id: userId, 
      user_name: userName, 
      action, 
      details 
    }]);
};

export const dbGetLogs = async (): Promise<LogEntry[]> => {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((d: any) => ({
    id: d.id,
    userId: d.user_id,
    userName: d.user_name,
    timestamp: d.created_at,
    action: d.action,
    details: d.details
  }));
};

// --- Analysis History ---

export const dbSaveAnalysis = async (session: Omit<AnalysisSession, 'id' | 'timestamp'>) => {
  const { data, error } = await supabase
    .from('analysis_history')
    .insert([{
      user_id: session.userId,
      project_name: session.projectName,
      reference_url: session.referenceUrl,
      results: session.results
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    ...session,
    id: data.id,
    timestamp: data.created_at
  };
};

export const dbGetHistory = async (userId: string): Promise<AnalysisSession[]> => {
  const { data, error } = await supabase
    .from('analysis_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((d: any) => ({
    id: d.id,
    userId: d.user_id,
    projectName: d.project_name,
    referenceUrl: d.reference_url,
    timestamp: d.created_at,
    results: d.results
  }));
};

export const dbDeleteHistory = async (id: string) => {
  const { error } = await supabase
    .from('analysis_history')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

export const dbClearAllHistory = async (userId: string) => {
  const { error } = await supabase
    .from('analysis_history')
    .delete()
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
};
