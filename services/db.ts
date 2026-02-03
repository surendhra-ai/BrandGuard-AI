
import { getSupabase } from './supabase';
import { User, LogEntry, AnalysisSession } from '../types';

const SESSION_KEY = 'bg_current_session_user';

// Helper to safely get supabase or throw
const db = () => getSupabase();

// --- Auth / User Management ---

export const dbRegisterUser = async (email: string, name: string): Promise<User> => {
  const supabase = db();
  
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

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

export const dbLoginUser = async (email: string): Promise<User> => {
  const supabase = db();
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

export const dbGetCurrentUser = async (): Promise<User | null> => {
  const sessionStr = localStorage.getItem(SESSION_KEY);
  if (!sessionStr) return null;
  
  try {
    const user = JSON.parse(sessionStr);
    return user;
  } catch {
    return null;
  }
};

// --- Logs ---

export const dbAddLog = async (userId: string, userName: string, action: string, details: string) => {
  try {
    const supabase = db();
    await supabase
      .from('logs')
      .insert([{ 
        user_id: userId, 
        user_name: userName, 
        action, 
        details 
      }]);
  } catch (e) {
    console.warn("Logging failed (DB might not be connected):", e);
  }
};

export const dbGetLogs = async (): Promise<LogEntry[]> => {
  const supabase = db();
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
  const supabase = db();
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
  const supabase = db();
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
  const supabase = db();
  const { error } = await supabase
    .from('analysis_history')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

export const dbClearAllHistory = async (userId: string) => {
  const supabase = db();
  const { error } = await supabase
    .from('analysis_history')
    .delete()
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
};
