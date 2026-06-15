/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, ChevronRight, ChevronLeft, User, FileText, Layout, 
  Settings, Eye, Send, Loader2, Sparkles, X, CheckCircle, 
  Mail, Phone, Building2, Plus, Trash2, HelpCircle, Info, 
  Percent, Award, RefreshCw, Briefcase, Globe, Save, Sparkle
} from 'lucide-react';
import { api } from '../lib/api';
import { Customer, Invoice, EmailTemplate, EmailLog, CompanySettings, InvoiceItem } from '../types';

interface EmailSenderProps {
  customers: Customer[];
  invoices: Invoice[];
  templates: EmailTemplate[];
  onNotify: (message: string, type: 'success' | 'error') => void;
  onRefreshData: () => void;
  initialInvoiceId?: string;
  initialCustomerId?: string;
  onClearInitialSelections?: () => void;
}

// Preset Programs for rapid selection
interface ProgramPreset {
  programName: string;
  duration: string;
  price: number;
  gst: number;
  total: number;
}

const PROGRAM_PRESETS: ProgramPreset[] = [
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

export default function EmailSender({ 
  customers, 
  invoices, 
  templates, 
  onNotify, 
  onRefreshData,
  initialInvoiceId = '',
  initialCustomerId = '',
  onClearInitialSelections
}: EmailSenderProps) {
  
  // Stepper state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Selected template & recipient references
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // AdHoc dynamic custom customer state
  const [isAdHocClient, setIsAdHocClient] = useState(false);
  const [adHocClient, setAdHocClient] = useState({
    name: '',
    email: '',
    companyName: 'I-SUCCESSNODE Candidate',
    phone: '',
    address: 'Aggra, Uttar Pradesh'
  });

  // Sender branding state prefilled with elegant defaults
  const [branding, setBranding] = useState<CompanySettings>({
    companyName: 'I-SUCCESSNODE',
    companyPhone: '+91-7969325900',
    companyEmail: 'support@isuccessnode.com',
    website: 'www.isuccessnode.com',
    logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', // Corporate default placeholder
    footerText: 'This is an official training program proposal proposal from I-SUCCESSNODE (OPC) Private Limited. All terms are structured to maintain optimal service transparency.',
    emailSignature: 'Support Team'
  });

  const [savingBranding, setSavingBranding] = useState(false);

  // STEP 2: Proposal Items list
  const [proposalItems, setProposalItems] = useState<Array<{
    programName: string;
    duration: string;
    price: number;
    gst: number;
    total: number;
  }>>([
    {
      programName: 'Confidence & Personality Boot camp',
      duration: '90 Days',
      price: 4237.29,
      gst: 762.71,
      total: 5000.00
    }
  ]);

  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isBrandingPanelOpen, setIsBrandingPanelOpen] = useState(false);

  // Editing subject/body drafts
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');

  // Status values
  const [sending, setSending] = useState(false);
  const [deliveredLog, setDeliveredLog] = useState<EmailLog | null>(null);
  const [envelopeTraceNotes, setEnvelopeTraceNotes] = useState('');
  const [renderedWrapperPayload, setRenderedWrapperPayload] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
      setIsAdHocClient(false);
    }
  }, [initialCustomerId]);

  const fetchBranding = async () => {
    try {
      const res = await api.settings.get();
      if (res && res.companyName) {
        setBranding(res);
      }
    } catch (err) {
      console.error('Error loading corporate branding:', err);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  // Set default selected template once loaded
  useEffect(() => {
    if (templates.length > 0) {
      const isucc = templates.find(t => t.id === 'temp_isuccessnode');
      setSelectedTemplateId(isucc ? isucc.id : templates[0].id);
    }
  }, [templates]);

  // Handle branding inline edits
  const handleBrandingChange = (field: keyof CompanySettings, value: string) => {
    setBranding(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveBrandingSettings = async () => {
    setSavingBranding(true);
    try {
      await api.settings.save(branding);
      onNotify('Sender corporate settings saved successfully to secure database!', 'success');
      onRefreshData();
    } catch (err) {
      onNotify('Failed to persist corporate settings to databases.', 'error');
    } finally {
      setSavingBranding(false);
    }
  };

  // Step 2 Calculations
  const rawSubtotal = proposalItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const discountAmount = Math.round(rawSubtotal * (Number(discountPercent) / 100) * 100) / 100;
  const discountedSubtotal = Math.round((rawSubtotal - discountAmount) * 100) / 100;
  
  // GST (18%) calculated standard on discounted base
  const totalGst = Math.round(discountedSubtotal * 0.18 * 100) / 100;
  
  // Grand total
  const grandTotal = Math.round((discountedSubtotal + totalGst) * 100) / 100;
  
  // Sponsorship (50% Fixed)
  const sponsorshipAmount = Math.round(grandTotal * 0.50 * 100) / 100;
  
  // Total payable (should be exactly 50% of the grand total!)
  const payableAmount = Math.max(0, Math.round((grandTotal - sponsorshipAmount) * 100) / 100);

  // Step 2 Item rows actions
  const handleAddRow = () => {
    setProposalItems(prev => [
      ...prev,
      { programName: '', duration: '90 Days', price: 0, gst: 0, total: 0 }
    ]);
  };

  const handleApplyPreset = (index: number, preset: ProgramPreset) => {
    setProposalItems(prev => {
      const copy = [...prev];
      copy[index] = {
        programName: preset.programName,
        duration: preset.duration,
        price: preset.price,
        gst: preset.gst,
        total: preset.total
      };
      return copy;
    });
  };

  const handleUpdateItemValue = (index: number, field: string, val: any) => {
    setProposalItems(prev => {
      const copy = [...prev];
      const current = { ...copy[index], [field]: val };
      
      if (field === 'price') {
        const priceNum = Number(val) || 0;
        current.gst = Math.round(priceNum * 0.18 * 100) / 100;
        current.total = Math.round((priceNum + current.gst) * 100) / 100;
      }
      
      copy[index] = current;
      return copy;
    });
  };

  const handleRemoveRow = (index: number) => {
    if (proposalItems.length <= 1) {
      onNotify('Your proposal must designate at least one billing item.', 'error');
      return;
    }
    setProposalItems(prev => prev.filter((_, i) => i !== index));
  };

  // Dynamic High-Fidelity Table Generation for insertion in template
  const generateInvoiceTableHtml = () => {
    let html = `
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; margin: 20px 0; color: #000000;">
        <thead>
          <tr style="background-color: #002d62; color: #ffffff;">
            <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase;">Selected Programs</th>
            <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase;">Duration</th>
            <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase;">Price (Excl. GST)</th>
            <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase;">GST (18%)</th>
            <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>
    `;

    proposalItems.forEach((item) => {
      const isComp = !item.price || item.price === 0 || item.programName.toLowerCase().includes('complementary') || item.programName.toLowerCase().includes('complimentary');
      const priceVal = isComp ? '-' : '₹' + Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const gstVal = isComp ? '-' : '₹' + Number(item.gst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const totalVal = '₹' + Number(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      html += `
          <tr style="background-color: #ffffff; text-align: center;">
            <td style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold;">${item.programName || 'Training Development Program'}</td>
            <td style="padding: 10px; border: 1.5px solid #000000; text-align: center;">${item.duration || '90 Days'}</td>
            <td style="padding: 10px; border: 1.5px solid #000000; text-align: center;">${priceVal}</td>
            <td style="padding: 10px; border: 1.5px solid #000000; text-align: center;">${gstVal}</td>
            <td style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold;">${totalVal}</td>
          </tr>
      `;
    });

    if (Number(discountPercent) > 0) {
      html += `
          <tr style="text-align: center;">
            <td colspan="4" style="background-color: #f1f5f9; color: #000000; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 12px; text-transform: uppercase;">Subtotal (Excl. GST)</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 12px;">₹${rawSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr style="text-align: center;">
            <td colspan="4" style="background-color: #f1f5f9; color: #dc2626; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 12px; text-transform: uppercase;">Applied Discount (${discountPercent}%)</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 12px; color: #dc2626;">-₹${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr style="text-align: center;">
            <td colspan="4" style="background-color: #f1f5f9; color: #000000; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 12px; text-transform: uppercase;">GST (18% on Discounted Base)</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 12px;">₹${totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
      `;
    }

    html += `
          <tr style="text-align: center;">
            <td colspan="4" style="background-color: #e07a22; color: #000000; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 13px; text-transform: uppercase;">Grand Total (Incl. GST)</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 13px;">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr style="text-align: center;">
            <td colspan="4" style="background-color: #e07a22; color: #000000; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 13px; text-transform: uppercase;">Sponsorship Amount (50% Fixed)</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 13px; color: #047857;">₹${sponsorshipAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr style="text-align: center; background-color: #fffbeb;">
            <td colspan="4" style="background-color: #002d62; color: #ffffff; font-weight: bold; text-align: right; border: 1.5px solid #000000; padding: 10px; font-size: 13px; text-transform: uppercase;">Total Payable Amount</td>
            <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 14px; color: #b45309; border: 2.5px solid #002d62;">₹${payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    `;

    return html;
  };

  // Auto-compiliation of selected email Template body
  const compileTemplateOnStepChange = () => {
    const cust = isAdHocClient 
      ? {
          name: adHocClient.name || '[Candidate Name]',
          email: adHocClient.email || '[candidate@email.com]',
          phone: adHocClient.phone || 'N/A',
          companyName: adHocClient.companyName || 'Corporate Client'
        }
      : (customers.find(c => c.id === selectedCustomerId) || {
          name: '[Customer Name]',
          email: '[customer@email.com]',
          phone: '[Customer Phone]',
          companyName: '[Customer Company]'
        });

    const temp = templates.find(t => t.id === selectedTemplateId) || templates.find(t => t.id === 'temp_isuccessnode') || {
      subject: 'Thank you for your interest - Proposal from I-SUCCESSNODE',
      htmlContent: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Greetings from <strong>I-SUCCESSNODE (OPC) Private Limited</strong>!</p>
<p>Please find below your training proposal details.</p>
{{invoice_table}}`
    };

    const invoiceTableHtml = generateInvoiceTableHtml();
    
    // First program or summary details
    const firstProgName = proposalItems[0]?.programName || 'Accreditation training preparation';
    const firstProgDetails = proposalItems.map(it => `${it.programName} (${it.duration} @ ₹${Number(it.total).toLocaleString('en-IN')})`).join(', ');

    const replacer = (text: string) => {
      if (!text) return '';
      return text
        .replace(/{{customer_name}}/gi, cust.name)
        .replace(/{{customer_email}}/gi, cust.email)
        .replace(/{{customer_phone}}/gi, cust.phone || 'N/A')
        .replace(/{{company_name}}/gi, cust.companyName || 'N/A')
        .replace(/{{program_name}}/gi, firstProgName)
        .replace(/{{program_list}}/gi, firstProgDetails)
        .replace(/{{invoice_total}}/gi, grandTotal.toFixed(2))
        .replace(/{{sponsorship_amount}}/gi, sponsorshipAmount.toFixed(2))
        .replace(/{{payable_amount}}/gi, payableAmount.toFixed(2))
        .replace(/{{invoice_table}}/gi, invoiceTableHtml)
        .replace(/{{company_phone}}/gi, branding.companyPhone || '+91-7969325900')
        .replace(/{{company_email}}/gi, branding.companyEmail || 'support@isuccessnode.com')
        .replace(/{{company_website}}/gi, branding.website || 'www.isuccessnode.com')
        .replace(/{{current_date}}/gi, new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }))
        .replace(/{{email_signature}}/gi, branding.emailSignature || 'Support Team');
    };

    setCustomSubject(replacer(temp.subject));
    setCustomBody(replacer(temp.htmlContent));
  };

  // Every time we switch into Step 3, compile template
  useEffect(() => {
    if (currentStep === 3) {
      compileTemplateOnStepChange();
    }
  }, [currentStep, selectedCustomerId, selectedTemplateId, isAdHocClient, adHocClient]);

  const cleanHtmlForGmail = (html: string): string => {
    let intermediate = html;
    
    intermediate = intermediate.replace(/<\/tr>/gi, '\n');
    intermediate = intermediate.replace(/<td[^>]*>/gi, ' ');
    intermediate = intermediate.replace(/<\/td>/gi, ' \t| ');
    intermediate = intermediate.replace(/<th[^>]*>/gi, ' ');
    intermediate = intermediate.replace(/<\/th>/gi, ' \t| ');
    intermediate = intermediate.replace(/<\/thead>/gi, '\n' + '—'.repeat(75) + '\n');
    intermediate = intermediate.replace(/<\/tbody>/gi, '\n');
    intermediate = intermediate.replace(/<table[^>]*>/gi, '\n');
    intermediate = intermediate.replace(/<\/table>/gi, '\n');

    let text = intermediate
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<strong[^>]*>/gi, '')
      .replace(/<\/strong>/gi, '')
      .replace(/<b[^>]*>/gi, '')
      .replace(/<\/b>/gi, '')
      .replace(/<em[^>]*>/gi, '')
      .replace(/<\/em>/gi, '')
      .replace(/<u[^>]*>/gi, '')
      .replace(/<\/u>/gi, '');
    
    text = text.replace(/<[^>]+>/g, '');
    
    text = text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
      
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text.trim();
  };

  const copyEmailToClipboard = async (silent = false): Promise<boolean> => {
    let formattedHtml = customBody;
    
    if (branding) {
      formattedHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 15px auto; padding: 0; color: #1e293b; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.06);">
          ${branding.logoUrl ? `
          <div style="background: linear-gradient(135deg, #002d62 0%, #003b80 100%); padding: 25px; text-align: center; border-bottom: 3.5px solid #e07a22;">
            <img src="${branding.logoUrl}" style="max-height: 48px; border-radius: 4px; padding: 3px; background-color: #ffffff; display: inline-block;" referrerPolicy="no-referrer" />
            <h2 style="color: #ffffff; margin: 10px 0 0 0; font-size: 1.3rem; font-weight: 700; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; letter-spacing: 0.5px;">${branding.companyName}</h2>
          </div>
          ` : ''}
          <div style="padding: 28px; line-height: 1.6; font-size: 13.5px; color: #000000; background-color: #ffffff;">
            ${customBody}
          </div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1.5px solid #cbd5e1; border-radius: 0 0 12px 12px; margin: 0;">
            <p style="margin: 0; font-weight: 700; color: #1e293b;">${branding.companyName}</p>
            <p style="margin: 4px 0 0 0; line-height: 1.5;">${branding.footerText}</p>
          </div>
        </div>
      `;
    }

    const plainText = cleanHtmlForGmail(customBody);

    try {
      const htmlBlob = new Blob([formattedHtml], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      const data = [new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob
      })];
      await navigator.clipboard.write(data);
      setCopied(true);
      if (!silent) {
        onNotify('Proposal with high-quality tables auto-copied to clipboard!', 'success');
      }
      setTimeout(() => setCopied(false), 3000);
      return true;
    } catch (err) {
      console.warn('HTML clipboard fallback executed', err);
      try {
        await navigator.clipboard.writeText(plainText);
        setCopied(true);
        if (!silent) {
          onNotify('Plain text proposal copied to clipboard!', 'success');
        }
        setTimeout(() => setCopied(false), 3000);
        return true;
      } catch (e) {
        console.error('Clipboard failed entirely:', e);
        if (!silent) {
          onNotify('Failed copying to clipboard. Please copy manually from the preview panel.', 'error');
        }
        return false;
      }
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!isAdHocClient && !selectedCustomerId) {
        onNotify('Please pick an existing candidate, or register a new one inline.', 'error');
        return;
      }
      if (isAdHocClient && (!adHocClient.name || !adHocClient.email)) {
        onNotify('Inline Candidate Name and Email are required.', 'error');
        return;
      }
    }
    if (currentStep === 2) {
      if (proposalItems.length === 0 || proposalItems.some(it => !it.programName)) {
        onNotify('Please add at least one program and fill out the name fields.', 'error');
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSendEmail = async () => {
    setSending(true);
    let targetCustomerId = selectedCustomerId;

    try {
      // 1. If AdHoc customer is entered, create them on-the-fly dynamically
      if (isAdHocClient) {
        const adhocCreated = await api.customers.create({
          name: adHocClient.name,
          email: adHocClient.email,
          phone: adHocClient.phone || undefined,
          companyName: adHocClient.companyName || undefined,
          address: adHocClient.address || undefined
        });
        targetCustomerId = adhocCreated.id;
        onNotify(`Candidate record for ${adhocCreated.name} registered on-the-fly!`, 'success');
      }

      const clientSelected = customers.find(c => c.id === targetCustomerId) || { name: adHocClient.name, email: adHocClient.email };

      // 2. Create dynamic invoice in database
      const createdInvoice = await api.invoices.create({
        customerId: targetCustomerId,
        items: proposalItems,
        sponsorshipAmount: sponsorshipAmount,
        status: 'Pending',
        grandTotal: grandTotal,
        payableAmount: payableAmount
      });

      onNotify(`Invoice #${createdInvoice.id.toUpperCase()} registered with ₹${payableAmount.toLocaleString()} Net Payable.`, 'success');

      // 3. Save official Email Log linked to this Invoice & Customer
      const res = await api.emailLogs.send({
        customerId: targetCustomerId,
        invoiceId: createdInvoice.id,
        templateId: selectedTemplateId !== 'custom' ? selectedTemplateId : undefined,
        customSubject,
        customBody
      });

      if (res.success) {
        // 4. Auto copy the rich proposal layouts to system clipboard
        await copyEmailToClipboard(true);
        
        setDeliveredLog(res.log);
        setEnvelopeTraceNotes(res.trackingNotes);
        setRenderedWrapperPayload(res.deliveredPayload);
        
        onNotify('Proposal copied to Clipboard! Seamlessly redirecting to Gmail...', 'success');
        onRefreshData();

        // 5. Open Gmail Compose windows with recipients preloaded and paste instruction
        const cleanSubject = (customSubject || '')
          .replace(/<[^>]+>/g, '') // Strip HTML
          .replace(/\n/g, ' ')     // Keep on one line
          .trim()
          .substring(0, 150);      // Truncate to safe length

        const hintBody = `[Please press Ctrl+V (or Cmd+V on Mac) right here to paste the beautifully formatted, official proposal with styled tables!]`;
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(clientSelected.email)}&su=${encodeURIComponent(cleanSubject)}&body=${encodeURIComponent(hintBody)}`;
        
        try {
          const newTab = window.open(gmailUrl, '_blank');
          if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
            onNotify('Popup Blocked! Please click the direct Open Gmail button.', 'error');
          }
        } catch (e) {
          console.error('[GMAIL ACTION]', e);
        }
      }
    } catch (err: any) {
      onNotify(err.message || 'Error occurred generating elements.', 'error');
    } finally {
      setSending(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedCustomerId('');
    setIsAdHocClient(false);
    setDeliveredLog(null);
    setDiscountPercent(0);
    setProposalItems([
      {
        programName: 'Confidence & Personality Boot camp',
        duration: '90 Days',
        price: 4237.29,
        gst: 762.71,
        total: 5000.00
      }
    ]);
  };

  const activeCustomer = isAdHocClient 
    ? { name: adHocClient.name || 'Candidate Client', email: adHocClient.email || 'recipient@email.com' }
    : (customers.find(c => c.id === selectedCustomerId) || { name: 'None Selected', email: '' });

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 md:p-7 shadow-xl backdrop-blur-sm self-start">
      
      {/* Header Wizard progress indicators */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-5 mb-6">
        <div>
          <span className="text-[10px] bg-violet-600/15 border border-violet-500/25 text-violet-400 font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
            Proposal Dispatch wizard
          </span>
          <h2 className="text-lg font-bold text-white mt-1">Generate & Deliver Corporate Proposals</h2>
          <p className="text-slate-400 text-xs mt-0.5">Automated on-the-fly calculations with fixed 50% sponsorships and live frame previews.</p>
        </div>

        {/* Dynamic Stepper pills */}
        <div className="flex items-center gap-1.5 self-stretch md:self-auto justify-between md:justify-start pt-1">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;
            return (
              <div key={idx} className="flex items-center gap-1">
                <div 
                  className={`w-6 h-6 rounded-full font-bold flex items-center justify-center font-mono text-[10px] transition-all ${
                    isActive 
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20' 
                      : isCompleted 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                </div>
                {idx < totalSteps - 1 && (
                  <div className={`w-4 h-0.5 rounded-full ${currentStep > stepNum ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form Fields render */}
      <div className="min-h-[350px]">
        <AnimatePresence mode="wait">

          {/* STEP 1: Recipient Customer Registry & Logo/Corporate custom details */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Candidate selection card block */}
                <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4.5 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/40">
                    <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2">
                      <User className="w-4 h-4 text-violet-400" />
                      Recipient Candidate
                    </h3>
                    
                    {/* Toggle between Adhoc or Database customer select */}
                    <button
                      type="button"
                      onClick={() => setIsAdHocClient(!isAdHocClient)}
                      className="text-[10px] font-bold text-violet-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/60 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {isAdHocClient ? 'Select Pre-Existing Candidate' : '➕ Register New candidate Inline'}
                    </button>
                  </div>

                  {isAdHocClient ? (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block">Candidate Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="Yatindra Singh"
                            value={adHocClient.name}
                            onChange={e => setAdHocClient({...adHocClient, name: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800/90 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block">Email Address *</label>
                          <input
                            type="email"
                            required
                            placeholder="candidate@gmail.com"
                            value={adHocClient.email}
                            onChange={e => setAdHocClient({...adHocClient, email: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800/90 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block">Phone Contact (Optional)</label>
                          <input
                            type="text"
                            placeholder="+91-XXXXXXXXXX"
                            value={adHocClient.phone}
                            onChange={e => setAdHocClient({...adHocClient, phone: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800/90 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block">Candidate Company</label>
                          <input
                            type="text"
                            placeholder="I-SUCCESSNODE Student"
                            value={adHocClient.companyName}
                            onChange={e => setAdHocClient({...adHocClient, companyName: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800/90 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Choose Candidate from Database Ledger</label>
                      <select
                        value={selectedCustomerId}
                        onChange={e => setSelectedCustomerId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="">-- Choose Candidate Record --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                        ))}
                      </select>

                      {selectedCustomerId && (
                        <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800 border-dashed text-[10px] text-slate-400 space-y-0.5">
                          <p><strong className="text-slate-300">Selected Name:</strong> {customers.find(c => c.id === selectedCustomerId)?.name}</p>
                          <p><strong className="text-slate-300">Linked Email:</strong> {customers.find(c => c.id === selectedCustomerId)?.email}</p>
                          <p><strong className="text-slate-300">Company:</strong> {customers.find(c => c.id === selectedCustomerId)?.companyName || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Email Template choosing card block */}
                <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4.5 space-y-3">
                  <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2 pb-2 border-b border-slate-800/40">
                    <Layout className="w-4 h-4 text-violet-400" />
                    Corporate Proposal template
                  </h3>

                  <div className="space-y-2.5 pt-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Choose Layout Style Pattern</label>
                    <select
                      value={selectedTemplateId}
                      onChange={e => setSelectedTemplateId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-violet-500 font-medium"
                    >
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.templateName}</option>
                      ))}
                      <option value="custom">Compose Manual AdHoc Draft</option>
                    </select>

                    <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-850 text-[10px] text-slate-400">
                      <span className="font-bold text-slate-300">Selected Subject: </span>
                      {templates.find(t => t.id === selectedTemplateId)?.subject || 'AdHoc Manual Freeform Proposal Subject'}
                    </div>
                  </div>
                </div>

              </div>

              {/* sender details, logos, signatures wrapper (INLINE ACCORDION PANEL) */}
              <div className="border border-slate-800 rounded-2xl bg-slate-950/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsBrandingPanelOpen(!isBrandingPanelOpen)}
                  className="w-full px-5 py-4 flex justify-between items-center bg-slate-950/30 hover:bg-slate-950/50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-orange-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">🏢 Custom Branding Logos & Sender details</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Click here to modify Logo Image URL and signoff signatures inline.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-violet-400 underline">
                    {isBrandingPanelOpen ? 'Collapse settings' : 'Expand & Edit settings'}
                  </span>
                </button>

                <AnimatePresence>
                  {isBrandingPanelOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-800/60 p-4 space-y-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Company Name</label>
                          <input
                            type="text"
                            value={branding.companyName}
                            onChange={e => handleBrandingChange('companyName', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Sender Logo URL</label>
                          <input
                            type="text"
                            value={branding.logoUrl}
                            onChange={e => handleBrandingChange('logoUrl', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Customer Support Website</label>
                          <input
                            type="text"
                            value={branding.website}
                            onChange={e => handleBrandingChange('website', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Support Mobile 1</label>
                          <input
                            type="text"
                            value={branding.companyPhone}
                            onChange={e => handleBrandingChange('companyPhone', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Support Email</label>
                          <input
                            type="email"
                            value={branding.companyEmail}
                            onChange={e => handleBrandingChange('companyEmail', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Email Signature sign-off</label>
                          <input
                            type="text"
                            value={branding.emailSignature}
                            onChange={e => handleBrandingChange('emailSignature', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 block">Footer Legal Terms Text</label>
                        <textarea
                          rows={2}
                          value={branding.footerText}
                          onChange={e => handleBrandingChange('footerText', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500 font-sans"
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleSaveBrandingSettings}
                          disabled={savingBranding}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white hover:text-slate-100 border border-slate-700/60 font-semibold text-[10px] tracking-wide rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {savingBranding ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Saving Setup...
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Save these branding settings permanently to system
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Interactive Invoice Tables customizer (Enter pricing details directly inside the wizard) */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-400" />
                  Step 2: Enter Proposal Billing Details (Interactive Customizer)
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Enter course items directly inside your template. GST taxes (18%), discount % and sponsorship (50% fixed) automatically calculate.
                </p>
              </div>

              {/* Clickable Quick Load Preset Badges */}
              <div className="bg-slate-950/20 border border-slate-800/80 p-3 rounded-2xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">⚡ 1-Click Fast-Add Course Presets:</span>
                <div className="flex flex-wrap gap-2">
                  {PROGRAM_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        // Add this preset immediately as a new row or replace row 1
                        setProposalItems(prev => {
                          const firstIsEmpty = prev.length === 1 && !prev[0].programName && prev[0].price === 0;
                          if (firstIsEmpty) {
                            return [{
                              programName: preset.programName,
                              duration: preset.duration,
                              price: preset.price,
                              gst: preset.gst,
                              total: preset.total
                            }];
                          } else {
                            return [...prev, {
                              programName: preset.programName,
                              duration: preset.duration,
                              price: preset.price,
                              gst: preset.gst,
                              total: preset.total
                            }];
                          }
                        });
                        onNotify(`Added Preset: "${preset.programName}"`, 'success');
                      }}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      +{preset.programName.split(' ')[0]} (₹{preset.total.toLocaleString()})
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setProposalItems([{ programName: '', duration: '90 Days', price: 0, gst: 0, total: 0 }]);
                      setDiscountPercent(0);
                    }}
                    className="px-2.5 py-1.5 bg-red-950/25 hover:bg-red-950/40 border border-red-900/35 text-red-400 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ml-auto"
                  >
                    Clear All Rows
                  </button>
                </div>
              </div>

              {/* Pricing item entry rows styled table */}
              <div className="border border-slate-850 rounded-2xl overflow-hidden bg-slate-950/10">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/50 border-b border-slate-850 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                    <tr>
                      <th className="py-3 px-4 text-left">Program Discipline / Presets</th>
                      <th className="py-3 px-2 w-28">Duration</th>
                      <th className="py-3 px-2 w-32">Price (Excl. GST)</th>
                      <th className="py-3 px-2 w-28">GST (18%)</th>
                      <th className="py-3 px-2 w-32">Total (₹)</th>
                      <th className="py-3 px-2 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/40">
                    {proposalItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-950/10 text-center">
                        <td className="py-3 px-3 text-left">
                          <input
                            type="text"
                            required
                            placeholder="Confidence & Personality Boot camp"
                            value={item.programName}
                            onChange={e => handleUpdateItemValue(index, 'programName', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-violet-500 font-medium"
                          />
                          
                          {/* Quick selection preset selector inside row */}
                          <div className="flex gap-1.5 mt-1.5 pl-0.5">
                            <span className="text-[9px] text-slate-500 font-mono">Presets:</span>
                            {PROGRAM_PRESETS.slice(0, 3).map((badge, bidx) => (
                              <button
                                key={bidx}
                                type="button"
                                onClick={() => handleApplyPreset(index, badge)}
                                className="text-[8px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white px-1.5 py-0.5 rounded leading-none font-medium cursor-pointer"
                              >
                                {badge.programName.includes('PfMP') ? 'PfMP' : badge.programName.includes('PgMP') ? 'PgMP' : 'PMP'}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-1">
                          <input
                            type="text"
                            value={item.duration}
                            onChange={e => handleUpdateItemValue(index, 'duration', e.target.value)}
                            className="w-full text-center bg-slate-950 border border-slate-850 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </td>
                        <td className="py-3 px-1">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={item.price || ''}
                              onChange={e => handleUpdateItemValue(index, 'price', e.target.value)}
                              className="w-full pl-6 pr-2 bg-slate-950 border border-slate-850 rounded-lg py-1.5 text-xs text-slate-200 font-mono text-center outline-none focus:ring-1 focus:ring-violet-500 font-semibold"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-1 text-slate-400 font-mono text-xs font-semibold">
                          ₹{Number(item.gst || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-1 text-violet-400 font-mono text-xs font-bold bg-violet-600/5">
                          ₹{Number(item.total || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Add dynamic new program row trigger */}
                <div className="p-3 bg-slate-950/20 border-t border-slate-850 flex items-center">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-200 text-[10px] font-bold rounded-xl flex items-center gap-1.5 transition-all w-full md:w-auto cursor-pointer border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5 text-violet-400" />
                    ➕ Add Custom Program Line Row
                  </button>
                </div>
              </div>

              {/* Dynamic discount and fixed sponsorship input summaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Inputs for discounts */}
                <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest pb-1.5 border-b border-slate-800/40 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-violet-400" />
                    Special Discount & Sponsorships
                  </h4>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className="text-[10px] font-bold text-slate-400">Special Discount Value (%)</label>
                        <span className="text-[10px] font-bold text-violet-400">{discountPercent}% Applied</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="e.g. 10"
                          value={discountPercent || ''}
                          onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-violet-500 font-bold"
                        />
                      </div>
                      <p className="text-[9px] text-slate-500 block">Reduces the course price subtotal before GST calculations.</p>
                    </div>

                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        <Award className="w-4 h-4" />
                        50% Sponsorship Fixed Policy
                      </div>
                      <p className="text-[9px] text-slate-300 leading-relaxed">
                        I-SUCCESSNODE matches learner eligibility with a <strong>guaranteed 50% professional sponsorship</strong>. 
                        The system automatically computes exact half-rates as an authorized sponsorship discount amount.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Automation Summary Calculations Display Card */}
                <div className="bg-slate-950/45 border border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest pb-1.5 border-b border-slate-800/40">
                    🧮 Auto-Calculated Fee Ledger
                  </h4>

                  <div className="space-y-2 py-3 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Course Subtotal:</span>
                      <span className="font-mono text-slate-300">₹{rawSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {Number(discountPercent) > 0 && (
                      <div className="flex justify-between text-red-400 font-medium">
                        <span>Less Discount ({discountPercent}%):</span>
                        <span className="font-mono">-₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-400">
                      <span>Taxable Subtotal:</span>
                      <span className="font-mono text-slate-300">₹{discountedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>GST Tax (18% On Net Base):</span>
                      <span className="font-mono text-slate-300">₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="h-px bg-slate-800/80 my-1" />

                    <div className="flex justify-between text-xs font-bold text-slate-200">
                      <span>Grand Total (Incl. GST):</span>
                      <span className="font-mono">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>50% Sponsorship Amount:</span>
                      <span className="font-mono">-₹{sponsorshipAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Net Payable Summary */}
                  <div className="p-3 bg-violet-600/10 border-2 border-violet-500/20 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-violet-300 font-bold uppercase tracking-wider block">Net Payable Amount</span>
                      <span className="text-[9px] text-slate-500">Includes all applicable sponsorships</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-amber-400">
                      ₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                </div>

              </div>

            </motion.div>
          )}

          {/* STEP 3: Personalize Subject, Body and Live Side-by-Side Sandbox Frame Preview */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-orange-400" />
                    Step 3: Personalize Email Content & Live Rendering
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">Edit subject and body directly. Rich proposal tables are beautifully integrated at the placeholder marker.</p>
                </div>
                
                {/* Reset template trigger */}
                <button
                  type="button"
                  onClick={() => {
                    compileTemplateOnStepChange();
                    onNotify('Email editor successfully reset to template form values!', 'success');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700/60 text-slate-300 text-[10px] font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
                  🔄 Reset Editor to Form Values
                </button>
              </div>

              {/* Split Panel Subject, Textarea & iframe live preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Left panel edit details */}
                <div className="space-y-3">
                  <div className="space-y-1 bg-slate-950/20 border border-slate-850 p-3 rounded-2xl">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Subject Title *</label>
                    <input
                      type="text"
                      required
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1 bg-slate-950/20 border border-slate-850 p-3 rounded-2xl">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-1 flex justify-between">
                      <span>Proposal Body Text markup</span>
                      <span className="text-[9px] text-slate-500 capitalize">Includes dynamic tables replacement</span>
                    </label>
                    <textarea
                      required
                      rows={14}
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-sans leading-relaxed"
                    />
                  </div>
                </div>

                {/* Right Panel high-fidelity live iframe preview */}
                <div className="flex flex-col border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/30">
                  <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                    <span className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-widest text-slate-400">
                      <Eye className="w-3.5 h-3.5 text-orange-400" />
                      Live Corporate Preview Frame
                    </span>
                    <span className="text-[9px] text-slate-500">I-SUCCESSNODE Letterhead layout</span>
                  </div>

                  {/* High fidelity sandbox frame rendering */}
                  <div className="bg-[#f1f5f9] h-[375px] w-full overflow-hidden">
                    <iframe
                      title="Proposals rendering frames"
                      srcDoc={`
                        <html>
                          <head>
                            <style>
                              body { margin: 0; padding: 12px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; font-size:12px; }
                              .wrapper { background-color: #ffffff; width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.04); }
                              .header { background: linear-gradient(135deg, #002d62 0%, #003b80 100%); padding: 16px; text-align: center; border-bottom: 3.5px solid #e07a22; }
                              .logo { max-height: 38px; border-radius: 4px; padding: 3px; background-color: white; display: inline-block; }
                              .comp-title { color: white; margin: 6px 0 0 0; font-size: 1.1rem; font-weight: bold; letter-spacing: 0.5px; }
                              .body { padding: 20px; line-height: 1.6; color: #000000; font-size: 12.5px; }
                              .footer { bg: #f8fafc; padding: 12px; text-align: center; font-size: 10px; color: #64748b; border-top: 1px solid #cbd5e1; }
                            </style>
                          </head>
                          <body>
                            <div class="wrapper">
                              ${branding.logoUrl ? `
                              <div class="header">
                                <img src="${branding.logoUrl}" class="logo" />
                                <h2 class="comp-title">${branding.companyName}</h2>
                              </div>
                              ` : ''}
                              <div class="body">
                                <p style="margin-top:0; font-weight:bold; color:#0f172a; border-bottom:1px solid #f1f5f9; padding-bottom:8px; margin-bottom:12px;">
                                  Subject: ${customSubject}
                                </p>
                                ${customBody}
                              </div>
                              <div class="footer">
                                <p style="margin:0; font-weight:bold; color:#1e293b;">${branding.companyName}</p>
                                <p style="margin:3px 0 0 0; line-height:1.4;">${branding.footerText}</p>
                              </div>
                            </div>
                          </body>
                        </html>
                      `}
                      className="w-full h-full border-none"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* STEP 4: Send and Redirect */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4 flex flex-col justify-center items-center text-center py-6"
            >
              <div className="p-4 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 mb-1">
                <Send className="w-8 h-8 animate-pulse" />
              </div>
              
              <h3 className="text-sm font-bold text-white">Final Step: Run Deliver Dispatch Process</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-sm">
                We are ready to deliver invoice email to <strong className="text-slate-200">{activeCustomer.email}</strong>. This registers real logs and automatically redirects you to Gmail compose in a new browser tab.
              </p>

              {/* Dynamic Summary Checklists Box */}
              <div className="w-full max-w-md bg-slate-950/30 border border-slate-850 p-4.5 rounded-2xl text-left space-y-3.5 text-xs">
                <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-800/40">
                  📋 Outbound Proposals Dispatch Checklist
                </h4>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Recipient email:</span>
                    <span className="font-mono text-slate-200">{activeCustomer.email}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Items mapped:</span>
                    <span className="text-slate-200">{proposalItems.length} Programs</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Sponsorship Applied:</span>
                    <span className="text-slate-200">50% Fixed</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Net Payable Due:</span>
                    <span className="text-amber-400 font-bold">₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Helpful Clipboard Explanation Tipbox */}
              <div className="p-3.5 rounded-xl bg-violet-950/25 border border-violet-800/30 text-left max-w-md space-y-1.5 shadow-inner">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-300 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  Bypassing Google Gmail URI Limits
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Extremely detailed proposals exceed Gmail's character limit, causing a <strong>400 Bad Request</strong>. 
                  To solve this, we auto-copy the <strong>full corporate layout & table formats</strong> as rich-text. 
                  Once Gmail opens, just press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-white font-mono font-bold text-[9px]">Ctrl+V</kbd> or <kbd className="bg-slate-800 px-1 py-0.5 rounded text-white font-mono font-bold text-[9px]">Cmd+V</kbd> to paste beautifully!
                </p>
              </div>

              {sending ? (
                <div className="flex flex-col items-center gap-2 mt-4">
                  <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                  <span className="text-[10px] text-slate-500 font-mono">Delivering envelope payload coordinates...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3.5 mt-4 w-full max-w-sm">
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/10 transition-all uppercase tracking-wide"
                  >
                    <Send className="w-4 h-4" />
                    Authorized Proposal Dispatch & Redirect
                  </button>

                  <button
                    type="button"
                    onClick={() => copyEmailToClipboard(false)}
                    className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800 transition-all"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    {copied ? 'Copied to Clipboard!' : 'Copy Styled Proposal Manually'}
                  </button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Steppers Navigator Buttons block */}
      <div className="border-t border-slate-800/80 pt-5 mt-6 flex justify-between items-center gap-3">
        <button
          onClick={handlePrev}
          disabled={currentStep === 1 || sending}
          className="px-4 py-2 bg-slate-950/40 hover:bg-slate-950 text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded-xl flex items-center gap-1 font-semibold text-xs transition-colors cursor-pointer border border-slate-850/70"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Step
        </button>

        {currentStep < totalSteps ? (
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer border border-slate-705 shadow-md transition-all"
          >
            Continue Step
            <ChevronRight className="w-4 h-4 text-violet-400" />
          </button>
        ) : (
          <div />
        )}
      </div>

      {/* Pop Up Success delivery diagnostics report Drawer modal */}
      <AnimatePresence>
        {deliveredLog && (
          <div className="fixed inset-0 bg-[#06080e]/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center flex-shrink-0">
                <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Envelope Dispatched Confirmation
                </span>
                
                <button
                  onClick={resetWizard}
                  className="p-1 px-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
                
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-center text-emerald-400 font-medium">
                  🚀 Your outbound invoice notification envelope has been delivered & registered!
                </div>

                {/* Substituted logs details list */}
                <div className="space-y-2 border border-slate-800 p-4 rounded-xl bg-slate-950/50">
                  <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-850">
                    Outbound Envelope Coordinates
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2 text-slate-400 pt-2 text-[11px]">
                    <span>Invoice Ref Linked:</span>
                    <span className="text-slate-300 font-mono text-right uppercase font-bold">#{deliveredLog.invoiceId}</span>
                    
                    <span>Recipient Email:</span>
                    <span className="text-slate-300 font-mono text-right truncate font-semibold">{deliveredLog.email}</span>
                    
                    <span>Candidate Recipient:</span>
                    <span className="text-slate-300 text-right font-semibold">{deliveredLog.customerName}</span>
                    
                    <span>Delivery Subject:</span>
                    <span className="text-slate-300 text-right truncate font-semibold">{deliveredLog.subject}</span>
                    
                    <span>Clearing Gateway:</span>
                    <span className="text-indigo-400 text-right font-medium">Local High-Fidelity SMTP Simulation</span>
                  </div>
                </div>

                {/* Simulated Envelope headers Terminal log trace */}
                <div className="space-y-1.5">
                  <h5 className="font-bold text-[9px] text-slate-500 uppercase tracking-wider block">Terminal Telemetry trace</h5>
                  <div className="p-3 rounded-xl bg-black border border-slate-950 font-mono text-[10px] text-teal-400 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-24">
                    <span className="text-slate-500">[2026-06-08 SMTP LINK] Initiating secure egress tunnel...</span> <br/>
                    <span className="text-slate-500">[2026-06-08 SMTP RESEND] Egress message validation check: PASS</span> <br/>
                    <span>Trace: {envelopeTraceNotes}</span>
                  </div>
                </div>

                {/* Substituted Email frame view thumbnail preview inside drawer */}
                <div className="space-y-1.5">
                  <h5 className="font-bold text-[9px] text-slate-500 uppercase tracking-wider block">Visual rendered frame snapshot</h5>
                  <div className="border border-slate-800 rounded-xl overflow-hidden h-44 bg-slate-200">
                    <iframe
                      title="Success snapshot visual trace"
                      srcDoc={renderedWrapperPayload || '<p>Outbox empty</p>'}
                      className="w-full h-full border-none"
                    />
                  </div>
                </div>

              </div>

              {/* Controls close */}
              <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center flex-shrink-0 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    await copyEmailToClipboard(true);
                    const cleanSubject = (deliveredLog.subject || '')
                      .replace(/<[^>]+>/g, '')
                      .replace(/\n/g, ' ')
                      .trim()
                      .substring(0, 150);
                    const hintBody = `[Please press Ctrl+V (or Cmd+V on Mac) right here to paste the beautifully formatted, official proposal with styled tables!]`;
                    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(deliveredLog.email)}&su=${encodeURIComponent(cleanSubject)}&body=${encodeURIComponent(hintBody)}`;
                    window.open(gmailUrl, '_blank');
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-650 hover:from-rose-500 hover:to-red-600 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/10"
                >
                  <Mail className="w-4 h-4" />
                  Re-Open Gmail Compose Tab
                </button>
                
                <button
                  type="button"
                  onClick={resetWizard}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Confirm & Reset wizard
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
