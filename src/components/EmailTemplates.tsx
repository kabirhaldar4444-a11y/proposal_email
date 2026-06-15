/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit3, Trash2, Copy, Eye, X, Tag, FileText, Sparkles, 
  ChevronRight, ArrowRight, Layers, Layout, HelpCircle, Code 
} from 'lucide-react';
import { api } from '../lib/api';
import { EmailTemplate, CompanySettings } from '../types';

interface EmailTemplatesProps {
  onNotify: (message: string, type: 'success' | 'error') => void;
  onRefreshData: () => void;
}

interface VariableToken {
  token: string;
  label: string;
  mockValue: string;
}

const VARIABLE_TOKENS: VariableToken[] = [
  { token: '{{customer_name}}', label: 'Customer Name', mockValue: 'Rahul Sharma' },
  { token: '{{customer_email}}', label: 'Customer Email', mockValue: 'rahul.sharma@vertex-corp.io' },
  { token: '{{customer_phone}}', label: 'Customer Phone', mockValue: '+91 98765 43210' },
  { token: '{{company_name}}', label: 'Client Company', mockValue: 'Vertex Tech Corp' },
  { token: '{{program_name}}', label: 'Program Name', mockValue: 'PfMP Prep Course' },
  { token: '{{program_list}}', label: 'Accreditation List', mockValue: 'PfMP Certification Prep (90 Days - ₹38,500), PgMP Course (90 Days - ₹39,500)' },
  { token: '{{invoice_total}}', label: 'Invoice Total Amount', mockValue: '79000.00' },
  { token: '{{sponsorship_amount}}', label: 'Sponsorship Discount', mockValue: '39500.00' },
  { token: '{{payable_amount}}', label: 'Total Payable Amount', mockValue: '39500.00' },
  { token: '{{company_phone}}', label: 'Your Company Phone', mockValue: '+91 80001 09999' },
  { token: '{{company_email}}', label: 'Your Company Email', mockValue: 'finance@invoicemailer.pro' },
  { token: '{{company_website}}', label: 'Your Website', mockValue: 'invoicemailer.pro' },
  { token: '{{current_date}}', label: 'Receipt Date', mockValue: '08/06/2026' }
];

