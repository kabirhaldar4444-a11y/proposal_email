/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Search, Mail, Calendar, Eye, FileText, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { EmailLog } from '../types';

interface EmailHistoryProps {
  emails: EmailLog[];
  onNotify: (message: string, type: 'success' | 'error') => void;
}

export default function EmailHistory({ emails, onNotify }: EmailHistoryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedLogForPreview, setSelectedLogForPreview] = useState<EmailLog | null>(null);

  // Apply filtration
  const filteredEmails = emails.filter(em => {
    const matchesSearch = 
      em.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      em.email.toLowerCase().includes(search.toLowerCase()) ||
      em.subject.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = 
      statusFilter === 'All' || 
      em.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 select-none">
      
      {/* Top Banner */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Outbound Delivery Logs</h1>
        <p className="text-slate-400 text-xs mt-1">Audit trail of automated email dispatch envelopes and client links.</p>
      </div>

      {/* Filters Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/20 backdrop-blur-md p-4 rounded-2xl border border-slate-800/60 shadow-xl">
        {/* Search */}
        <div className="md:col-span-3 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search email records by recipient name, email domain, or subject line..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        {/* Status filtration */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-slate-400 focus:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer appearance-none"
          >
            <option value="All" className="bg-slate-900 text-white">Status: All Envelopes</option>
            <option value="Delivered" className="bg-slate-900 text-emerald-400 font-bold">Status: Delivered</option>
            <option value="Sent" className="bg-slate-900 text-indigo-400 font-bold">Status: Sent</option>
            <option value="Failed" className="bg-slate-900 text-rose-400 font-bold">Status: Failed</option>
          </select>
        </div>
      </div>

      {/* Primary table */}
      <div className="overflow-x-auto bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl">
        <table className="w-full border-collapse text-left text-xs min-w-[700px]">
          <thead className="bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-850">
            <tr>
              <th className="py-3.5 px-5">Recipient</th>
              <th className="py-3.5 px-5">Subject Header</th>
              <th className="py-3.5 px-5 key">Linked Reference</th>
              <th className="py-3.5 px-5">Template Engine</th>
              <th className="py-3.5 px-5">Gate Status</th>
              <th className="py-3.5 px-5">Dispatched Date</th>
              <th className="py-3.5 px-5 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-300">
            {filteredEmails.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-500 font-medium">
                  <Mail className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  No delivery dispatch matching search parameters found.
                </td>
              </tr>
            ) : (
              filteredEmails.map((log) => (
                <tr key={log.id} className="hover:bg-slate-950/10 transition-colors">
                  <td className="py-4 px-5">
                    <div className="font-semibold text-white">{log.customerName}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.email}</div>
                  </td>
                  <td className="py-4 px-5 truncate max-w-xs font-medium">
                    {log.subject}
                  </td>
                  <td className="py-4 px-5 font-mono uppercase text-indigo-400 font-bold">
                    #{log.invoiceId}
                  </td>
                  <td className="py-4 px-5 text-slate-400">
                    {log.templateName || 'Manual Custom Draft'}
                  </td>
                  <td className="py-4 px-5">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono leading-none font-bold border inline-flex items-center gap-1 ${
                      log.status === 'Delivered'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : log.status === 'Sent'
                          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${
                        log.status === 'Delivered' ? 'bg-emerald-400' : log.status === 'Sent' ? 'bg-indigo-400' : 'bg-rose-400'
                      }`} />
                      {log.status}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-slate-400 font-mono">
                    {new Date(log.sentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </td>
                  <td className="py-4 px-5 text-right flex justify-end gap-1.5 mt-1.5">
                    <button
                      onClick={() => setSelectedLogForPreview(log)}
                      className="p-1.5 rounded-lg bg-slate-880 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                      title="Inspect Envelope Contents"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Inspect Envelope Dialog Popup */}
      {selectedLogForPreview && (
        <div className="fixed inset-0 bg-[#06080e]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center flex-shrink-0">
              <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-violet-400" />
                Ledger Egress Dispatch Audit [#{selectedLogForPreview.id}]
              </span>

              <button
                onClick={() => setSelectedLogForPreview(null)}
                className="p-1 px-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              <div className="space-y-2 border border-slate-800 p-4 rounded-xl bg-slate-950/50">
                <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-850">
                  Trace Details
                </h4>

                <div className="grid grid-cols-2 gap-y-2 text-slate-400 pt-2">
                  <span>Audited Recipient:</span>
                  <span className="text-white text-right">{selectedLogForPreview.customerName}</span>

                  <span>Recipient Mail Coordinate:</span>
                  <span className="text-white text-right font-mono">{selectedLogForPreview.email}</span>

                  <span>Egress Subject:</span>
                  <span className="text-white text-right truncate">{selectedLogForPreview.subject}</span>

                  <span>Dispatch Time:</span>
                  <span className="text-white text-right font-mono">{new Date(selectedLogForPreview.sentAt).toLocaleString()}</span>

                  <span>Gateway Link ID:</span>
                  <span className="text-indigo-400 text-right uppercase font-mono font-bold">#{selectedLogForPreview.invoiceId}</span>
                </div>
              </div>

              {/* Warning/Notes */}
              <div className="p-3 bg-violet-600/5 border border-violet-500/10 text-[10px] text-slate-400 leading-relaxed font-sans">
                💡 <strong>Historical Snapshot Note:</strong> This auditing module logs exact egress timestamps. For security compliance purposes, email dispatch logs are fully encrypted on the durable backend file.
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedLogForPreview(null)}
                className="px-5 py-2 bg-gradient-to-tr from-violet-600 to-indigo-600 text-white hover:opacity-90 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Finished Audit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
