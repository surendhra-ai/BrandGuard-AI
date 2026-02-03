
import { getSupabase } from './supabase';
import { User, LogEntry, AnalysisSession } from '../types';

const SESSION_KEY = 'bg_current_session_user';
const LOCAL_HISTORY_KEY = 'bg_local_history';
const LOCAL_LOGS_KEY = 'bg_local_logs';

// Helper: Try to get supabase, return null if not configured
const safeDb = () => {
  try {
    return getSupabase();
  } catch {
    return null;
  }
};

// --- Auth / User Management ---

export const dbRegisterUser = async (email: string, name: string): Promise<User> => {
  const supabase = safeDb();
  
  if (supabase) {
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
  } 
  
  // Local Fallback (Mock User)
  const newUser: User = {
    id: 'local-' + Math.random().toString(36).substr(2, 9),
    email,
    name,
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
  return newUser;
};

export const dbLoginUser = async (email: string): Promise<User> => {
  const supabase = safeDb();

  if (supabase) {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      throw new Error('User not found in cloud database');
    }

    const user: User = {
      id: data.id,
      email: data.email,
      name: data.name,
      createdAt: data.created_at
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }

  // Local Fallback: For local mode, we just check the current session or create a mock "session"
  // Since we don't store a user table locally (too complex), we just rely on "Register" logic or session
  const sessionStr = localStorage.getItem(SESSION_KEY);
  if (sessionStr) {
    const u = JSON.parse(sessionStr);
    if (u.email === email) return u;
  }
  
  // Auto-create for local dev convenience if not found
  const localUser: User = {
    id: 'local-user',
    email,
    name: email.split('@')[0],
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(localUser));
  return localUser;
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
  const supabase = safeDb();

  if (supabase) {
    try {
      await supabase
        .from('logs')
        .insert([{ 
          user_id: userId, 
          user_name: userName, 
          action, 
          details 
        }]);
    } catch (e) {
      console.warn("Supabase logging failed", e);
    }
  } else {
    // Local Fallback
    const logs = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    logs.unshift({
      id: 'log-' + Date.now(),
      user_id: userId,
      user_name: userName,
      action,
      details,
      created_at: new Date().toISOString()
    });
    // Keep last 50 logs locally
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs.slice(0, 50)));
  }
};

export const dbGetLogs = async (): Promise<LogEntry[]> => {
  const supabase = safeDb();

  if (supabase) {
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
  } else {
    // Local Fallback
    const logs = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    return logs.map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      userName: d.user_name,
      timestamp: d.created_at,
      action: d.action,
      details: d.details
    }));
  }
};

// --- Analysis History ---

export const dbSaveAnalysis = async (session: Omit<AnalysisSession, 'id' | 'timestamp'>) => {
  const supabase = safeDb();

  if (supabase) {
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
  } else {
    // Local Fallback
    const history = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    const newSession = {
      ...session,
      id: 'sess-' + Date.now(),
      timestamp: new Date().toISOString()
    };
    history.unshift(newSession);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(history));
    return newSession;
  }
};

export const dbGetHistory = async (userId: string): Promise<AnalysisSession[]> => {
  const supabase = safeDb();

  if (supabase) {
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
  } else {
    // Local Fallback
    const history = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    // Filter by user ID loosely (in local mode typically single user, but good to filter)
    return history.filter((h: any) => h.userId === userId);
  }
};

export const dbDeleteHistory = async (id: string) => {
  const supabase = safeDb();

  if (supabase) {
    const { error } = await supabase
      .from('analysis_history')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  } else {
    // Local Fallback
    let history = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    history = history.filter((h: any) => h.id !== id);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(history));
  }
};

export const dbClearAllHistory = async (userId: string) => {
  const supabase = safeDb();

  if (supabase) {
    const { error } = await supabase
      .from('analysis_history')
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  } else {
     // Local Fallback
     let history = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
     history = history.filter((h: any) => h.userId !== userId);
     localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(history));
  }
};
