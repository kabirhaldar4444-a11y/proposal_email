/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, FileText, Download, Printer, X, Eye, 
  ChevronRight, Calculator, IndianRupee, Layers, CheckCircle2, AlertCircle, HelpCircle, ShieldAlert, Send 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { api } from '../lib/api';
import { Customer, Invoice, InvoiceStatus, InvoiceItem, CompanySettings } from '../types';

interface InvoiceBillingProps {
  customers: Customer[];
  onNotify: (message: string, type: 'success' | 'error') => void;
  onRefreshData: () => void;
  onEmailInvoice?: (invoiceId: string, customerId: string) => void;
}

// Typical enterprise program presets to speed up form creation and match exact sample details
interface Preset {
  programName: string;
  duration: string;
  price: number;
  gst: number;
  total: number;
}

const ACCREDITATION_PRESETS: Preset[] = [
  {
    programName: 'PfMP Core Certification Preparation',
    duration: '90 Days',
    price: 33474.58,
    gst: 5025.42,
    total: 38500.00
  },
  {
    programName: 'PgMP Professional Blueprint Course',
    duration: '90 Days',
    price: 33474.58,
    gst: 6025.42,
    total: 39500.00
  },
  {
    programName: 'PMP Training (Complementary Access)',
    duration: '90 Days',
    price: 0,
    gst: 0,
    total: 0
  }
];

