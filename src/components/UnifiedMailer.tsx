/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, DollarSign, Mail, FileText, Settings, 
  Send, LogOut, Sparkles, X, Plus, Trash2, Printer, 
  Download, Copy, HelpCircle, Info, Percent, Gift, Award, Check, User as UserIcon, RefreshCw,
  Edit3, Tag
} from 'lucide-react';
import { api } from '../lib/api';
import { Customer, Invoice, EmailTemplate, EmailLog, User, CompanySettings, InvoiceItem, InvoiceStatus } from '../types';
import { jsPDF } from 'jspdf';

interface UnifiedMailerProps {
  theme?: 'dark' | 'light';
  onNotify: (message: string, type: 'success' | 'error') => void;
  user: User;
  onLogout: () => void;
  activeTab?: string;
  setActiveTab?: (tab: 'proposal' | 'templates' | 'customers' | 'logs' | 'settings') => void;
}

// Preset Course Options for rapid click-to-add row actions
interface ProgramPreset {
  programName: string;
  duration: string;
  price: number; // base rate excluding GST (total MRP / 1.18)
  gst: number;   // 18% GST auto-computed
  total: number; // Inclusive MRP total
}

const COURSE_PRESETS: ProgramPreset[] = [
  {
    programName: 'PfMP Core Certification Preparation',
    duration: '90 Days',
    price: 33474.58,
    gst: 6025.42,
    total: 39500.00
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
  },
  {
    programName: 'Confidence & Personality Boot camp',
    duration: '90 Days',
    price: 4237.29,
    gst: 762.71,
    total: 5000.00
  },
  {
    programName: 'Communication Mastery Course',
    duration: '90 Days',
    price: 8474.58,
    gst: 1525.42,
    total: 10000.00
  }
];

const DRAGGABLE_TOKENS = [
  { token: '{{customer_name}}', label: 'Customer Name' },
  { token: '{{customer_email}}', label: 'Customer Email' },
  { token: '{{company_name}}', label: 'Client Company' },
  { token: '{{invoice_table}}', label: 'Proposal Table' },
  { token: '{{invoice_total}}', label: 'Invoice Total' },
  { token: '{{sponsorship_amount}}', label: 'Sponsorship Discount' },
  { token: '{{payable_amount}}', label: 'Total Payable' },
  { token: '{{email_signature}}', label: 'Email Signature' },
  { token: '{{company_phone}}', label: 'Company Phone' },
  { token: '{{company_email}}', label: 'Company Email' }
];

