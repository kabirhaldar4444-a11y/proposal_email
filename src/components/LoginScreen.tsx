/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User as UserIcon, Shield, ArrowRight, Sparkles, Check } from 'lucide-react';
import { api } from '../lib/api';
import { User, UserRole } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const resetStates = () => {
    setError('');
    setSuccessMsg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStates();
    if (!email || !password) {
      setError('Please provide both administrative email and password details.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Credentials invalid. Try admin@invoicemailer.pro / "admin"');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStates();
    if (!name || !email || !password) {
      setError('All fields are required for enterprise registration.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.register({ name, email, password, role });
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'An error occurred during account provisioning.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStates();
    if (!email) {
      setError('Please specify the registered email coordinate.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(email);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setError(err.message || 'Error executing password dispatch reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center relative overflow-hidden px-4 select-none">
      {/* Background visual graphics */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20 mb-4"
          >
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </motion.div>
          
          <motion.h1 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold text-white tracking-tight font-sans"
          >
            InvoiceMailer <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Pro</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-sm mt-2"
          >
            SaaS Billing and Automated Email Delivery Workspace
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative"
        >
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center font-medium">
              {successMsg}
            </div>
          )}

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Reset Administrative Credentials</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Provide your registered email address below, and our authentication framework will dispatch verification instructions.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">Corporate Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer mt-6"
              >
                {loading ? 'Dispatched Request...' : 'Send Recovery Coordinates'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); resetStates(); }}
                  className="text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
                >
                  Return to login node
                </button>
              </div>
            </form>
          ) : isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Register Corporate Account</h2>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rachel Green"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">Corporate Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">Functional Workspace Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.ADMIN)}
                    className={`py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      role === UserRole.ADMIN
                        ? 'bg-violet-600/15 border-violet-500 text-violet-400'
                        : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    System Admin
                    {role === UserRole.ADMIN && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.STAFF)}
                    className={`py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      role === UserRole.STAFF
                        ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400'
                        : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    Billing Staff
                    {role === UserRole.STAFF && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer mt-6"
              >
                {loading ? 'Provisioning Account...' : 'Provision Enterprise Account'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center mt-4 text-xs text-slate-500">
                Already have a workspace account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); resetStates(); }}
                  className="text-violet-400 hover:text-violet-300 font-medium cursor-pointer ml-1"
                >
                  Access login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <h2 className="text-lg font-semibold text-white">Workspace Security Entry</h2>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">Corporate Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@invoicemailer.pro"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">Password</label>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); resetStates(); }}
                    className="text-[11px] text-violet-400 hover:text-violet-300 cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer mt-6"
              >
                {loading ? 'Securing Session...' : 'Authenticate'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center mt-5 text-xs text-slate-500">
                New user for InvoiceMailer Pro?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegistering(true); resetStates(); }}
                  className="text-violet-400 hover:text-violet-300 font-medium cursor-pointer ml-1"
                >
                  Create an account
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-violet-600/5 border border-violet-500/10 text-[11px] text-slate-400 leading-relaxed font-sans text-center mt-4">
                💡 <strong>Demo Mode Credentials:</strong> <br/>
                Admin: <code className="text-violet-300">admin@invoicemailer.pro</code> & Password: <code className="text-violet-300">admin</code><br/>
                Staff: <code className="text-indigo-300">staff@invoicemailer.pro</code> & Password: <code className="text-indigo-300">staff</code>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