export default function InvoiceBilling({ customers, onNotify, onRefreshData, onEmailInvoice }: InvoiceBillingProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form toggles
  const [isCreating, setIsCreating] = useState(false);
  const [previewingInvoice, setPreviewingInvoice] = useState<Invoice | null>(null);

  // New Invoice Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>(InvoiceStatus.PENDING);
  const [sponsorshipAmount, setSponsorshipAmount] = useState<number>(39500.00); // Standard demo default
  const [invoiceItems, setInvoiceItems] = useState<Array<Omit<InvoiceItem, 'id' | 'invoiceId' | 'total'>>>([
    { programName: 'PfMP Core Certification Preparation', duration: '90 Days', price: 33474.58, gst: 5025.42 },
    { programName: 'PgMP Professional Blueprint Course', duration: '90 Days', price: 33474.58, gst: 6025.42 },
    { programName: 'PMP Training (Complementary Access)', duration: '90 Days', price: 0, gst: 0 }
  ]);

  const fetchInvoicesAndSettings = async () => {
    setLoading(true);
    try {
      const [invoiceList, branding] = await Promise.all([
        api.invoices.list(),
        api.settings.get()
      ]);
      setInvoices(invoiceList);
      setSettings(branding);
    } catch (err: any) {
      onNotify('Failed to retrieve invoices ledger.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoicesAndSettings();
  }, []);

  // Matrix calculations
  const calculatedGrandTotal = invoiceItems.reduce((sum, item) => sum + (Number(item.price) || 0) + (Number(item.gst) || 0), 0);
  const calculatedPayable = Math.max(0, calculatedGrandTotal - (Number(sponsorshipAmount) || 0));

  const handleAddRow = () => {
    setInvoiceItems([...invoiceItems, { programName: '', duration: '90 Days', price: 0, gst: 0 }]);
  };

  const handleApplyPreset = (index: number, presetIndex: number) => {
    const preset = ACCREDITATION_PRESETS[presetIndex];
    const update = [...invoiceItems];
    update[index] = {
      programName: preset.programName,
      duration: preset.duration,
      price: preset.price,
      gst: preset.gst
    };
    setInvoiceItems(update);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const update = [...invoiceItems];
    const current = { ...update[index], [field]: value };
    
    // Auto-compute GST if they edit price fields manually
    if (field === 'price') {
      const priceVal = Number(value) || 0;
      current.gst = Math.round(priceVal * 0.15012 * 100) / 100; // Recalculate based on demo preset ratio
    }
    
    update[index] = current;
    setInvoiceItems(update);
  };

  const handleRemoveRow = (index: number) => {
    if (invoiceItems.length === 1) {
      onNotify('Your invoice must designate at least one billing item.', 'error');
      return;
    }
    const update = [...invoiceItems];
    update.splice(index, 1);
    setInvoiceItems(update);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      onNotify('You must choose an associated customer account record.', 'error');
      return;
    }

    try {
      await api.invoices.create({
        customerId: selectedCustomerId,
        items: invoiceItems,
        sponsorshipAmount: Number(sponsorshipAmount) || 0,
        status: invoiceStatus
      });
      
      onNotify('Invoice successfully generated and logged in database.', 'success');
      setIsCreating(false);
      fetchInvoicesAndSettings();
      onRefreshData();
    } catch (err: any) {
      onNotify(err.message || 'Error occurred writing invoice object.', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: string) => {
    try {
      await api.invoices.updateStatus(id, nextStatus);
      onNotify('Payment clearance status successfully updated.', 'success');
      fetchInvoicesAndSettings();
      onRefreshData();
    } catch (err: any) {
      onNotify('Error updating payment status.', 'error');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice? Related records may become unlinked.')) {
      return;
    }

    try {
      await api.invoices.delete(id);
      onNotify('Invoice successfully deleted.', 'success');
      fetchInvoicesAndSettings();
      onRefreshData();
    } catch (err: any) {
      onNotify('Failed to delete invoice.', 'error');
    }
  };

  // PDF Export Engine with beautiful typography
  const handleDownloadPDF = (invoice: Invoice) => {
    const cust = customers.find(c => c.id === invoice.customerId) || {
      id: 'deleted',
      name: 'Corporate Client',
      email: 'client@company.com',
      companyName: 'N/A',
      phone: 'N/A',
      address: 'N/A'
    };

    const brand = settings || {
      companyName: 'InvoiceMailer Pro Solutions',
      companyPhone: '+91 80001 09999',
      companyEmail: 'finance@invoicemailer.pro',
      website: 'www.invoicemailer.pro',
      footerText: 'Standard automated billing payload terms.',
      emailSignature: 'Operations Desk'
    };

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Outer framing styling
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 15, 'F');

    // Title Coordinate
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(brand.companyName.toUpperCase(), 15, 10);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text('OFFICIAL BILLING DOCUMENT', 165, 10);

    // Sender details header Block
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.text('ISSUED FROM:', 15, 30);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text([
      brand.companyName,
      `Phone: ${brand.companyPhone}`,
      `Email: ${brand.companyEmail}`,
      `Web: ${brand.website}`
    ], 15, 35);

    // Bill To customer details Block
    doc.setTextColor(71, 85, 105);
    doc.setFont('Helvetica', 'bold');
    doc.text('BILL TO CLIENT:', 115, 30);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text([
      cust.name,
      `Company: ${cust.companyName}`,
      `Email: ${cust.email}`,
      `Phone: ${cust.phone || 'N/A'}`,
      `Client ID: ${cust.id}`
    ], 115, 35);

    // Invoice Meta line
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 62, 180, 14, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, 62, 180, 14, 'S');

    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.text(`INVOICE ID: #${invoice.id.toUpperCase()}`, 18, 71);
    doc.text(`DATED: ${new Date(invoice.createdAt).toLocaleDateString()}`, 85, 71);
    doc.text(`STATUS: ${invoice.status.toUpperCase()}`, 155, 71);

    // Table Line Items list
    doc.setFontSize(9);
    doc.setFillColor(226, 232, 240);
    doc.rect(15, 85, 180, 8, 'F'); // Headers backing
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.text('ITEM CONTEXT / DISCIPLINE', 18, 90);
    doc.text('DURATION', 95, 90);
    doc.text('NET PRICE', 125, 90);
    doc.text('GST (18%)', 152, 90);
    doc.text('TOTAL', 180, 90);

    let startY = 100;
    doc.setFont('Helvetica', 'normal');
    invoice.items.forEach((item, idx) => {
      // Background shading on alternate lines
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, startY - 4, 180, 8, 'F');
      }

      doc.text(item.programName.substring(0, 42), 18, startY);
      doc.text(item.duration, 95, startY);
      doc.text(`INR ${item.price.toLocaleString()}`, 125, startY);
      doc.text(`INR ${item.gst.toLocaleString()}`, 152, startY);
      doc.text(`INR ${item.total.toLocaleString()}`, 180, startY);
      startY += 10;
    });

    // Summary calculations block
    doc.setDrawColor(203, 213, 225);
    doc.line(115, startY - 2, 195, startY - 2);

    doc.setFont('Helvetica', 'normal');
    doc.text('GRAND COMBINED TOTAL:', 115, startY + 5);
    doc.text(`INR ${invoice.grandTotal.toLocaleString()}`, 175, startY + 5);

    doc.text('SPONSORSHIP DISCOUNT:', 115, startY + 11);
    doc.text(`- INR ${invoice.sponsorshipAmount.toLocaleString()}`, 175, startY + 11);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(124, 58, 237); // Royal Violet
    doc.text('TOTAL NET PAYABLE:', 115, startY + 18);
    doc.text(`INR ${invoice.payableAmount.toLocaleString()}`, 175, startY + 18);

    // Disclaimer Policy details
    const policyBoxY = Math.max(startY + 32, 160);
    doc.setFillColor(248, 250, 252);
    doc.rect(15, policyBoxY, 180, 25, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('Helvetica', 'normal');
    doc.text([
      'Terms of Accreditancy Agreement:',
      '1. Invoices are dispatched to associated customer portals automatically on execution.',
      '2. Program prices include custom standard Central Service Tax calculations according to regional profiles.',
      brand.footerText
    ], 18, policyBoxY + 6);

    // Save action execution
    doc.save(`invoice_${invoice.id}.pdf`);
    onNotify(`Downloaded invoice_${invoice.id}.pdf successfully!`, 'success');
  };

  // Browser print window trigger
  const handlePrint = (invoiceId: string) => {
    window.print();
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Billing & Invoices</h1>
          <p className="text-slate-400 text-xs mt-1">Manage corporate itemized courses, sponsorship rebates, and invoice downloads.</p>
        </div>

        <button
          onClick={() => {
            setInvoiceItems([
              { programName: 'PfMP Core Certification Preparation', duration: '90 Days', price: 33474.58, gst: 5025.42 },
              { programName: 'PgMP Professional Blueprint Course', duration: '90 Days', price: 33474.58, gst: 6025.42 },
              { programName: 'PMP Training (Complementary Access)', duration: '90 Days', price: 0, gst: 0 }
            ]);
            setSponsorshipAmount(39500.00);
            setSelectedCustomerId('');
            setIsCreating(!isCreating);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/10 cursor-pointer"
        >
          {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isCreating ? 'Dismiss Creator' : 'Create New Invoice'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isCreating ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6"
          >
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
              <Calculator className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-bold text-white">Dynamic Itemized Billing Builder</h3>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-6">
              
              {/* Client Selection Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Select customer */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Link Customer Profile *</label>
                  <select
                    value={selectedCustomerId}
                    required
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 cursor-pointer"
                  >
                    <option value="">-- Choose Corporate Customer profile --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-950">
                        {c.name} ({c.companyName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Column */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Initial Clearance Status</label>
                  <div className="flex gap-4">
                    {['Pending', 'Paid'].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setInvoiceStatus(st as InvoiceStatus)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          invoiceStatus === st
                            ? st === 'Paid'
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                              : 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${st === 'Paid' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Programs and lines matrix */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Line Items (Programs List)</span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="text-violet-400 hover:text-violet-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Insert Custom Line
                  </button>
                </div>

                {/* Grid items container */}
                <div className="space-y-4">
                  {invoiceItems.map((item, index) => (
                    <div 
                      key={index} 
                      className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 flex flex-col gap-4 relative"
                    >
                      {/* Presets Quick-Selector Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mr-1">Load Preset:</span>
                        {ACCREDITATION_PRESETS.map((p, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleApplyPreset(index, pIdx)}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-full px-2.5 py-1 text-[10px] text-slate-400 hover:text-white transition-all cursor-pointer"
                          >
                            {p.programName.split(' ')[0]} (₹{p.total.toLocaleString()})
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        {/* Name field */}
                        <div className="md:col-span-5 space-y-1">
                          <input
                            type="text"
                            required
                            placeholder="Accreditation Program / Unit Name"
                            value={item.programName}
                            onChange={(e) => handleUpdateItem(index, 'programName', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>

                        {/* Duration field */}
                        <div className="md:col-span-2 space-y-1">
                          <input
                            type="text"
                            placeholder="Duration e.g. 90 Days"
                            value={item.duration}
                            onChange={(e) => handleUpdateItem(index, 'duration', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 text-center focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>

                        {/* Base Price field */}
                        <div className="md:col-span-2 space-y-1 relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs text-slate-400">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={item.price}
                            onChange={(e) => handleUpdateItem(index, 'price', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-6 pr-2 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                          />
                        </div>

                        {/* GST Price field */}
                        <div className="md:col-span-2 space-y-1 relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs text-slate-400">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="GST"
                            value={item.gst}
                            onChange={(e) => handleUpdateItem(index, 'gst', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-6 pr-2 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                          />
                        </div>

                        {/* Total indicator & action trash */}
                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Remove Line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-calculation Summary totals block */}
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 relative">
                <div className="absolute top-4 right-4 p-2 bg-violet-600/10 rounded-xl text-violet-400 hidden sm:block">
                  <IndianRupee className="w-5 h-5 animate-pulse" />
                </div>

                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-violet-400" />
                  Consolidated Summary Matrix
                </h4>

                <div className="space-y-3 max-w-sm ml-auto text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Aggregate Grand Total:</span>
                    <span className="font-mono text-slate-300">₹{calculatedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400">
                    <span>Sponsorship Coupon Reduction:</span>
                    <div className="relative w-32">
                      <span className="absolute left-2 top-11 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">₹</span>
                      <input
                        type="number"
                        value={sponsorshipAmount}
                        onChange={(e) => setSponsorshipAmount(Number(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 pl-5 pr-2 py-1.5 rounded-lg text-xs font-semibold font-mono text-emerald-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <hr className="border-slate-800 my-2" />

                  <div className="flex justify-between text-base font-bold">
                    <span className="text-white">Net Payable Amount:</span>
                    <span className="text-violet-400 font-mono">₹{calculatedPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Form Controls submit Row */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-5 py-2.5 border border-slate-800 rounded-xl text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
                >
                  Discard Draft
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-violet-500/10 cursor-pointer animate-none"
                >
                  Validate & Generate Invoice
                </button>
              </div>

            </form>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="overflow-x-auto bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl"
          >
            <table className="w-full border-collapse text-left text-xs min-w-[700px]">
              <thead className="bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-850">
                <tr>
                  <th className="py-3.5 px-5">Invoice Reference</th>
                  <th className="py-3.5 px-5">Linked Customer</th>
                  <th className="py-3.5 px-5">Grand Total (Preset)</th>
                  <th className="py-3.5 px-5">Sponsorship Limit</th>
                  <th className="py-3.5 px-5">Net Payable</th>
                  <th className="py-3.5 px-5">Clearance State</th>
                  <th className="py-3.5 px-5">Issued Date</th>
                  <th className="py-3.5 px-5 text-right">Statements Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      No billing invoices recorded. Create one to get started!
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const linkedCust = customers.find(c => c.id === inv.customerId) || { name: 'Customer Deleted', companyName: 'N/A' };
                    return (
                      <tr key={inv.id} className="hover:bg-slate-950/10 transition-colors">
                        <td className="py-4 px-5 font-mono text-white text-xs uppercase">
                          #{inv.id}
                        </td>
                        <td className="py-4 px-5">
                          <div className="font-semibold text-white">{linkedCust.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{linkedCust.companyName}</div>
                        </td>
                        <td className="py-4 px-5 font-mono">
                          ₹{inv.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-5 font-mono text-emerald-400">
                          ₹{inv.sponsorshipAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-5 font-mono text-violet-400 font-bold">
                          ₹{inv.payableAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-5">
                          <select
                            value={inv.status}
                            onChange={(e) => handleUpdateStatus(inv.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold border bg-slate-950 cursor-pointer ${
                              inv.status === 'Paid'
                                ? 'border-emerald-500/35 text-emerald-400'
                                : inv.status === 'Cancelled'
                                  ? 'border-rose-500/35 text-rose-400'
                                  : 'border-amber-500/35 text-amber-400'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-4 px-5 text-slate-400">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-5 text-right flex justify-end gap-1.5 mt-1.5">
                          {onEmailInvoice && (
                            <button
                              onClick={() => onEmailInvoice(inv.id, inv.customerId)}
                              className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-colors cursor-pointer"
                              title="Email Invoice to Customer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => setPreviewingInvoice(inv)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-705 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Preview Invoice Workspace"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDownloadPDF(inv)}
                            className="p-1.5 rounded-lg bg-violet-600/15 hover:bg-violet-600 text-violet-400 hover:text-white transition-all cursor-pointer"
                            title="Download Official PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-slate-400 hover:text-white transition-all cursor-pointer"
                            title="Delete Records"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Virtual Preview Frame Modal */}
      <AnimatePresence>
        {previewingInvoice && (
          <div className="fixed inset-0 bg-[#06080e]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Heading */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-950/20">
                <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-violet-400" />
                  PDF Statement Workspace
                </span>
                <button
                  onClick={() => setPreviewingInvoice(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Receipt workspace body */}
              <div id="print-invoice-canvas" className="p-8 overflow-y-auto space-y-6 font-sans text-xs bg-white text-slate-900">
                {/* PDF styled sheet inside */}
                <div className="flex justify-between items-start pb-6 border-b border-light-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950 leading-none uppercase tracking-wide">{settings?.companyName || 'INVOICEMAILER PRO'}</h2>
                    <p className="text-[10px] text-slate-500 mt-1">{settings?.companyPhone} | {settings?.companyEmail}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{settings?.website}</p>
                  </div>
                  
                  <div className="text-right">
                    <span className="bg-violet-600 text-white font-mono font-bold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Invoice Ref
                    </span>
                    <h4 className="font-mono font-semibold text-xs mt-2 uppercase text-slate-950">ID: #{previewingInvoice.id}</h4>
                    <p className="text-[9px] text-slate-500 mt-0.5">Dated: {new Date(previewingInvoice.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <h5 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest leading-none mb-2">Billing Corporate Client</h5>
                    <p className="font-semibold text-slate-900 text-xs">
                      {customers.find(c => c.id === previewingInvoice.customerId)?.name || 'N/A'}
                    </p>
                    <p className="text-slate-500 mt-0.5 font-medium">{customers.find(c => c.id === previewingInvoice.customerId)?.companyName}</p>
                    <p className="text-slate-500 font-mono mt-0.5">{customers.find(c => c.id === previewingInvoice.customerId)?.email}</p>
                  </div>
                  <div className="text-right">
                    <h5 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest leading-none mb-2">Statement Status</h5>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono inline-block capitalize ${
                      previewingInvoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {previewingInvoice.status}
                    </span>
                  </div>
                </div>

                {/* Items layout */}
                <table className="w-full text-left font-sans text-[11px] select-none border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <th className="py-2 px-3 pl-3">Designation / Course Accreditation</th>
                      <th className="py-2 px-3">Duration</th>
                      <th className="py-2 px-3">Base Price</th>
                      <th className="py-2 px-3">GST (18%)</th>
                      <th className="py-2 px-3 text-right pr-3">Total Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {previewingInvoice.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 pl-3 text-slate-900 font-semibold">{item.programName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{item.duration}</td>
                        <td className="py-2.5 px-3 font-mono">₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">₹{item.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2.5 px-3 text-right pr-3 font-mono font-bold text-slate-950">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Combined totals summaries */}
                <div className="flex justify-end pt-4">
                  <div className="w-[280px] space-y-2 border-t border-slate-200 pt-3 text-[11px] font-medium text-slate-600">
                    <div className="flex justify-between">
                      <span>Combined Grand Total:</span>
                      <span className="font-mono text-slate-900">₹{previewingInvoice.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Accredited Sponsorship Discount:</span>
                      <span className="font-mono">- ₹{previewingInvoice.sponsorshipAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <hr className="border-slate-100" />
                    <div className="flex justify-between text-base font-bold text-slate-950 pt-1">
                      <span>Aggregate Total Payable:</span>
                      <span className="text-violet-700 font-mono">₹{previewingInvoice.payableAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="pt-6 border-t border-slate-100 text-[10px] text-slate-400 italic">
                  <p className="font-bold text-slate-500 uppercase tracking-widest not-italic leading-none mb-1 text-[8px]">Notice & Terms</p>
                  <p>{settings?.footerText}</p>
                </div>
              </div>

              {/* Buttons controls */}
              <div className="p-4 border-t border-slate-800/80 bg-slate-900 flex justify-end gap-3 flex-shrink-0">
                <button
                  onClick={() => setPreviewingInvoice(null)}
                  className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-white text-xs hover:bg-slate-950 cursor-pointer"
                >
                  Close Workspace
                </button>

                <button
                  onClick={() => { previewingInvoice && handleDownloadPDF(previewingInvoice); }}
                  className="px-4 py-2 bg-gradient-to-tr from-violet-600 to-indigo-600 text-white hover:opacity-90 font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
