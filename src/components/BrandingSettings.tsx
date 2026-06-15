/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, Save, Sparkles, Building2, Globe, Mail, Phone, MapPin, Loader2, Link2 } from 'lucide-react';
import { api } from '../lib/api';
import { CompanySettings } from '../types';

interface BrandingSettingsProps {
  onNotify: (message: string, type: 'success' | 'error') => void;
  onRefreshData: () => void;
}

export default function BrandingSettings({ onNotify, onRefreshData }: BrandingSettingsProps) {
  const [formData, setFormData] = useState<CompanySettings>({
    companyName: '',
    companyPhone: '',
    companyEmail: '',
    website: '',
    logoUrl: '',
    footerText: '',
    emailSignature: '',
    resendApiKey: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.settings.get();
      setFormData(data);
    } catch (err) {
      onNotify('Failed to retrieve branding settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.companyEmail) {
      onNotify('Company Name and Corporate Contact Email are required.', 'error');
      return;
    }

    setSaveLoading(true);
    try {
      await api.settings.save(formData);
      onNotify('Corporate branding settings updated and stored successfully.', 'success');
      fetchSettings();
      onRefreshData();
    } catch (err) {
      onNotify('Error occurred persisting settings values.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Top Banner */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Branding & Workspace Settings</h1>
        <p className="text-slate-400 text-xs mt-1">Configure company logos, signatures, signatures, and legal footer texts used across automated emails.</p>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin mb-3" />
          <p className="text-xs text-slate-400">Loading custom settings variables...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Settings edit form panel Left Column */}
          <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 pb-4 border-b border-slate-800">
              <Settings className="w-4 h-4 text-violet-400" />
              Company Details Configuration
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name and logo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Company Legal Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. InvoiceMailer Pro Solutions"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-805 pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Company Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="url"
                      placeholder="https://invoicemailer.pro"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-805 pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Email and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Billing Department Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="finance@invoicemailer.pro"
                      value={formData.companyEmail}
                      onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-805 pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Contact Phone Coordinates</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="+91 80001 09999"
                      value={formData.companyPhone}
                      onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-805 pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Link URL */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Base Brand Logo Image (URL Link)</label>
                  <span className="text-[9px] text-slate-500 font-mono">Accepts CDN / Unsplash URLs</span>
                </div>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-805 pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Default Footer disclaimer */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Automated Invoice Footer Text</label>
                <textarea
                  placeholder="e.g. Thank you for choosing InvoiceMailer Pro. For any queries regarding this invoice, please email finance@invoicemailer.pro."
                  value={formData.footerText}
                  rows={2}
                  onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                  className="w-full bg-slate-950/80 border border-slate-805 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-sans"
                />
              </div>

              {/* Global Signature block HTML */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Default Email Signature Block (Rich HTML)</label>
                  <span className="text-[9px] text-violet-400 font-mono">Available as {"{{email_signature}}"} variable</span>
                </div>
                <textarea
                  placeholder="With professional regard,<br/><strong>Team Accreditations</strong>"
                  value={formData.emailSignature}
                  rows={3}
                  onChange={(e) => setFormData({ ...formData, emailSignature: e.target.value })}
                  className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-sans"
                />
              </div>

              {/* Resend API Key for Direct Emailing */}
              <div className="space-y-1.5 border-t border-slate-800/60 pt-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Resend API Key (for direct email sending)</label>
                  <span className="text-[9px] text-emerald-400 font-mono">Enables direct emails from the app</span>
                </div>
                <input
                  type="password"
                  placeholder="re_..."
                  value={formData.resendApiKey || ''}
                  onChange={(e) => setFormData({ ...formData, resendApiKey: e.target.value })}
                  className="w-full bg-slate-950/80 border border-slate-805 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <p className="text-[9px] text-slate-500">Provide your Resend API Key to allow the application to dispatch rich emails directly without copy-pasting into Gmail.</p>
              </div>

              {/* Submit Controls Row */}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-violet-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Workspace Branding
                </button>
              </div>

            </form>
          </div>

          {/* Visual Pre-rendering snap Right Column panel */}
          <div className="lg:col-span-5 bg-slate-900/30 border border-slate-800/85 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider block bg-violet-500/10 px-2 py-0.5 rounded-full w-max">Realtime visual preview</span>
              <h3 className="text-xs font-bold text-white tracking-tight mt-1.5 pb-4 border-b border-slate-800/50">Branded Wrap Preview</h3>
              
              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                Review below how settings parameters instantly modify header shapes, logos configurations, and signature elements in outgoing message templates.
              </p>

              {/* Logo snapshot thumbnail inside */}
              <div className="mt-5 border border-slate-800 rounded-2xl p-4 bg-slate-950/80 space-y-4">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Branded Logo Position</span>
                  
                  {formData.logoUrl ? (
                    <div className="p-3 bg-white/5 border border-slate-800 rounded-xl flex items-center justify-center min-h-[50px]">
                      <img 
                        src={formData.logoUrl} 
                        alt="Logo brand preview" 
                        className="max-h-12 rounded bg-white p-1 select-none"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-600 italic py-2">No custom logo configured. Using text headings fallbacks.</div>
                  )}
                </div>

                {/* Substituted Email envelope sample */}
                <div className="space-y-1 pt-2 border-t border-slate-850">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Signature Variable Evaluation</span>
                  <div 
                    className="p-3.5 rounded-xl bg-slate-900 text-[10px] text-slate-400 italic leading-relaxed font-sans border border-slate-850/50"
                    dangerouslySetInnerHTML={{ __html: formData.emailSignature || 'N/A' }}
                  />
                </div>

                {/* Footer preview */}
                <div className="space-y-1 pt-2 border-t border-slate-850">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Email Envelope Footer preview</span>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-850/50 text-[10px] text-slate-400 text-center font-medium">
                    <p className="font-semibold text-slate-300 font-sans">{formData.companyName || 'N/A'}</p>
                    <p className="text-[9px] text-slate-500 mt-1">{formData.footerText || 'N/A'}</p>
                  </div>
                </div>

              </div>
            </div>

            <div className="p-4 rounded-xl bg-violet-600/5 border border-violet-500/10 text-[10px] text-slate-400 leading-relaxed font-sans mt-6">
              💡 <strong>Storage Persistency:</strong> Brand logos and variables are securely persisted inside the server's durable file system database and accessed via the server-side API.
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