export default function EmailTemplates({ onNotify, onRefreshData }: EmailTemplatesProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [branding, setBranding] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form tab toggles
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  // Form variables
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState('Billing');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');

  // Sandbox Live Preview substitution state override
  const [activePreviewTemplate, setActivePreviewTemplate] = useState<EmailTemplate | null>(null);

  const fetchTemplatesAndBranding = async () => {
    setLoading(true);
    try {
      const [list, settings] = await Promise.all([
        api.templates.list(),
        api.settings.get()
      ]);
      setTemplates(list);
      setBranding(settings);
    } catch (err) {
      onNotify('Failed to retrieve templates.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplatesAndBranding();
  }, []);

  const handleOpenCreate = () => {
    setTemplateName('');
    setCategory('Billing');
    setSubject('Invoice #{{payable_amount}} Generated - Important Package');
    setHtmlContent(`Dear <strong>{{customer_name}}</strong>,

We are pleased to share your invoice of <strong>₹{{payable_amount}}</strong> for <strong>{{program_name}}</strong>.

Please login to your customer dashboard to download your printable PDF:
- Client: {{company_name}}
- Total Billings: ₹{{invoice_total}}
- Sponsorship Covered: ₹{{sponsorship_amount}}
- Net Payable: ₹{{payable_amount}}

We look forward to guiding your education credentials.

{{email_signature}}`);
    setEditingTemplate(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (temp: EmailTemplate) => {
    setTemplateName(temp.templateName);
    setCategory(temp.category);
    setSubject(temp.subject);
    setHtmlContent(temp.htmlContent);
    setEditingTemplate(temp);
    setIsEditing(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) {
      return;
    }
    try {
      await api.templates.delete(id);
      onNotify('Template successfully removed.', 'success');
      fetchTemplatesAndBranding();
      onRefreshData();
    } catch (err) {
      onNotify('Error deleting template.', 'error');
    }
  };

  const handleDuplicate = async (id: string, name: string) => {
    try {
      await api.templates.duplicate(id);
      onNotify(`Duplicated "${name}" template successfully.`, 'success');
      fetchTemplatesAndBranding();
      onRefreshData();
    } catch (err) {
      onNotify('Error duplicating template.', 'error');
    }
  };

  const handleInsertToken = (token: string) => {
    // Append Token to text content
    setHtmlContent(prev => prev + ' ' + token);
    onNotify(`Inserted variable tag: ${token}`, 'success');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || !subject || !htmlContent) {
      onNotify('Please fill in all template subject and html details.', 'error');
      return;
    }

    try {
      if (editingTemplate) {
        await api.templates.update(editingTemplate.id, {
          templateName,
          category,
          subject,
          htmlContent
        });
        onNotify('Template updated successfully.', 'success');
      } else {
        await api.templates.create({
          templateName,
          category,
          subject,
          htmlContent
        });
        onNotify('Template created and categorized in workspace.', 'success');
      }
      setIsEditing(false);
      fetchTemplatesAndBranding();
      onRefreshData();
    } catch (err) {
      onNotify('Failed to save document template.', 'error');
    }
  };

  // Render mock variables replacement for interactive iframe live view previewing
  const getRenderedPreviewHTML = (template: EmailTemplate) => {
    if (!template) return '';
    let renderedSubject = template.subject;
    let renderedBody = template.htmlContent;

    // Run string substitutions using VARIABLE_TOKENS mapping
    VARIABLE_TOKENS.forEach(tok => {
      const rx = new RegExp(tok.token.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'gi');
      renderedSubject = renderedSubject.replace(rx, tok.mockValue);
      renderedBody = renderedBody.replace(rx, tok.mockValue);
    });

    // Replace signatures and global branding variables
    renderedBody = renderedBody.replace(/{{email_signature}}/gi, branding?.emailSignature || 'Finance Ops Team');

    return `
      <html>
        <body style="margin:0; padding:15px; font-family:'Inter',system-ui,sans-serif; background-color:#F8FAFC; color:#1e293b;">
          <div style="background-color:#ffffff; max-width:550px; margin:0 auto; border-radius:10px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="background:linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); padding:20px; text-align:center;">
              <img src="${branding?.logoUrl}" style="max-height:36px; border-radius:4px; padding:3px; background-color:white; display:inline-block;" />
              <h2 style="color:white; margin:8px 0 0 0; font-size:1.15rem; text-align:center; font-weight:600;">${branding?.companyName}</h2>
            </div>
            <div style="padding:24px; line-height:1.6; font-size:13px;">
              <p style="margin-top:0; font-weight:bold; color:#0f172a; border-bottom:1px solid #f1f5f9; padding-bottom:8px; margin-bottom:16px;">
                Subject: ${renderedSubject}
              </p>
              ${renderedBody.replace(/\n/g, '<br/>')}
            </div>
            <div style="background-color:#f8fafc; padding:15px; text-align:center; font-size:10px; color:#64748b; border-top:1px solid #e2e8f0;">
              <p style="margin:0; font-weight:600;">${branding?.companyName}</p>
              <p style="margin:4px 0 0 0;">${branding?.footerText}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Tab bar header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Email Templates</h1>
          <p className="text-slate-400 text-xs mt-1">Crate and duplicate custom formatted layout modules with variable attributes insertion.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Template
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Form configuration panel Left Column */}
            <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Layout className="w-4 h-4 text-violet-400" />
                  {editingTemplate ? `Modify: ${editingTemplate.templateName}` : 'Add Template to Framework'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Template Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Course Enrollment Package"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Category / Grouping</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-400 focus:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                    >
                      <option value="Billing">Billing</option>
                      <option value="Onboarding">Onboarding</option>
                      <option value="Operational">Operational</option>
                      <option value="Marketing">Marketing</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Subject Headline *</label>
                  <input
                    type="text"
                    required
                    placeholder="We're glad to welcome you to the {{program_name}} accreditation!"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>

                {/* Insertion chips framework container */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Variable Insertion Chips (Smart Blocks Node)</span>
                  <p className="text-[10px] text-slate-500">Click any chip token below to insert dynamic variable templates fields into your editor.</p>
                  <div className="flex flex-wrap gap-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-850 max-h-[140px] overflow-y-auto">
                    {VARIABLE_TOKENS.map((tok, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInsertToken(tok.token)}
                        className="bg-slate-900 hover:bg-slate-850 hover:border-violet-500/40 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-300 font-mono flex items-center gap-1 cursor-pointer transition-all"
                        title={`Inserts placeholder replacement corresponding to actual customer values, e.g. "${tok.mockValue}"`}
                      >
                        <Tag className="w-2.5 h-2.5 text-violet-400" />
                        {tok.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">HTML Content / Body Frame *</label>
                  <textarea
                    required
                    rows={12}
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder="Provide standard corporate notifications details. Supported formatting tags: <strong> 🗣️, <p> 📄, etc."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-sans leading-relaxed"
                  />
                </div>

                {/* Form Controls submit Row */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-white text-xs hover:bg-slate-950 transition-colors cursor-pointer"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-violet-500/10 cursor-pointer"
                  >
                    Save Template Draft
                  </button>
                </div>
              </form>
            </div>

            {/* Split Screen Live view Right Column Panel */}
            <div className="lg:col-span-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 flex flex-col h-full sticky top-4">
              <div className="pb-4 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider block bg-violet-500/10 px-2 py-0.5 rounded-full w-max">Realtime Sandbox</span>
                  <h3 className="text-xs font-bold text-white tracking-tight mt-1">Inbox Render Preview</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Code className="w-3.5 h-3.5 text-slate-500" />
                  <span>Interactive Frame mockup</span>
                </div>
              </div>

              {/* Simulated Mobile Mockup screen body */}
              <div className="mt-5 border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden h-[420px] shadow-2xl flex flex-col select-none">
                {/* Header browser details bar */}
                <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center gap-2 flex-shrink-0">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="bg-slate-950 px-2.5 py-0.5 rounded-md border border-slate-850 text-[9px] text-slate-500 font-mono w-full text-center">
                    mock_envelope_headers_sandbox.local
                  </div>
                </div>

                {/* Substituted template Body iframe client container */}
                <div className="flex-1 overflow-auto bg-[#F8FAFC]">
                  <iframe
                    title="Live Template rendering"
                    srcDoc={getRenderedPreviewHTML({
                      id: 'preview',
                      templateName: templateName || 'Preview Form',
                      category: category || 'General',
                      subject: subject || 'N/A',
                      htmlContent: htmlContent || '<p>Configure editor on the left to review HTML...</p>',
                      createdAt: new Date().toISOString()
                    })}
                    className="w-full h-full border-none"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>

              <div className="mt-4 p-3.5 rounded-xl bg-violet-600/5 border border-violet-500/10 text-[10px] text-slate-400 leading-relaxed font-sans">
                💡 <strong>Replacements Mechanics:</strong> Variables inside curly brackets tags (e.g. <code className="text-violet-300">{"{{customer_name}}"}</code>) will be parsed and evaluated using exact customer files on the actual email dispatch step under the hood.
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {templates.length === 0 ? (
              <div className="col-span-full py-16 text-center border border-slate-800 bg-slate-900/5 rounded-2xl">
                <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">No template formats exist. Click Create Template to expand choices.</p>
              </div>
            ) : (
              templates.map((temp) => (
                <motion.div
                  key={temp.id}
                  whileHover={{ y: -2 }}
                  className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between group transition-all duration-300 relative overflow-hidden shadow-xl"
                >
                  <div>
                    {/* Header Details */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-violet-600/10 border border-violet-500/10 text-violet-400 font-semibold px-2 py-0.5 rounded-lg font-mono">
                          {temp.category}
                        </span>
                      </div>

                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDuplicate(temp.id, temp.templateName)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Duplicate/Copy layout"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(temp)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Edit Layout details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(temp.id, temp.templateName)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Delete Template format"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Content */}
                    <h3 className="text-xs font-bold text-white truncate group-hover:text-violet-400 transition-colors leading-none">{temp.templateName}</h3>
                    <p className="text-[10px] text-slate-500 mt-2 truncate font-medium">Subject: <span className="text-slate-400 font-mono">{temp.subject}</span></p>

                    <div className="mt-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850/40 text-[10px] text-slate-400 font-mono font-medium line-clamp-3 h-14 whitespace-pre-wrap leading-relaxed">
                      {temp.htmlContent.replace(/<[^>]*>/g, '')}
                    </div>
                  </div>

                  {/* Actions bar bottom row */}
                  <div className="flex justify-between items-center border-t border-slate-800/40 pt-3.5 mt-4">
                    <span className="text-[9px] text-slate-600 font-mono">Created on: {new Date(temp.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => setActivePreviewTemplate(temp)}
                      className="text-[10px] font-semibold text-violet-400 group-hover:text-violet-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      Real Preview
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pop Up Sandbox Viewer Dialog for templates records */}
      <AnimatePresence>
        {activePreviewTemplate && (
          <div className="fixed inset-0 bg-[#06080e]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center flex-shrink-0">
                <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-violet-400" />
                  Pre-visualize: {activePreviewTemplate.templateName}
                </span>

                <button
                  onClick={() => setActivePreviewTemplate(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Viewer iframe wrap container */}
              <div className="p-6 overflow-auto bg-slate-950 flex justify-center">
                <div className="w-full max-w-lg border border-slate-800/80 rounded-2xl overflow-hidden h-[420px] bg-slate-900 shadow-xl">
                  <iframe
                    title="Pop up viewer template simulation"
                    srcDoc={getRenderedPreviewHTML(activePreviewTemplate)}
                    className="w-full h-full border-none"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>

              {/* Overlay controls close */}
              <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActivePreviewTemplate(null)}
                  className="px-5 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-white text-xs hover:bg-slate-950 cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
