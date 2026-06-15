/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, DollarSign, Mail, FileText, Clock, 
  ArrowUpRight, Sparkles, PlusCircle, Send, Plus, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { Customer, Invoice, EmailLog } from '../types';

interface DashboardViewProps {
  customers: Customer[];
  invoices: Invoice[];
  emails: EmailLog[];
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ customers, invoices, emails, onNavigate }: DashboardViewProps) {
  const [activeChartTab, setActiveChartTab] = useState<'revenue' | 'growth'>('revenue');

  // Math metrics engine
  const totalCustomers = customers.length;
  const totalEmails = emails.length;
  
  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending');
  const pendingCount = pendingInvoices.length;
  
  // Totals calculations
  const totalRevenue = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.payableAmount, 0);

  const pendingRevenue = pendingInvoices
    .reduce((sum, inv) => sum + inv.payableAmount, 0);

  // Growth / Revenue data points over recent months for rendering standard custom SaaS graphs
  // Data index is month coordinate, from Jan to Jun
  const revenuePoints = [24000, 48000, 39000, 56000, 89000, totalRevenue || 79000];
  const growthPoints = [2, 5, 8, 12, 19, totalCustomers || 23];

  // Custom SVG graphing limits
  const maxRevenue = Math.max(...revenuePoints, 10000);
  const maxGrowth = Math.max(...growthPoints, 10);

  return (
    <div className="space-y-8 select-none">
      {/* Prime Header Accent banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-violet-600/10 via-indigo-600/5 to-transparent border border-violet-500/10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Overview</h1>
          <p className="text-slate-400 text-sm mt-1">
            Realtime customer billing records, automated templates, and email delivery trackers.
          </p>
        </div>
        
        {/* Quick Launch Action panel */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('send-email')}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-violet-500/20 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Send Mailer
          </button>
          
          <button
            onClick={() => onNavigate('invoices')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-all border border-slate-700/60 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Metric Bento Cards Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        
        {/* Total Customers */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 opacity-15"><Users className="w-14 h-14 text-violet-400" /></div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Total Customers</p>
          <h3 className="text-3xl font-bold text-white mt-3 font-mono">{totalCustomers}</h3>
          <div className="flex items-center gap-1.5 mt-3 text-emerald-400 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active database logs</span>
          </div>
        </motion.div>

        {/* Paid Revenue */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 opacity-15"><DollarSign className="w-14 h-14 text-emerald-400" /></div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Received Revenue</p>
          <h3 className="text-3xl font-bold text-white mt-3 font-mono">₹{totalRevenue.toLocaleString('en-IN')}</h3>
          <div className="flex items-center gap-1.5 mt-3 text-emerald-400 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Fully settled</span>
          </div>
        </motion.div>

        {/* Total Invoices */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 opacity-15"><FileText className="w-14 h-14 text-blue-400" /></div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Invoices Logged</p>
          <h3 className="text-3xl font-bold text-white mt-3 font-mono">{totalInvoices}</h3>
          <div className="flex items-center gap-1.5 mt-3 text-indigo-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            <span>Billing objects items</span>
          </div>
        </motion.div>

        {/* Total Emails Sent */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 opacity-15"><Mail className="w-14 h-14 text-pink-400" /></div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Emails Sent</p>
          <h3 className="text-3xl font-bold text-white mt-3 font-mono">{totalEmails}</h3>
          <div className="flex items-center gap-1.5 mt-3 text-pink-400 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Delivered alerts</span>
          </div>
        </motion.div>

        {/* Pending Revenue */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 opacity-15"><Clock className="w-14 h-14 text-amber-400" /></div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Pending Collections</p>
          <h3 className="text-3xl font-bold text-amber-400 mt-3 font-mono">₹{pendingRevenue.toLocaleString('en-IN')}</h3>
          <div className="flex items-center gap-1.5 mt-3 text-amber-500 text-xs">
            <span className="font-medium">{pendingCount} invoices awaiting pay</span>
          </div>
        </motion.div>

      </div>

      {/* Main Grid: Custom Analytics Charts and Activity ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Interactive Interactive Chart */}
        <div className="col-span-1 lg:col-span-2 bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block bg-violet-500/10 px-2 py-0.5 rounded-full w-max">Performance Trends</span>
              <h2 className="text-lg font-bold text-white tracking-tight mt-1">Analytics Dashboard</h2>
            </div>
            
            {/* Chart toggle controls */}
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveChartTab('revenue')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeChartTab === 'revenue' 
                    ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Revenue Flow (₹)
              </button>
              
              <button
                onClick={() => setActiveChartTab('growth')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeChartTab === 'growth' 
                    ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Clients Base
              </button>
            </div>
          </div>

          {/* Bespoke Interactive Vector Chart Canvas */}
          <div className="h-64 relative flex items-end">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-500 font-mono select-none">
              <div className="border-b border-slate-800/50 pb-1 w-full text-right">
                {activeChartTab === 'revenue' ? `₹${maxRevenue.toLocaleString('en-IN')}` : maxGrowth}
              </div>
              <div className="border-b border-slate-800/50 pb-1 w-full text-right">
                {activeChartTab === 'revenue' ? `₹${Math.round(maxRevenue * 0.6).toLocaleString('en-IN')}` : Math.round(maxGrowth * 0.6)}
              </div>
              <div className="border-b border-slate-800/50 pb-1 w-full text-right">
                {activeChartTab === 'revenue' ? `₹${Math.round(maxRevenue * 0.3).toLocaleString('en-IN')}` : Math.round(maxGrowth * 0.3)}
              </div>
              <div className="w-full text-right">0</div>
            </div>

            {/* Custom SVG Path render node */}
            <svg className="w-full h-4/5 z-10 overflow-visible mt-6" viewBox="0 0 600 150">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Plot points map */}
              {(() => {
                const points = activeChartTab === 'revenue' ? revenuePoints : growthPoints;
                const maxVal = activeChartTab === 'revenue' ? maxRevenue : maxGrowth;
                
                // Construct path standard coordinates
                const computedCoords = points.map((val, idx) => {
                  const x = (idx / (points.length - 1)) * 560 + 20;
                  const y = 140 - (val / maxVal) * 110;
                  return { x, y, val };
                });

                const pathString = computedCoords.reduce((acc, c, idx) => {
                  return idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
                }, '');

                const areaString = `${pathString} L ${computedCoords[computedCoords.length - 1].x} 140 L ${computedCoords[0].x} 140 Z`;

                return (
                  <>
                    {/* Shaded Area fill */}
                    <path d={areaString} fill="url(#chartGrad)" />

                    {/* Bold stroke Line */}
                    <path d={pathString} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Point nodes with hover indicators */}
                    {computedCoords.map((c, idx) => (
                      <g key={idx} className="group cursor-pointer">
                        <circle cx={c.x} cy={c.y} r="5" fill="#8b5cf6" stroke="#0f172a" strokeWidth="2" className="transition-all duration-300 group-hover:r-7" />
                        <circle cx={c.x} cy={c.y} r="10" fill="#8b5cf6" fillOpacity="0.1" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Hover coordinates values overlay box */}
                        <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-300">
                          <rect x={idx === 5 ? c.x - 70 : c.x - 40} y={c.y - 32} width={80} height={22} rx="4" fill="#0f172a" stroke="#1e293b" />
                          <text x={idx === 5 ? c.x - 30 : c.x} y={c.y - 17} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                            {activeChartTab === 'revenue' ? `₹${c.val.toLocaleString()}` : `${c.val} accounts`}
                          </text>
                        </g>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>

          {/* X Axis monthly intervals */}
          <div className="flex justify-between pl-4 pr-1 text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-800/20 select-none">
            <span>Jan 26</span>
            <span>Feb 26</span>
            <span>Mar 26</span>
            <span>Apr 26</span>
            <span>May 26</span>
            <span>Jun (Live)</span>
          </div>
        </div>

        {/* Sidebar Activity Feed */}
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block bg-indigo-500/10 px-2 py-0.5 rounded-full w-max">System Logs</span>
              <h2 className="text-lg font-bold text-white tracking-tight mt-1">Activity Stream</h2>
            </div>
            
            <button
              onClick={() => onNavigate('email-history')}
              className="text-slate-400 hover:text-violet-400 font-semibold text-xs flex items-center gap-0.5 cursor-pointer"
            >
              See all
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            {emails.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Clock className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">No recent transactions recorded</p>
              </div>
            ) : (
              emails.map((log) => (
                <div 
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-3 hover:border-slate-800 transition-colors"
                >
                  <div className={`p-2 rounded-lg mt-0.5 ${
                    log.status === 'Delivered' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{log.customerName}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{log.subject}</p>
                    <div className="flex items-center justify-between mt-2 text-[9px] text-slate-500">
                      <span>Ref ID: <span className="font-mono text-slate-400 uppercase">{log.invoiceId}</span></span>
                      <span>{new Date(log.sentAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Featured Help Tips bottom banner */}
      <div className="p-5 rounded-2xl bg-slate-900/10 border border-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 hidden sm:block">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Need help managing template variables?</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Use variables tokens like <code className="text-violet-300 font-mono font-semibold">{"{{customer_name}}"}</code> to auto-personalize billing items.</p>
          </div>
        </div>
        <button 
          onClick={() => onNavigate('email-templates')}
          className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer whitespace-nowrap"
        >
          Manage Templates
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
