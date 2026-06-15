/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, Shield, User as UserIcon, Sparkles, CheckCircle2, AlertCircle, X, HelpCircle, Sun, Moon,
  Layout, Users, History, Settings, Mail
} from 'lucide-react';
import { User } from './types';
import LoginScreen from './components/LoginScreen';
import UnifiedMailer from './components/UnifiedMailer';
import EmailTemplates from './components/EmailTemplates';
import CustomerManagement from './components/CustomerManagement';
import EmailHistory from './components/EmailHistory';
import BrandingSettings from './components/BrandingSettings';
import { api } from './lib/api';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function App() {
  // Authentication status & session loading state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'proposal' | 'templates' | 'customers' | 'logs' | 'settings'>('proposal');
  const [emailLogs, setEmailLogs] = useState<any[]>([]);

  const fetchEmailLogs = async () => {
    try {
      const logs = await api.emailLogs.list();
      setEmailLogs(logs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchEmailLogs();
    }
  }, [activeTab]);

  const tabs = [
    { id: 'proposal', label: 'Proposal Builder', icon: Sparkles },
    { id: 'templates', label: 'Templates', icon: Mail },
    { id: 'customers', label: 'Clients Ledger', icon: Users },
    { id: 'logs', label: 'Sent Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Theme status
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('invoice_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // Toast notifications hub state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Trigger notification messaging
  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Automatically dismiss toast after 4000ms
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleRemoveToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('invoice_theme', newTheme);
    notify(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'success');
  };

  // Cold boot verification of existing credentials
  useEffect(() => {
    const storedUser = localStorage.getItem('invoice_user');
    const storedToken = localStorage.getItem('invoice_token');
    
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (err) {
        localStorage.removeItem('invoice_user');
        localStorage.removeItem('invoice_token');
      }
    }
    setBootstrapping(false);
  }, []);

  const handleLoginSuccess = (authenticatedUser: User, sessionToken: string) => {
    localStorage.setItem('invoice_user', JSON.stringify(authenticatedUser));
    localStorage.setItem('invoice_token', sessionToken);
    setUser(authenticatedUser);
    setToken(sessionToken);
    notify(`Welcome back, ${authenticatedUser.name}! Dashboard connected.`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('invoice_user');
    localStorage.removeItem('invoice_token');
    setUser(null);
    setToken(null);
    notify('Session logged out successfully.', 'success');
  };

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-[#070b13] flex items-center justify-center text-slate-500 font-mono text-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-violet-600 animate-spin border-t border-white" />
          <span>Synchronizing security tunnels...</span>
        </div>
      </div>
    );
  }

  // Render Login flow if unauthenticated
  if (!token || !user) {
    return (
      <>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        
        {/* Render persistent global notification toast overlay */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
          <AnimatePresence>
            {toasts.map(t => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className={`p-4 rounded-xl border pointer-events-auto flex items-start gap-3 shadow-2xl backdrop-blur-md ${
                  t.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-550/25 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-550/25 text-rose-400'
                }`}
              >
                {t.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />}
                <p className="text-xs font-semibold select-none pr-4 leading-relaxed">{t.message}</p>
                <button onClick={() => handleRemoveToast(t.id)} className="text-slate-500 hover:text-white text-xs block cursor-pointer select-none">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </>
    );
  }

  return (
    <div className={`min-h-screen bg-app-bg text-app-text relative overflow-x-hidden font-sans transition-all duration-300 ${theme === 'light' ? 'light-theme' : 'dark-theme'}`}>
      
      {/* Background radial glowing gradients */}
      <div className="absolute top-0 left-0 w-[450px] h-[450px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[550px] h-[550px] rounded-full bg-indigo-600/5 blur-[140px] pointer-events-none" />

      {/* COMPACT MAIN HEADER LAYER */}
      <header className="sticky top-0 z-40 bg-app-header-bg/85 backdrop-blur-xl border-b border-card-border px-4 lg:px-6 py-3.5 flex items-center justify-between no-print transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-title-color leading-none uppercase">I-SUCCESSNODE</h1>
            <span className="text-[10px] text-muted-text tracking-wider block mt-1 font-semibold uppercase">Proposal & Sponsored Invoice Center</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 bg-card-bg border border-card-border px-3 py-1.5 rounded-xl text-xs font-semibold">
            <UserIcon className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-title-color">{user.name}</span>
            <span className="text-[9px] font-bold text-violet-400 uppercase bg-violet-500/10 px-1.5 py-0.5 rounded">Admin Desk</span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 bg-card-bg hover:bg-hover-bg border border-card-border text-title-color rounded-xl flex items-center justify-center cursor-pointer transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-violet-600" />
            )}
          </button>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 bg-rose-550/10 hover:bg-rose-550/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* NAVIGATION TABS BAR */}
      <div className="bg-app-header-bg/60 border-b border-card-border px-4 lg:px-6 py-2 no-print flex items-center justify-start overflow-x-auto gap-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                isActive 
                  ? 'text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-gradient-to-r from-violet-600/15 to-indigo-600/15 border border-violet-500/30 rounded-xl"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* COCKPIT CORE MAIN WORKSPACE */}
      <main className="w-full max-w-full px-4 lg:px-6 py-6 pb-16 relative z-10 transition-all duration-300">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'proposal' && (
              <UnifiedMailer 
                theme={theme}
                onNotify={notify} 
                user={user} 
                onLogout={handleLogout} 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'templates' && (
              <EmailTemplates 
                onNotify={notify}
                onRefreshData={() => {}}
              />
            )}
            {activeTab === 'customers' && (
              <CustomerManagement 
                onNotify={notify}
                onRefreshData={() => {}}
              />
            )}
            {activeTab === 'logs' && (
              <EmailHistory 
                emails={emailLogs}
                onNotify={notify}
              />
            )}
            {activeTab === 'settings' && (
              <BrandingSettings 
                onNotify={notify}
                onRefreshData={() => {}}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* GLOBAL TOAST NOTIFICATION CORNER */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none no-print">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className={`p-4 rounded-xl border pointer-events-auto flex items-start gap-3 shadow-2xl backdrop-blur-md ${
                t.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-550/25 text-emerald-400 animate-none' 
                  : 'bg-rose-500/10 border-rose-550/25 text-rose-400 animate-none'
              }`}
            >
              {t.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />}
              <p className="text-xs font-semibold select-none pr-4 leading-relaxed text-slate-100">{t.message}</p>
              <button onClick={() => handleRemoveToast(t.id)} className="text-slate-500 hover:text-white text-xs block cursor-pointer select-none">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