export default function UnifiedMailer({ theme = 'dark', onNotify, user, onLogout, activeTab, setActiveTab }: UnifiedMailerProps) {
  // --- CORE STATE ---
  const handleDrop = (
    e: React.DragEvent<HTMLTextAreaElement | HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    e.preventDefault();
    const token = e.dataTransfer.getData('text/plain');
    if (!token) return;

    const target = e.currentTarget;
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const text = target.value;
    
    const newValue = text.substring(0, start) + token + text.substring(end);
    setter(newValue);
    
    // Set focus back and place cursor after inserted token
    setTimeout(() => {
      target.focus();
      const newPos = start + token.length;
      target.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const [historyPr, setHistoryPr] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  
  // Active Proposal Customer Inputs
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [designation, setDesignation] = useState('');
  const [address, setAddress] = useState('');

  // Course Rows Configurator State
  const [courseRows, setCourseRows] = useState<Array<{
    programName: string;
    duration: string;
    price: number; // Base rate excluding GST and Discount
    total: number; // Inclusive rate (Total Price entered by user)
    discountPercent: number; // individual discount %
    gstPercent: number; // individual GST %
  }>>([
    {
      programName: 'PfMP Core Certification Preparation',
      duration: '90 Days',
      price: 33474.58,
      total: 39500.00,
      discountPercent: 0,
      gstPercent: 18
    }
  ]);

  // Adjustments & Variable logic
  const [applySponsorship, setApplySponsorship] = useState<boolean>(false); // sponsorship is 50% only if selected, else don't show
  const [sponsorshipPercent, setSponsorshipPercent] = useState<number>(0); // Default 0 (becomes 50 when checked)
  const [grandDiscountValue, setGrandDiscountValue] = useState<number>(0);
  const [grandDiscountType, setGrandDiscountType] = useState<'percent' | 'value'>('percent');
  const [selectedTemplateId, setSelectedTemplateId] = useState('temp_isuccessnode_proposal');

  // Custom templates creator modal & form states
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateSubject, setNewTemplateSubject] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Clean Gmail clipboard copy direct integration state
  const [cleanGmailMode, setCleanGmailMode] = useState<boolean>(true); // strips out boilerplate headers/footers for a direct Ctrl+V paste

  // Custom Subject/Body Drafts
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingDirect, setIsSendingDirect] = useState(false);

  // Search/Filter for Bottom History
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Custom Corporate Branding Panel Modal State
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [branding, setBranding] = useState<CompanySettings>({
    companyName: 'I-SUCCESSNODE',
    companyPhone: '+91-7969325900',
    companyEmail: 'support@isuccessnode.com',
    website: 'www.isuccessnode.com',
    logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    footerText: 'This is an official training program proposal proposal from I-SUCCESSNODE (OPC) Private Limited. All terms are structured to maintain optimal service transparency.',
    emailSignature: 'Support Team'
  });

  // --- INITIAL DATA SYNC ---
  const syncWorkspaceData = async (silent = false) => {
    try {
      const [invList, custList, tempList, brandSettings] = await Promise.all([
        api.invoices.list(),
        api.customers.list(),
        api.templates.list(),
        api.settings.get()
      ]);
      setHistoryPr(invList);
      setCustomers(custList);
      setTemplates(tempList);
      if (brandSettings && brandSettings.companyName) {
        setBranding(brandSettings);
      }
      if (!silent) {
        onNotify('Workspace database loaded correctly.', 'success');
      }
    } catch (err) {
      console.error(err);
      onNotify('Offline storage loaded correctly.', 'success');
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      onNotify('Please enter a Template name.', 'error');
      return;
    }
    if (!newTemplateSubject.trim()) {
      onNotify('Please enter a Subject line.', 'error');
      return;
    }
    if (!newTemplateContent.trim()) {
      onNotify('Please enter some template HTML Content.', 'error');
      return;
    }

    try {
      if (editingTemplateId) {
        const updated = await api.templates.update(editingTemplateId, {
          templateName: newTemplateName.trim(),
          subject: newTemplateSubject.trim(),
          htmlContent: newTemplateContent.trim(),
          category: 'Custom'
        });
        setTemplates(prev => prev.map(t => t.id === editingTemplateId ? updated : t));
        setIsCreateTemplateOpen(false);
        setEditingTemplateId(null);
        
        // Clear forms
        setNewTemplateName('');
        setNewTemplateSubject('');
        setNewTemplateContent('');
        
        onNotify(`Template "${updated.templateName}" updated successfully!`, 'success');
      } else {
        const created = await api.templates.create({
          templateName: newTemplateName.trim(),
          subject: newTemplateSubject.trim(),
          htmlContent: newTemplateContent.trim(),
          category: 'Custom'
        });
        // Prepend to templates array
        setTemplates(prev => [created, ...prev]);
        setSelectedTemplateId(created.id);
        setIsCreateTemplateOpen(false);
        
        // Clear forms
        setNewTemplateName('');
        setNewTemplateSubject('');
        setNewTemplateContent('');
        
        onNotify(`Template "${created.templateName}" created and loaded successfully!`, 'success');
      }
    } catch (err) {
      onNotify('Failed to save template.', 'error');
    }
  };

  const handleOpenEditTemplate = (e: React.MouseEvent, t: EmailTemplate) => {
    e.stopPropagation();
    setEditingTemplateId(t.id);
    setNewTemplateName(t.templateName);
    setNewTemplateSubject(t.subject);
    setNewTemplateContent(t.htmlContent);
    setIsCreateTemplateOpen(true);
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) {
      return;
    }
    try {
      await api.templates.delete(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (selectedTemplateId === id) {
        const remaining = templates.filter(t => t.id !== id);
        if (remaining.length > 0) {
          setSelectedTemplateId(remaining[0].id);
        } else {
          setSelectedTemplateId('');
        }
      }
      onNotify('Template successfully removed.', 'success');
    } catch (err) {
      onNotify('Error deleting template.', 'error');
    }
  };

  useEffect(() => {
    syncWorkspaceData(true);
  }, []);

  // --- MATHEMATICAL ENGINE ---
  const courseRowsCalculated = courseRows.map(row => {
    const basePrice = Number(row.price) || 0;
    const discPct = Number(row.discountPercent) || 0;
    const gstPct = Number(row.gstPercent) || 0;

    const discAmt = basePrice * (discPct / 100);
    const discountedPrice = basePrice - discAmt;
    const gstAmt = discountedPrice * (gstPct / 100);
    const totalVal = discountedPrice + gstAmt;

    return {
      ...row,
      discountAmount: Math.round(discAmt * 100) / 100,
      discountedPrice: Math.round(discountedPrice * 100) / 100,
      gstAmount: Math.round(gstAmt * 100) / 100,
      total: Math.round(totalVal * 100) / 100
    };
  });

  const rawBaseSubtotal = courseRowsCalculated.reduce((sum, item) => sum + item.price, 0);
  const discountReductionAmount = courseRowsCalculated.reduce((sum, item) => sum + item.discountAmount, 0);
  const discountedBaseTotal = courseRowsCalculated.reduce((sum, item) => sum + item.discountedPrice, 0);
  const calculatedGstValue = courseRowsCalculated.reduce((sum, item) => sum + item.gstAmount, 0);
  const computedGrandTotal = courseRowsCalculated.reduce((sum, item) => sum + item.total, 0);

  // Grand total level discount logic
  const grandDiscountAmount = grandDiscountType === 'percent'
    ? Math.round(computedGrandTotal * (grandDiscountValue / 100) * 100) / 100
    : Math.min(computedGrandTotal, grandDiscountValue);

  const grandDiscountPercent = grandDiscountType === 'percent'
    ? grandDiscountValue
    : (computedGrandTotal > 0 ? Math.round((grandDiscountAmount / computedGrandTotal) * 100) : 0);

  const grandDiscountLabel = grandDiscountType === 'percent'
    ? `Grand Discount (${grandDiscountPercent}%)`
    : `Grand Discount (₹${grandDiscountValue.toLocaleString('en-IN')})`;

  const grandTotalAfterDiscount = Math.max(0, computedGrandTotal - grandDiscountAmount);

  // Fixed Coverage Sponsorship calculations (applied after grand discount)
  const calculatedSponsorshipBenefit = applySponsorship
    ? Math.round(grandTotalAfterDiscount * 0.5 * 100) / 100
    : 0;
  const calculatedNetPayable = Math.max(0, Math.round((grandTotalAfterDiscount - calculatedSponsorshipBenefit) * 100) / 100);

  // --- COURSE ROW MANIPULATIONS ---
  const handleAddCourseRow = () => {
    setCourseRows(prev => [
      ...prev,
      { programName: '', duration: '90 Days', price: 0, total: 0, discountPercent: 0, gstPercent: 18 }
    ]);
  };

  const handleRemoveCourseRow = (idx: number) => {
    if (courseRows.length <= 1) {
      onNotify('Provide at least one program item in the proposal table.', 'error');
      return;
    }
    setCourseRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateRowField = (idx: number, field: string, value: any) => {
    setCourseRows(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // --- DYNAMIC PREVIEW COMPILING ---
  const generateInvoiceTableHtml = () => {
    let ht = `
      <div style="width: 100%; overflow-x: auto; margin: 20px 0; -webkit-overflow-scrolling: touch; text-align: left;">
        <table style="width: 55%; min-width: 320px; margin: 20px 0; border-collapse: collapse; border: 1.5px solid #000000; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #000000;">
          <thead>
            <tr style="background-color: #002d62; color: #ffffff;">
              <th style="padding: 10px; border: 1.5px solid #000000; text-align: left; font-weight: bold; font-size: 12px; text-transform: uppercase;">Selected Programs</th>
              <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 12px; text-transform: uppercase;">Duration</th>
              <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 12px; text-transform: uppercase;">Price (Excl. Tax)</th>
              <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 12px; text-transform: uppercase;">GST 18% in Rs</th>
              <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 12px; text-transform: uppercase;">Total</th>
            </tr>
          </thead>
          <tbody>
    `;

    courseRowsCalculated.forEach((item) => {
      const isComp = !item.price || item.price === 0 || item.programName.toLowerCase().includes('complementary') || item.programName.toLowerCase().includes('complimentary');
      const priceVal = isComp ? '-' : '₹' + Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const gstAmtVal = isComp ? '-' : '₹' + Number(item.gstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const totalVal = '₹' + Number(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let progNameCellContent = `<span style="font-weight: bold;">${item.programName || 'Training Development Program'}</span>`;
      if (item.discountPercent > 0) {
        progNameCellContent += `<div style="font-size: 11px; color: #000000; margin-top: 3px; font-weight: bold;">* Includes ${item.discountPercent}% Discount (-₹${item.discountAmount.toLocaleString('en-IN')})</div>`;
      }

      ht += `
          <tr style="background-color: #ffffff; text-align: center;">
            <td style="padding: 10px; border: 1.5px solid #000000; text-align: left; vertical-align: top;">${progNameCellContent}</td>
            <td style="padding: 10px; border: 1.5px solid #000000; text-align: center; vertical-align: top;">${item.duration || '90 Days'}</td>
            <td style="padding: 10px; border: 1.5px solid #000000; text-align: center; vertical-align: top;">${priceVal}</td>
            <td style="padding: 10px; border: 1.5px solid #000000; text-align: center; vertical-align: top; font-weight: bold;">${gstAmtVal}</td>
            <td style="padding: 10px; border: 1.5px solid #000000; text-align: center; vertical-align: top; font-weight: bold;">${totalVal}</td>
          </tr>
      `;
    });

    ht += `
          <tr style="text-align: center;">
            <td colspan="4" style="background-color: #f1f5f9; color: #000000; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 12px; text-transform: uppercase;">Subtotal (excl. Tax)</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 12px;">₹${rawBaseSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
    `;

    if (calculatedGstValue > 0) {
      ht += `
          <tr style="text-align: center;">
            <td colspan="4" style="background-color: #f1f5f9; color: #000000; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 12px; text-transform: uppercase;">Combined GST Tax (Adding Rupees)</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 12px; color: #000000;">₹${calculatedGstValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
      `;
    }

    if (discountReductionAmount > 0) {
      const avgDiscPercent = rawBaseSubtotal > 0 ? Math.round((discountReductionAmount / rawBaseSubtotal) * 100) : 0;
      ht += `
          <tr style="text-align: center;">
            <td colspan="4" style="background-color: #f1f5f9; color: #000000; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 12px; text-transform: uppercase;">Combined Rebate Discount (${avgDiscPercent}%)</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 12px; color: #000000;">-₹${discountReductionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
      `;
    }

    ht += `
          <tr style="text-align: center;">
            <td colspan="4" style="background-color: #e07a22; color: #ffffff; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 12px; text-transform: uppercase;">Grand Total (incl. GST)</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 12px; font-weight: bold;">₹${computedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
    `;

    if (grandDiscountAmount > 0) {
      ht += `
          <tr style="text-align: center;">
            <td colspan="4" style="background-color: #fafaf9; color: #000000; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 12px; text-transform: uppercase;">${grandDiscountLabel}</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 12px; color: #000000;">-₹${grandDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr style="text-align: center;">
            <td colspan="4" style="background-color: #f1f5f9; color: #000000; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 12px; text-transform: uppercase;">Grand Total (After Discount)</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 12px; font-weight: bold; color: #000000;">₹${grandTotalAfterDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
      `;
    }

    if (applySponsorship && calculatedSponsorshipBenefit > 0) {
      ht += `
          <tr style="text-align: center;">
            <td colspan="4" style="background-color: #e5e7eb; color: #000000; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 12px; text-transform: uppercase;">Sponsorship Coverage (50%)</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 12px; color: #047857;">₹${calculatedSponsorshipBenefit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
      `;
    }

    ht += `
          <tr style="text-align: center; background-color: #fffbeb;">
            <td colspan="4" style="background-color: #002d62; color: #ffffff; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 13px; text-transform: uppercase;">Total Payable Amount</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 14px; color: #b45309; border: 2.5px solid #002d62;">₹${calculatedNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </div>
    `;

    return ht;
  };

  const compileActiveTemplate = () => {
    const rawTemplateObj = templates.find(t => t.id === selectedTemplateId) || {
      subject: 'Thank you for your interest - Proposal from I-SUCCESSNODE',
      htmlContent: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Greetings from <strong>I-SUCCESSNODE</strong>!</p>
<p>We are delighted to submit our customized sponsorship proposal:</p>
{{invoice_table}}`
    };

    const invoiceTableHtml = generateInvoiceTableHtml();
    const firstProgDetails = courseRowsCalculated.map(it => `${it.programName} (${it.duration} @ ₹${Number(it.total).toLocaleString('en-IN')})`).join(', ');

    const replacerFn = (text: string, includeTable = true) => {
      if (!text) return '';
      let res = text
        .replace(/{{customer_name}}/gi, candidateName || 'Candidate Guest')
        .replace(/{{customer_email}}/gi, candidateEmail || 'candidate@email.com')
        .replace(/{{customer_phone}}/gi, candidatePhone || 'N/A')
        .replace(/{{company_name}}/gi, companyName || 'Corporate Participant')
        .replace(/{{program_list}}/gi, firstProgDetails)
        .replace(/{{invoice_total}}/gi, computedGrandTotal.toFixed(2))
        .replace(/{{sponsorship_amount}}/gi, calculatedSponsorshipBenefit.toFixed(2))
        .replace(/{{payable_amount}}/gi, calculatedNetPayable.toFixed(2))
        .replace(/{{company_phone}}/gi, branding.companyPhone)
        .replace(/{{company_email}}/gi, branding.companyEmail)
        .replace(/{{company_website}}/gi, branding.website)
        .replace(/{{current_date}}/gi, new Date().toLocaleDateString('en-IN'))
        .replace(/{{email_signature}}/gi, branding.emailSignature);

      if (includeTable) {
        res = res.replace(/{{invoice_table}}/gi, invoiceTableHtml);
      }
      return res;
    };

    setCustomSubject(replacerFn(rawTemplateObj.subject));
    setCustomBody(replacerFn(rawTemplateObj.htmlContent, false));
  };

  // Re-run compilation of template variables character-by-character on any form changes
  useEffect(() => {
    compileActiveTemplate();
  }, [
    candidateName, candidateEmail, candidatePhone, companyName, designation, address,
    courseRows, applySponsorship, sponsorshipPercent, grandDiscountPercent, grandDiscountValue, grandDiscountType, selectedTemplateId, branding
  ]);

  const handleResetTemplateToDefaults = () => {
    compileActiveTemplate();
    onNotify('Draft reset to clean template values.', 'success');
  };

  // --- ACTIONS: SAVE / LOAD STATE ---
  const handleSaveProposalToHistory = async () => {
    if (!candidateName || !candidateEmail) {
      onNotify('A valid Candidate Name and Email are required to log the proposal.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Double check / register customer on-the-fly
      let foundCust = customers.find(c => c.email.toLowerCase() === candidateEmail.toLowerCase());
      if (!foundCust) {
        foundCust = await api.customers.create({
          name: candidateName,
          email: candidateEmail,
          phone: candidatePhone || 'N/A',
          companyName: companyName || 'I-SUCCESSNODE Client',
          designation: designation || 'Candidate',
          address: address || 'N/A'
        });
      }

      // 2. Register Invoice database entry linking this client
      const createdInv = await api.invoices.create({
        customerId: foundCust.id,
        items: courseRowsCalculated,
        sponsorshipAmount: calculatedSponsorshipBenefit,
        status: 'Pending',
        grandTotal: computedGrandTotal,
        payableAmount: calculatedNetPayable
      });

      // 3. Log simulated deliverable
      await api.emailLogs.send({
        customerId: foundCust.id,
        invoiceId: createdInv.id,
        templateId: selectedTemplateId,
        customSubject,
        customBody
      });

      onNotify(`Saved proposal statement as serial draft #${createdInv.id.toUpperCase()}`, 'success');
      syncWorkspaceData(true);
    } catch (err: any) {
      onNotify('Error occured when writing data.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPresavedProposal = (inv: Invoice) => {
    // Look up associated client in database
    const associatedCust = customers.find(c => c.id === inv.customerId);
    if (associatedCust) {
      setCandidateName(associatedCust.name);
      setCandidateEmail(associatedCust.email);
      setCandidatePhone(associatedCust.phone || '');
      setCompanyName(associatedCust.companyName || '');
      setDesignation(associatedCust.designation || '');
      setAddress(associatedCust.address || '');
    }

    // Set course items
    if (inv.items && inv.items.length > 0) {
      setCourseRows(inv.items.map(it => {
        const gstPct = (it as any).gstPercent || 18;
        const basePrice = it.price || 0;
        const total = it.total || Math.round((basePrice * (1 + gstPct / 100)) * 100) / 100;
        return {
          programName: it.programName,
          duration: it.duration,
          price: basePrice,
          total: total,
          discountPercent: (it as any).discountPercent || 0,
          gstPercent: gstPct
        };
      }));
    }

    // Attempt to guess customization
    if (inv.grandTotal > 0) {
      const calculatedSponPct = Math.round((inv.sponsorshipAmount / inv.grandTotal) * 100);
      setSponsorshipPercent(calculatedSponPct || 50);
    }

    onNotify(`Loaded proposal data for ${associatedCust?.name || 'Client'} back into active workspace.`, 'success');
  };

  const handleDuplicateProposal = async (inv: Invoice) => {
    try {
      const duplicated = await api.invoices.create({
        customerId: inv.customerId,
        items: inv.items,
        sponsorshipAmount: inv.sponsorshipAmount,
        status: 'Pending',
        grandTotal: inv.grandTotal,
        payableAmount: inv.payableAmount
      });
      onNotify(`Duplicated proposal statement as copy #${duplicated.id.toUpperCase()}`, 'success');
      syncWorkspaceData(true);
    } catch (e) {
      onNotify('Could not duplicate proposal statement.', 'error');
    }
  };

  const handleDeleteHistoryInvoice = async (id: string) => {
    if (!window.confirm('Delete this proposal completely from historical registers?')) return;
    try {
      await api.invoices.delete(id);
      onNotify('Sponsorship proposal permanently erased.', 'success');
      syncWorkspaceData(true);
    } catch (e) {
      onNotify('Could not discard statement.', 'error');
    }
  };

  // --- ACTIONS: COPY TO CLIPBOARD ---
  const handleCopyFormattedHtml = async (silent = false, forceClean = false, tableOnly = false): Promise<boolean> => {
    let rawBody = customBody;
    
    if (tableOnly) {
      rawBody = generateInvoiceTableHtml();
    } else {
      rawBody = rawBody.replace(/{{invoice_table}}/gi, generateInvoiceTableHtml());
    }

    if (!tableOnly && forceClean) {
      // Clean signature and footer block placeholders or texts from customBody
      rawBody = rawBody
        .replace(/support@isuccessnode\.com/gi, '')
        .replace(/\+91-7969325900/gi, '')
        .replace(/www\.isuccessnode\.com/gi, '')
        .replace(/<p>\s*Should you have any queries.*?<\/p>/gi, '')
        .replace(/<p>\s*Sincerely yours,.*?<\/p>/gi, '')
        .replace(/<p>\s*Support Team.*?<\/p>/gi, '')
        .replace(/<p>\s*This is an official training program proposal.*?<\/p>/gi, '');
      
      rawBody = rawBody.replace(/(<br\s*\/?>\s*){2,}/gi, '<br />');
    }

    const formattedHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000000; line-height: 1.6; font-size: 14px; background-color: #ffffff; padding: 10px 0;">
        ${rawBody}
      </div>
    `;

    // Flatten to text
    const tempElement = document.createElement('div');
    tempElement.innerHTML = rawBody;
    const plainText = tempElement.innerText || tempElement.textContent || '';

    try {
      const htmlBlob = new Blob([formattedHtml], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      const clipboardDataItem = [new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob
      })];
      await navigator.clipboard.write(clipboardDataItem);
      setIsCopied(true);
      if (!silent) {
        onNotify(forceClean ? 'Clean proposal copied! Paste directly over your Gmail footer.' : 'Stellar styled HTML proposal table copied to clipboard!', 'success');
      }
      setTimeout(() => setIsCopied(false), 3500);
      return true;
    } catch (err) {
      try {
        await navigator.clipboard.writeText(plainText);
        setIsCopied(true);
        if (!silent) {
          onNotify('Plain text proposal copied to clipboard!', 'success');
        }
        setTimeout(() => setIsCopied(false), 3000);
        return true;
      } catch (err2) {
        onNotify('Manual copy recommended.', 'error');
        return false;
      }
    }
  };

  // --- ACTIONS: DISPATCH VIA GMAIL ---
  const handleDispatchGmail = async () => {
    if (!candidateEmail) {
      onNotify('Provide a valid Candidate email coordinates to launch Gmail.', 'error');
      return;
    }

    // 1. Copy the ENTIRE HTML formatted proposal to the clipboard (tableOnly = false)
    const copySuccessful = await handleCopyFormattedHtml(true, false, false);

    // 2. Clean Subject header line
    const cleanSub = customSubject
      .replace(/<[^>]+>/g, '')
      .replace(/\n/g, ' ')
      .trim()
      .substring(0, 150);

    // 3. Open Gmail Composer (copied proposal can be pasted directly using Ctrl+V)
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(candidateEmail)}&su=${encodeURIComponent(cleanSub)}`;
    
    // Save state to ledger logging history
    await handleSaveProposalToHistory();

    const notificationMessage = copySuccessful
      ? 'Entire email proposal copied! Click Gmail editor and press Ctrl+V to paste the formatted message.'
      : 'Opening Gmail Composer...';

    try {
      const newWin = window.open(gmailUrl, '_blank');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        onNotify(notificationMessage, 'success');
        window.location.href = gmailUrl;
      } else {
        onNotify(notificationMessage, 'success');
      }
    } catch (e) {
      onNotify('Redirection blocked. Links are ready.', 'error');
    }
  };

  const handleSendDirectly = async () => {
    if (!candidateName || !candidateEmail) {
      onNotify('A valid Candidate Name and Email are required to send the proposal.', 'error');
      return;
    }

    // Check if API key is configured
    if (!branding.resendApiKey) {
      onNotify('Resend API Key is missing. Switched to Settings to add it.', 'error');
      if (setActiveTab) {
        setActiveTab('settings');
      }
      return;
    }

    setIsSendingDirect(true);
    try {
      // 1. Register customer on-the-fly if needed
      let foundCust = customers.find(c => c.email.toLowerCase() === candidateEmail.toLowerCase());
      if (!foundCust) {
        foundCust = await api.customers.create({
          name: candidateName,
          email: candidateEmail,
          phone: candidatePhone || 'N/A',
          companyName: companyName || 'I-SUCCESSNODE Client',
          designation: designation || 'Candidate',
          address: address || 'N/A'
        });
      }

      // 2. Register Invoice database entry linking this client
      const createdInv = await api.invoices.create({
        customerId: foundCust.id,
        items: courseRowsCalculated,
        sponsorshipAmount: calculatedSponsorshipBenefit,
        status: 'Pending',
        grandTotal: computedGrandTotal,
        payableAmount: calculatedNetPayable
      });

      // 3. Dispatch directly via API (which uses Resend API key proxy)
      const result = await api.emailLogs.send({
        customerId: foundCust.id,
        invoiceId: createdInv.id,
        templateId: selectedTemplateId,
        customSubject,
        customBody
      });

      if (result.trackingNotes && result.trackingNotes.includes('Error')) {
        onNotify(`Direct Send Failed: ${result.trackingNotes}`, 'error');
      } else {
        onNotify('Email proposal sent successfully to candidate via Resend API!', 'success');
      }
      syncWorkspaceData(true);
    } catch (err: any) {
      onNotify('Error sending email directly.', 'error');
    } finally {
      setIsSendingDirect(false);
    }
  };

  // --- ACTIONS: EXPORT PDF ---
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Dark corporate blue header background
    doc.setFillColor(0, 45, 98); // #002D62
    doc.rect(0, 0, 210, 22, 'F');

    // Title Title Heading
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(branding.companyName.toUpperCase(), 15, 14);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('OFFICIAL SPONSORSHIP PROPOSAL DOCUMENT', 135, 14);

    // Grid divider
    doc.setDrawColor(224, 122, 34); // orange border line #E07A22
    doc.setLineWidth(1);
    doc.line(0, 22, 210, 22);

    // Proposal tracking line box
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 28, 180, 11, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(15, 28, 180, 11, 'S');

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`PROPOSAL SERIAL ID: PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, 18, 35);
    doc.text(`DATED: ${new Date().toLocaleDateString('en-IN')}`, 95, 35);
    doc.text(`TREATMENT: SPONSORED PROPOSAL`, 148, 35);

    // Table item headers backing
    doc.setFillColor(0, 45, 98);
    doc.rect(15, 44, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    
    // Position columns perfectly (X positions: 17, 90, 118, 146, 175)
    doc.text('SELECTED TRAINING PROGRAM', 17, 49);
    doc.text('DURATION', 90, 49);
    doc.text('BASE RATE', 118, 49);
    doc.text('GST 18% (RS)', 146, 49);
    doc.text('TOTAL PRICE', 175, 49);

    let startY = 58;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    
    courseRowsCalculated.forEach((item, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, startY - 4, 180, 10, 'F');
      }

      const isComp = !item.price || item.price === 0 || item.programName.toLowerCase().includes('complementary') || item.programName.toLowerCase().includes('complimentary');
      const prStr = isComp ? '-' : 'INR ' + Math.round(item.price).toLocaleString('en-IN');
      const gstAmtStr = isComp ? '-' : 'INR ' + Math.round(item.gstAmount || 0).toLocaleString('en-IN');
      const totalStr = 'INR ' + Math.round(item.total || 0).toLocaleString('en-IN');

      doc.setFont('Helvetica', 'bold');
      doc.text(item.programName.substring(0, 32), 17, startY);
      
      doc.setFont('Helvetica', 'normal');
      doc.text(item.duration, 90, startY);
      doc.text(prStr, 118, startY);
      
      // Separate bold styling & color for GST (Rs) in PDF
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // default charcoal color instead of purple
      doc.text(gstAmtStr, 146, startY);
      
      // Total price column
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(totalStr, 175, startY);

      // Print item discount information below the program name if > 0
      if (item.discountPercent > 0) {
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42); // slate black instead of red
        doc.text(`* Includes ${item.discountPercent}% Discount (-INR ${Math.round(item.discountAmount).toLocaleString('en-IN')})`, 17, startY + 4);
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
      }

      startY += 12;
    });

    // Summary calculations block divider line
    doc.setDrawColor(203, 213, 225);
    doc.line(110, startY - 2, 195, startY - 2);

    doc.setFontSize(8.5);
    doc.text('SUBTOTAL (EXCL. TAX):', 110, startY + 4);
    doc.text(`INR ${Math.round(rawBaseSubtotal).toLocaleString('en-IN')}`, 174, startY + 4);

    if (calculatedGstValue > 0) {
      doc.text(`COMBINED GST TAX (INR):`, 110, startY + 9);
      doc.setTextColor(15, 23, 42); // standard text color instead of purple
      doc.text(`INR ${Math.round(calculatedGstValue).toLocaleString('en-IN')}`, 174, startY + 9);
      startY += 5;
    }

    if (discountReductionAmount > 0) {
      const avgDiscPercent = rawBaseSubtotal > 0 ? Math.round((discountReductionAmount / rawBaseSubtotal) * 100) : 0;
      doc.text(`COMBINED DISCOUNT (${avgDiscPercent}%):`, 110, startY + 9);
      doc.setTextColor(15, 23, 42); // black instead of red
      doc.text(`- INR ${Math.round(discountReductionAmount).toLocaleString('en-IN')}`, 174, startY + 9);
      doc.setTextColor(15, 23, 42);
      startY += 5;
    }

    doc.text(`GRAND TOTAL (MRP):`, 110, startY + 9);
    doc.text(`INR ${Math.round(computedGrandTotal).toLocaleString('en-IN')}`, 174, startY + 9);

    if (grandDiscountAmount > 0) {
      doc.text(`${grandDiscountLabel.toUpperCase()}:`, 110, startY + 14);
      doc.setTextColor(15, 23, 42);
      doc.text(`- INR ${Math.round(grandDiscountAmount).toLocaleString('en-IN')}`, 174, startY + 14);
      doc.setTextColor(15, 23, 42);
      startY += 5;

      doc.text(`GRAND TOTAL (AFTER DISC):`, 110, startY + 14);
      doc.text(`INR ${Math.round(grandTotalAfterDiscount).toLocaleString('en-IN')}`, 174, startY + 14);
      startY += 5;
    }

    if (applySponsorship && calculatedSponsorshipBenefit > 0) {
      doc.text(`SPONSORSHIP BENEFIT (50%):`, 110, startY + 14);
      doc.text(`- INR ${Math.round(calculatedSponsorshipBenefit).toLocaleString('en-IN')}`, 174, startY + 14);
      startY += 5;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(0, 45, 98);
    doc.text('NET PAYABLE DRAFT:', 110, startY + 14);
    doc.text(`INR ${Math.round(calculatedNetPayable).toLocaleString('en-IN')}`, 174, startY + 14);

    // Terms & Conditions block
    const policyBoxY = Math.max(startY + 26, 120);
    doc.setFillColor(248, 250, 252);
    doc.rect(15, policyBoxY, 180, 22, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, policyBoxY, 180, 22, 'S');
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.text([
      'Terms of Engagement Compliance:',
      '1. Pricing and scholarship structures outlined above remain valid for 15 days from emission.',
      '2. Program includes complementary preparatory sessions, workbook credentials, and mock exams.',
      branding.footerText.substring(0, 120)
    ], 18, policyBoxY + 5);

    // Authorized Signature
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(branding.emailSignature || 'Authorized Signatory', 145, policyBoxY + 32);
    doc.setDrawColor(180, 180, 180);
    doc.line(140, policyBoxY + 34, 195, policyBoxY + 34);
    doc.setFontSize(7.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(110, 110, 110);
    doc.text('I-SUCCESSNODE Program Director Desk', 142, policyBoxY + 38);

    const safeName = (candidateName || 'Candidate').replace(/\s+/g, '_').toLowerCase();
    doc.save(`isuccessnode_proposal_${safeName}.pdf`);
    onNotify('Downloaded official PDF proposal document successfully.', 'success');
  };

  // --- ACTIONS: PRINT ---
  const handlePrintDocument = () => {
    window.print();
  };

  // --- SEARCH AND FILTER FILTERING ---
  const filteredHistory = historyPr.filter(inv => {
    const cust = customers.find(c => c.id === inv.customerId);
    const textStr = `${cust?.name || ''} ${cust?.email || ''} ${cust?.companyName || ''} ${inv.id}`.toLowerCase();
    const queryMatch = textStr.includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'ALL') return queryMatch;
    return queryMatch && inv.status.toUpperCase() === statusFilter.toUpperCase();
  });

  return (
    <div className="space-y-8 select-none">
      
      {/* 1. COMPACT CONSOLIDATED KPI DASHBOARD SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111827]/75 border border-slate-800/80 p-4 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-full bg-violet-600/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-slate-400 font-semibold tracking-tight text-[11px] uppercase">Proposals Drafted</span>
          <p className="text-xl font-bold text-white mt-1.5">{historyPr.length}</p>
          <span className="text-[10px] text-slate-500 font-mono block mt-1">Durable Local Ledger</span>
        </div>

        <div className="bg-[#111827]/75 border border-slate-800/80 p-4 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <DollarSign className="w-4 h-4" />
          </div>
          <span className="text-slate-400 font-semibold tracking-tight text-[11px] uppercase">Net Volume Booked</span>
          <p className="text-xl font-bold text-white mt-1.5">
            ₹{historyPr.reduce((sum, inv) => sum + inv.payableAmount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-emerald-400 font-mono block mt-1">Net Receivables</span>
        </div>

        <div className="bg-[#111827]/75 border border-slate-800/80 p-4 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-full bg-amber-600/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <Gift className="w-4 h-4" />
          </div>
          <span className="text-slate-400 font-semibold tracking-tight text-[11px] uppercase">Sponsorship Support</span>
          <p className="text-xl font-bold text-white mt-1.5">
            ₹{historyPr.reduce((sum, inv) => sum + inv.sponsorshipAmount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-amber-400 font-mono block mt-1">Invested in Aspirants</span>
        </div>

        <div className="bg-[#111827]/75 border border-slate-800/80 p-4 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute right-3 top-3 w-8 h-8 rounded-full bg-sky-600/10 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
            <Award className="w-4 h-4" />
          </div>
          <span className="text-slate-400 font-semibold tracking-tight text-[11px] uppercase">Central Tax Registry</span>
          <p className="text-xl font-bold text-white mt-1.5">
            ₹{Math.round(historyPr.reduce((sum, inv) => sum + (inv.payableAmount * 0.18), 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-sky-400 font-mono block mt-1">GST (18%) Logged</span>
        </div>
      </div>

      {/* 2. THE MAIN TWO-COLUMN WORKSPACE: FORM VS PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT HEMISPHERE: UNIFIED FORM PANEL (7 cols) */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* HEADER ROW ACTIONS */}
          <div className="flex justify-between items-center bg-slate-950/20 p-3 rounded-xl border border-slate-850">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-tight">Active Configurator Console</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCandidateName('');
                  setCandidateEmail('');
                  setCandidatePhone('');
                  setCompanyName('');
                  setDesignation('');
                  setAddress('');
                  setCourseRows([{ programName: '', duration: '90 Days', price: 0, total: 0, discountPercent: 0, gstPercent: 18 }]);
                  setApplySponsorship(false);
                  setSponsorshipPercent(0);
                  setGrandDiscountValue(0);
                  setGrandDiscountType('percent');
                  onNotify('Active proposal workspace cleared completely!', 'success');
                }}
                className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-tight bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg cursor-pointer transition-colors"
              >
                Clear Form
              </button>
            </div>
          </div>

          {/* CARD A: CANDIDATE INFORMATION */}
          <div className="bg-[#111827]/70 border border-slate-800/60 rounded-xl p-5 shadow-xl space-y-4 relative">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <UserIcon className="w-3.5 h-3.5 text-violet-400" />
                  Candidate Contact Information
                </h4>
                <p className="text-[10px] text-slate-500 mt-1">Provide credentials or details for the active candidate below.</p>
              </div>
            </div>

            {/* TWO COLUMN GRID FOR INPUTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Aspirant Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Nair"
                  value={candidateName}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    const capitalized = rawValue
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                    setCandidateName(capitalized);
                  }}
                  className="w-full text-xs bg-slate-950/60 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-lg py-2 px-3 text-slate-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. rahul@isuccessnode.com"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  className="w-full text-xs bg-slate-950/60 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-lg py-2 px-3 text-slate-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Mobile / Phone Coordinate</label>
                <input
                  type="text"
                  placeholder="e.g. 9988776655"
                  value={candidatePhone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    const truncated = cleaned.slice(0, 10);
                    setCandidatePhone(truncated);
                  }}
                  className="w-full text-xs bg-slate-950/60 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-lg py-2 px-3 text-slate-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Address</label>
                <input
                  type="text"
                  placeholder="e.g. Salt Lake Sector V, Kolkata"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs bg-slate-950/60 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-lg py-2 px-3 text-slate-100 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* CARD B: SELECTED COURSE PROGRAMS & PRICING ROWS */}
          <div className="bg-[#111827]/70 border border-slate-800/60 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-violet-400" />
                  Sponsorship Academic Packages
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Define your curriculum programs and adjust pricing inclusions directly here.</p>
              </div>
            </div>

            {/* PRIMARY INPUT DYNAMIC ROWS TABLE */}
            <div className="space-y-3.5 pt-1 max-h-96 overflow-y-auto pr-1">
              {courseRowsCalculated.map((row, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 bg-slate-950/45 border border-slate-850/60 rounded-xl relative group gap-3.5 grid grid-cols-1 md:grid-cols-12 items-end"
                >
                  <div className="md:col-span-5">
                    <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Program / Course Title</label>
                    <input
                      type="text"
                      placeholder="e.g. PfMP Preparation Program"
                      value={row.programName}
                      onChange={(e) => handleUpdateRowField(idx, 'programName', e.target.value)}
                      className="w-full text-xs font-bold bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-slate-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Duration</label>
                    <input
                      type="text"
                      placeholder="90 Days"
                      value={row.duration}
                      onChange={(e) => handleUpdateRowField(idx, 'duration', e.target.value)}
                      className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-slate-300 outline-none text-center focus:border-violet-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Total Price (Incl. GST)</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">₹</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={row.total || ''}
                        onChange={(e) => {
                          const enteredTotal = Number(e.target.value) || 0;
                          const gstPct = row.gstPercent || 18;
                          const calculatedBase = enteredTotal / (1 + gstPct / 100);
                          
                          setCourseRows(prev => {
                            const copy = [...prev];
                            copy[idx] = { 
                              ...copy[idx], 
                              total: enteredTotal,
                              price: calculatedBase
                            };
                            return copy;
                          });
                        }}
                        className="w-full text-xs font-bold font-mono bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-5 pr-1 text-slate-100 outline-none focus:border-violet-500 text-right"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-1">
                    <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Disc %</label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      max="100"
                      value={row.discountPercent || ''}
                      onChange={(e) => handleUpdateRowField(idx, 'discountPercent', Number(e.target.value))}
                      className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-1 text-slate-100 outline-none focus:border-violet-500 text-center"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">GST %</label>
                    <input
                      type="number"
                      placeholder="18"
                      min="0"
                      max="100"
                      value={row.gstPercent}
                      onChange={(e) => {
                        const newGstPct = Number(e.target.value) || 0;
                        const calculatedBase = row.total / (1 + newGstPct / 100);
                        
                        setCourseRows(prev => {
                          const copy = [...prev];
                          copy[idx] = { 
                            ...copy[idx], 
                            gstPercent: newGstPct,
                            price: calculatedBase
                          };
                          return copy;
                        });
                      }}
                      className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-1 text-slate-100 outline-none focus:border-violet-500 text-center"
                    />
                  </div>

                  <div className="md:col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveCourseRow(idx)}
                      className="p-1.5 mb-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer block mx-auto transition-colors align-bottom"
                      title="Delete Course Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* MINI INLINE TAX COMPUTATION LABEL DESCRIPTION */}
                  <div className="md:col-span-12 flex justify-between bg-slate-950/40 px-2 py-1 rounded-md text-[9px] text-slate-400 font-mono">
                    <span>Base Price: <strong>₹{row.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                    <span>Rebate Disc: <strong>₹{row.discountAmount?.toLocaleString('en-IN')}</strong></span>
                    <span>GST: <strong>₹{row.gstAmount?.toLocaleString('en-IN')}</strong></span>
                    <span>Row Net: <strong>₹{row.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* RE-ADD ROW BUTTON */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddCourseRow}
                className="px-3.5 py-1.5 bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-violet-500/10 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Customized Course
              </button>
            </div>

            {/* SCHOLARSHIP, SPONSORSHIP & PASTE CONSTRAINTS CONTROL PANEL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applySponsorship}
                  onChange={(e) => {
                    setApplySponsorship(e.target.checked);
                    setSponsorshipPercent(e.target.checked ? 50 : 0);
                  }}
                  className="w-4 h-4 accent-emerald-500 rounded bg-slate-900 border-slate-800 outline-none"
                />
                <div>
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    Apply 50% Sponsorship Distribution
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Check this to apply a fixed 50% scholarship deduction.</p>
                </div>
              </label>

              <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:px-4 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-200">Grand Discount</span>
                  <div className="flex items-center gap-1">
                    <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setGrandDiscountType('percent');
                          setGrandDiscountValue(0);
                        }}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          grandDiscountType === 'percent'
                            ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGrandDiscountType('value');
                          setGrandDiscountValue(0);
                        }}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          grandDiscountType === 'value'
                            ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        ₹
                      </button>
                    </div>

                    <div className="relative w-24">
                      {grandDiscountType === 'value' && (
                        <span className="absolute left-2 top-1.5 text-xs font-bold text-slate-500">₹</span>
                      )}
                      <input
                        type="number"
                        min="0"
                        max={grandDiscountType === 'percent' ? 100 : undefined}
                        value={grandDiscountValue || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          if (grandDiscountType === 'percent') {
                            setGrandDiscountValue(Math.min(100, Math.max(0, val)));
                          } else {
                            setGrandDiscountValue(Math.max(0, val));
                          }
                        }}
                        placeholder="0"
                        className={`w-full text-right text-xs font-mono font-bold bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg py-1 px-2 text-amber-400 outline-none ${
                          grandDiscountType === 'percent' ? 'pr-6' : 'pl-6'
                        }`}
                      />
                      {grandDiscountType === 'percent' && (
                        <span className="absolute right-2 top-1.5 text-xs font-bold text-slate-400">%</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Direct deduction applied straight to the grand total.</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
                <input
                  type="checkbox"
                  checked={cleanGmailMode}
                  onChange={(e) => setCleanGmailMode(e.target.checked)}
                  className="w-4 h-4 accent-violet-500 rounded bg-slate-900 border-slate-800 outline-none"
                />
                <div>
                  <span className="text-xs font-bold text-slate-200">Gmail Direct Clean Paste (No duplication)</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Enables instant Ctrl+V over your existing Gmail footer.</p>
                </div>
              </label>
            </div>
          </div>

          {/* CARD C: EMAIL TEMPLATE & CUSTOMIZER */}
          <div className="bg-[#111827]/70 border border-slate-800/60 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-violet-400" />
                  Proposal Message Builder
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Select a template framework and modify parameters inline.</p>
              </div>
            </div>

             {/* CHOOSE TEMPLATE GRID WITH CUSTOM CREATOR TRG */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-bold block">Selected Framework Layout</label>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplateId(null);
                    setNewTemplateName('');
                    setNewTemplateSubject('');
                    setNewTemplateContent('');
                    setIsCreateTemplateOpen(true);
                  }}
                  className="px-2.5 py-0.5 text-[9px] uppercase font-bold tracking-wider bg-violet-600/30 hover:bg-violet-600 border border-violet-500/50 hover:border-violet-400 text-violet-300 hover:text-white rounded-md cursor-pointer transition-all flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5" />
                  Create Template
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {templates.map((t) => {
                  const isSelected = selectedTemplateId === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`relative group flex items-center justify-between rounded-xl border text-[10px] font-bold tracking-tight transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-violet-600/90 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                      onClick={() => {
                        setSelectedTemplateId(t.id);
                        onNotify(`Switched to the ${t.templateName}!`, 'success');
                      }}
                    >
                      <span className="pl-3 pr-2 py-2.5 truncate select-none flex-1">
                        {t.templateName.replace('I-SUCCESSNODE ', '')}
                      </span>
                      
                      <div className={`flex items-center gap-1 pr-1.5 transition-opacity duration-200 ${
                        isSelected 
                          ? 'opacity-100' 
                          : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditTemplate(e, t)}
                          className={`p-1 rounded-md transition-colors ${
                            isSelected 
                              ? 'hover:bg-violet-500 text-violet-200 hover:text-white' 
                              : 'hover:bg-slate-800 text-slate-500 hover:text-slate-200'
                          }`}
                          title="Edit Template"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTemplate(e, t.id, t.templateName)}
                          className={`p-1 rounded-md transition-colors ${
                            isSelected 
                              ? 'hover:bg-rose-600 text-violet-200 hover:text-white' 
                              : 'hover:bg-rose-950/45 text-slate-500 hover:text-rose-450'
                          }`}
                          title="Delete Template"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DRAGGABLE CHIPS FOR PROPOSAL BUILDER */}
            <div className="space-y-2 mt-3">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Draggable Variable Chips</span>
              <p className="text-[10px] text-slate-500">Drag any chip and drop it directly into the subject or body editors below.</p>
              <div className="flex flex-wrap gap-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-850 max-h-[120px] overflow-y-auto">
                {DRAGGABLE_TOKENS.map((tok, idx) => (
                  <button
                    key={idx}
                    type="button"
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', tok.token);
                    }}
                    onClick={() => {
                      setCustomBody(prev => prev + ' ' + tok.token);
                      onNotify(`Appended tag: ${tok.token}`, 'success');
                    }}
                    className="bg-slate-900 hover:bg-slate-850 hover:border-violet-500/40 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-300 font-mono flex items-center gap-1 cursor-grab active:cursor-grabbing transition-all"
                    title={`Drag and drop or click to insert ${tok.token}`}
                  >
                    <Tag className="w-2.5 h-2.5 text-violet-400" />
                    {tok.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SUBJECT & DRAFT COORD TEXTAREAS */}
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Custom Subject Coordinate</label>
                <input
                  type="text"
                  placeholder="Subject Line"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, setCustomSubject)}
                  className="w-full text-xs font-bold bg-slate-950/60 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-lg py-2 px-3 text-slate-100 outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold block">Formal Proposal Body Draft Content</label>
                  <button
                    type="button"
                    onClick={handleResetTemplateToDefaults}
                    className="text-[9px] uppercase tracking-wider font-extrabold text-amber-500 hover:text-amber-400 cursor-pointer"
                  >
                    Reset Body
                  </button>
                </div>
                <textarea
                  rows={8}
                  placeholder="Main email markup body"
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, setCustomBody)}
                  className="w-full text-xs bg-slate-950/60 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-lg py-2 px-3 text-slate-100 outline-none font-mono leading-relaxed transition-all"
                />
                <span className="text-[9px] text-slate-500 font-mono mt-1 block font-medium">Supports drag & drop. Placeholders: {"{{customer_name}}, {{invoice_table}}, {{company_email}}, {{email_signature}}"}</span>
              </div>
            </div>
          </div>

        </section>

        {/* RIGHT HEMISPHERE: REAL-TIME DIGITAL PROPOSAL INTERACTIVE DOCUMENT PREVIEW (5 cols) */}
        <section className="lg:col-span-5 lg:sticky lg:top-8 space-y-4">
          
          {/* HEADER STICKY ROW CONTROL TRIGGERS */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl space-y-2.5">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-extrabold text-white uppercase tracking-tight flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Interactive Export Trigger Desk
              </span>
              <span className="text-[10px] text-slate-500 mt-1">Ready for Print (A4)</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDispatchGmail}
                className="px-3.5 py-2.5 bg-gradient-to-tr from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/10 transition-all hover:scale-[1.02]"
                title="Copies entire proposal and opens Gmail"
              >
                <Send className="w-4 h-4" />
                Gmail Proposal
              </button>

              <button
                type="button"
                onClick={handleSendDirectly}
                disabled={isSendingDirect}
                className="px-3.5 py-2.5 bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/10 transition-all hover:scale-[1.02] disabled:opacity-55"
                title="Send email directly via Resend API integration"
              >
                {isSendingDirect ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {isSendingDirect ? 'Sending...' : 'Send Direct API'}
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3.5 py-2.5 bg-gradient-to-tr from-amber-550 to-orange-600 hover:from-amber-450 hover:to-orange-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/10 transition-all hover:scale-[1.02]"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>

              <button
                type="button"
                onClick={() => handleCopyFormattedHtml(false)}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {isCopied ? 'Copied' : 'Copy HTML'}
              </button>

              <button
                type="button"
                onClick={handlePrintDocument}
                className="col-span-2 px-3.5 py-2.5 bg-slate-850 hover:bg-slate-805 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-800"
              >
                <Printer className="w-4 h-4" />
                Print Proposal (A4)
              </button>
            </div>

            <div className="border-t border-slate-800/60 pt-2 flex justify-between items-center text-[10px] text-slate-500 px-1">
              <span>Automatic Draft backup:</span>
              <button 
                onClick={handleSaveProposalToHistory} 
                disabled={isSaving}
                className="text-violet-400 font-extrabold hover:text-violet-300 disabled:opacity-50 cursor-pointer uppercase text-[9px] tracking-wider"
              >
                {isSaving ? 'Saving...' : '💾 Save to Outbox'}
              </button>
            </div>
          </div>

          {/* DUSTY CRUNCHY WHITE HIGH-FIDELITY PROPOSAL CANVAS BACKING */}
          <div className="bg-slate-950/20 p-2.5 rounded-2xl border border-slate-800">
            
            {/* Styled interactive envelope container targeted uniquely for A4 printing */}
            <div 
              id="printable-envelope-card" 
              className="bg-white rounded-xl shadow-2xl p-6 text-slate-900 border border-slate-200 overflow-hidden text-left relative selection:bg-violet-100"
              style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
              
              {/* LIVE COMPILED RICH MESSAGE BODY */}
              <div className="py-2 text-[13px] text-slate-800 leading-relaxed space-y-3 prose max-w-full">
                <div 
                  className="preview-compiled-body break-words select-text"
                  dangerouslySetInnerHTML={{ __html: customBody ? customBody.replace(/{{invoice_table}}/gi, generateInvoiceTableHtml()) : '<p className="text-slate-400 italic">Body dynamic layout rendering inline...</p>' }}
                />
              </div>

            </div>

          </div>

        </section>

      </div>

      {/* 4. MODAL: CREATE CUSTOM EMAIL TEMPLATE */}
      {isCreateTemplateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050811]/90 backdrop-blur-md">
          <div className="bg-[#111827] border border-slate-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative space-y-4">
            
            <button
              type="button"
              onClick={() => setIsCreateTemplateOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h4 className="text-sm font-extrabold text-white uppercase tracking-tight flex items-center gap-1.5">
                {editingTemplateId ? (
                  <Edit3 className="w-4 h-4 text-violet-400" />
                ) : (
                  <Plus className="w-4 h-4 text-violet-400" />
                )}
                {editingTemplateId ? 'Edit Custom Email Template' : 'Create New Custom Email Template'}
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Define your custom proposal message. Placeholders like &#123;&#123;customer_name&#125;&#125;, &#123;&#123;invoice_table&#125;&#125; will be automatically parsed.</p>
            </div>

            <div className="space-y-4 pt-1">
              {/* DRAGGABLE CHIPS FOR MODAL TEMPLATE CREATOR */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 block">Draggable Variable Chips</span>
                <div className="flex flex-wrap gap-1 bg-slate-950/40 p-2 rounded-xl border border-slate-850/50 max-h-[85px] overflow-y-auto">
                  {DRAGGABLE_TOKENS.map((tok, idx) => (
                    <button
                      key={idx}
                      type="button"
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', tok.token);
                      }}
                      onClick={() => {
                        setNewTemplateContent(prev => prev + ' ' + tok.token);
                      }}
                      className="bg-slate-900 hover:bg-slate-850 hover:border-violet-500/40 border border-slate-800 rounded-lg px-2 py-0.5 text-[9px] text-slate-300 font-mono flex items-center gap-1 cursor-grab active:cursor-grabbing transition-all"
                      title={`Drag & drop or click to insert ${tok.token}`}
                    >
                      <Tag className="w-2.5 h-2.5 text-violet-400" />
                      {tok.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Template Label / Name</label>
                <input
                  type="text"
                  placeholder="e.g. Special Offer Proposal"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-950/60 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-lg py-2 px-3 text-slate-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Subject Line</label>
                <input
                  type="text"
                  placeholder="e.g. Customized Sponsorship Proposal for &#123;&#123;customer_name&#125;&#125;"
                  value={newTemplateSubject}
                  onChange={(e) => setNewTemplateSubject(e.target.value)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, setNewTemplateSubject)}
                  className="w-full text-xs font-bold bg-slate-950/60 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-lg py-2 px-3 text-slate-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">HTML Body Content</label>
                <textarea
                  rows={8}
                  placeholder="<p>Dear &#123;&#123;customer_name&#125;&#125;,</p> <p>Write your template content here...</p> &#123;&#123;invoice_table&#125;&#125;"
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, setNewTemplateContent)}
                  className="w-full text-xs bg-slate-950/60 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-lg py-2 px-3 text-slate-100 outline-none font-mono leading-relaxed transition-all"
                />
                <span className="text-[9px] text-slate-400 font-mono mt-1 block">Supports drag & drop. Values: &#123;&#123;customer_name&#125;&#125;, &#123;&#123;company_name&#125;&#125;, &#123;&#123;invoice_table&#125;&#125;, &#123;&#123;payable_amount&#125;&#125;</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateTemplateOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-4 py-2 text-xs font-bold bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl cursor-pointer shadow-lg shadow-violet-500/10"
              >
                {editingTemplateId ? 'Save Changes' : 'Add Template Layout'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
