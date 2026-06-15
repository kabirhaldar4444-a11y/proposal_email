/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer, Invoice, EmailTemplate, EmailLog, CompanySettings, User, UserRole, InvoiceStatus } from '../types';

// Storage item access helpers
const getStorageItem = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const item = localStorage.getItem(key);
  if (!item) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(item) as T;
  } catch (e) {
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// Seed databases
const defaultCustomers: Customer[] = [
  {
    id: 'cust_1',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@vertex-corp.io',
    phone: '+91 98765 43210',
    companyName: 'Vertex Tech Corp',
    designation: 'VP Engineering',
    address: 'Plot 42, Sector V, Salt Lake City, Kolkata, India',
    notes: 'Prefers corporate invoices with detailed breakdowns.',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cust_2',
    name: 'Anjali Nair',
    email: 'anjali.n@cloudscale.net',
    phone: '+91 88001 22998',
    companyName: 'CloudScale Inc',
    designation: 'Director of Operations',
    address: 'Adani Tech Park, Sector 62, Noida, UP, India',
    notes: 'Always checks for Complementary PMP Access offers.',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cust_3',
    name: 'Vikram Malhotra',
    email: 'vikram@pioneercapital.co',
    phone: '+91 99887 76655',
    companyName: 'Pioneer Capital',
    designation: 'Managing Partner',
    address: 'Bandra Kurla Complex, Mumbai, India',
    notes: 'Needs invoices dispatched immediately on generation.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const defaultSettings: CompanySettings = {
  companyName: 'I-SUCCESSNODE',
  companyPhone: '+91-7969325900',
  companyEmail: 'support@isuccessnode.com',
  website: 'www.isuccessnode.com',
  logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  footerText: 'This is an official training program proposal from I-SUCCESSNODE (OPC) Private Limited. All terms are structured to maintain optimal service transparency.',
  emailSignature: 'With professional regard,<br/><strong>Support Team</strong><br/>I-SUCCESSNODE (OPC) Private Limited'
};

const defaultInvoices: Invoice[] = [
  {
    id: 'inv_101',
    customerId: 'cust_1',
    grandTotal: 79000.00,
    sponsorshipAmount: 39500.00,
    payableAmount: 39500.00,
    status: InvoiceStatus.PAID,
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item_1',
        invoiceId: 'inv_101',
        programName: 'PfMP Core Certification Preparation',
        duration: '90 Days',
        price: 33474.58,
        gst: 5025.42,
        total: 38500.00
      },
      {
        id: 'item_2',
        invoiceId: 'inv_101',
        programName: 'PgMP Professional Blueprint Course',
        duration: '90 Days',
        price: 33474.58,
        gst: 6025.42,
        total: 39500.00
      },
      {
        id: 'item_3',
        invoiceId: 'inv_101',
        programName: 'PMP Training (Complementary Access)',
        duration: '90 Days',
        price: 0,
        gst: 0,
        total: 0
      }
    ]
  },
  {
    id: 'inv_102',
    customerId: 'cust_2',
    grandTotal: 38500.00,
    sponsorshipAmount: 0.00,
    payableAmount: 38500.00,
    status: InvoiceStatus.PENDING,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item_4',
        invoiceId: 'inv_102',
        programName: 'PfMP Core Certification Preparation',
        duration: '90 Days',
        price: 33474.58,
        gst: 5025.42,
        total: 38500.00
      }
    ]
  }
];

const defaultTemplates: EmailTemplate[] = [
  {
    id: 'temp_isuccessnode',
    templateName: 'I-SUCCESSNODE Course Proposal Template',
    subject: 'Thank you for your interest - Proposal from I-SUCCESSNODE',
    category: 'Sponsorship',
    createdAt: new Date().toISOString(),
    htmlContent: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Greetings from <strong>I-SUCCESSNODE (OPC) Private Limited</strong>!</p>
<p>It was a pleasure speaking with you earlier. We appreciate your interest in our professional training and development programs. As discussed, please find below the details of our proposal along with the course fee and next steps.</p>

<p><strong>About Our Services:</strong></p>
<p>At I-SUCCESSNODE, we focus on helping individuals strengthen their personal and professional skills to achieve greater success in their careers. Our training model is designed for working professionals and aspirants who are looking to upgrade their confidence, communication, leadership, and overall personality to stand out in their professional journey.</p>

<p>We understand that every learner has unique goals, so we ensure that each participant receives personalized guidance from industry experts and experienced trainers.</p>

{{invoice_table}}

<p><strong>Next Steps:</strong></p>
<ol>
  <li>Review the pricing structure above showing your 50% fixed sponsorship coverage.</li>
  <li>Confirm your selected course slots and batch timings with your accounts executive.</li>
  <li>Complete enrollment payment via the invoice checkout link.</li>
</ol>

<p>Should you have any queries, please feel free to reach out to us at {{company_email}} or {{company_phone}}.</p>

<p>{{email_signature}}</p>`
  },
  {
    id: 'temp_invoice',
    templateName: 'Official Corporate Billing Statement',
    subject: 'Professional Training Billing Statement - #{{proposalNumber}}',
    category: 'Billing',
    createdAt: new Date().toISOString(),
    htmlContent: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Please find enclosed our formal invoice statement <strong>#{{proposalNumber}}</strong> for the professional education accreditation training packages on behalf of <strong>{{company_name}}</strong>.</p>

{{invoice_table}}

<p><strong>Payment Directives:</strong></p>
<p>All training fees are structured inclusive of national services taxations (GST 18%). Kindly remit the net payable amount at your earliest convenience to lock in batch calendars.</p>

<p>Sincerely yours,<br/>{{email_signature}}</p>`
  },
  {
    id: 'temp_reminder',
    templateName: 'Delayed Payment Notification',
    subject: 'Payment Reminder for Proposal #{{proposalNumber}}',
    category: 'Reminder',
    createdAt: new Date().toISOString(),
    htmlContent: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>This is a friendly reminder that the invoice statement <strong>#{{proposalNumber}}</strong> remains outstanding. We request you to complete settlement at your earliest convenience to proceed with your live workshop onboarding.</p>

{{invoice_table}}

<p>If payment has already been initiated, please ignore this notice, or share receipt logs with us at {{company_email}}.</p>

<p>{{email_signature}}</p>`
  },
  {
    id: 'temp_installment',
    templateName: 'Payment Installment Follow-up',
    subject: 'Pending Installment Invoice - {{company_name}} Plan',
    category: 'Billing',
    createdAt: new Date().toISOString(),
    htmlContent: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>This is a friendly reminder regarding the pending fee installment for your training program with <strong>I-SUCCESSNODE (OPC) Private Limited</strong>.</p>
<p>Please find below the updated invoice breakdown for your selected courses:</p>

{{invoice_table}}

<p>To avoid any disruption to your course access, mock exams, or mentor sessions, please process the payment of <strong>₹{{payable_amount}}</strong> at your earliest convenience.</p>
<p>You can complete the payment online at: <a href="https://www.isuccessnode.com/payment.html" style="color: #4f46e5; text-decoration: underline; font-weight: 500;">https://www.isuccessnode.com/payment.html</a></p>
<p>If you have already made this payment, please reply to this email with the payment confirmation receipt so we can update your ledger.</p>
<p>Should you have any questions or require support, please contact our finance desk at <strong>{{company_phone}}</strong> or reply to this email.</p>
<p>{{email_signature}}</p>`
  },
  {
    id: 'temp_scholarship',
    templateName: 'Scholarship Approval Confirmation',
    subject: 'Congratulations! 50% Scholarship Approved - {{customer_name}}',
    category: 'Onboarding',
    createdAt: new Date().toISOString(),
    htmlContent: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>We are thrilled to inform you that your application for the <strong>I-SUCCESSNODE Professional Scholarship Support</strong> has been officially approved by our academic committee!</p>
<p>As a recipient, you are entitled to a **50% sponsorship coverage** on your selected professional training and personality development programs.</p>
<p>Below is your approved customized fee structure reflecting the scholarship benefit:</p>

{{invoice_table}}

<p><strong>Next Steps to Secure Your Enrolment:</strong></p>
<ol>
  <li>Submit the official Order Confirmation form at <a href="https://www.isuccessnode.com/contact.html" style="color: #4f46e5; text-decoration: underline;">https://www.isuccessnode.com/contact.html</a>.</li>
  <li>Complete the net payable fee of <strong>₹{{payable_amount}}</strong> within 3 working days.</li>
  <li>Check your email for your dedicated mentor assignment and training module access credentials.</li>
</ol>
<p>We congratulate you once again and look forward to being a part of your professional career acceleration journey.</p>
<p>{{email_signature}}</p>`
  },
  {
    id: 'temp_exam',
    templateName: 'Pre-Board Exam Instructions',
    subject: 'Pre-Board Assessment Guidelines & Login Details - {{customer_name}}',
    category: 'Operational',
    createdAt: new Date().toISOString(),
    htmlContent: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Welcome to the training evaluation phase at <strong>I-SUCCESSNODE (OPC) Private Limited</strong>!</p>
<p>As part of our commitment to structured learning, a mandatory **Pre-Board Evaluation Exam** has been scheduled for you. This assessment helps us customize your training blueprint before the final certification attempt.</p>
<p><strong>Exam Guidelines:</strong></p>
<ul>
  <li><strong>Schedule:</strong> To be attempted within the next 24 to 48 hours.</li>
  <li><strong>Format:</strong> Online multiple-choice questionnaire.</li>
  <li><strong>Duration:</strong> 60 minutes.</li>
  <li><strong>Scope:</strong> Evaluates confidence, public communication, and professional situational judgement.</li>
</ul>
<p>Your curriculum fee overview is documented below:</p>

{{invoice_table}}

<p>Please login to your exam dashboard at <a href="https://www.isuccessnode.com/exams" style="color: #4f46e5; text-decoration: underline;">https://www.isuccessnode.com/exams</a> using your registered email: <strong>{{customer_email}}</strong>.</p>
<p>Your initial PC softcopy certificate representing your training enrollment status will be processed within 48 to 72 hours of attempting this exam.</p>
<p>If you encounter any technical issues during the exam, please contact support immediately at <strong>{{company_phone}}</strong>.</p>
<p>{{email_signature}}</p>`
  }
];

const defaultLogs: EmailLog[] = [
  {
    id: 'log_1',
    customerId: 'cust_1',
    invoiceId: 'inv_101',
    templateId: 'temp_isuccessnode',
    email: 'rahul.sharma@vertex-corp.io',
    subject: 'Thank you for your interest - Proposal from I-SUCCESSNODE',
    status: 'Delivered',
    sentAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    customerName: 'Rahul Sharma',
    templateName: 'I-SUCCESSNODE Course Proposal Template',
    invoiceTotal: 39500.00
  }
];

// Seed basic users
const defaultUsers: User[] = [
  {
    id: 'usr_admin',
    name: 'Yatindra Singh',
    email: 'support@isuccessnode.com',
    role: UserRole.ADMIN,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_admin2',
    name: 'System Admin',
    email: 'admin@invoicemailer.pro',
    role: UserRole.ADMIN,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_staff',
    name: 'Billing Executive',
    email: 'staff@invoicemailer.pro',
    role: UserRole.STAFF,
    createdAt: new Date().toISOString()
  }
];

export const api = {
  auth: {
    login: async (body: any) => {
      const users = getStorageItem<User[]>('isucc_users', defaultUsers);
      const user = users.find(u => u.email.toLowerCase() === body.email.toLowerCase());
      
      // Allow simple demo logins matching current app conventions
      if (user && (body.password === 'admin' || body.password === 'staff' || body.password === 'support' || body.password === 'admin@invoicemailer.pro' || body.password)) {
        return { user, token: 'mock_token_' + user.id };
      }
      
      // Match hardcoded credentials fallback
      if (body.email === 'admin@invoicemailer.pro' && body.password === 'admin') {
        return { user: users[1], token: 'mock_token_admin' };
      }
      if (body.email === 'staff@invoicemailer.pro' && body.password === 'staff') {
        return { user: users[2], token: 'mock_token_staff' };
      }
      if (body.email?.toLowerCase() === 'support@isuccessnode.com') {
        return { user: users[0], token: 'mock_token_yatindra' };
      }
      
      throw new Error('Administrative credentials invalid. Verify details or use demo keys.');
    },
    
    register: async (body: any) => {
      const users = getStorageItem<User[]>('isucc_users', defaultUsers);
      const exists = users.find(u => u.email.toLowerCase() === body.email.toLowerCase());
      if (exists) {
        throw new Error('A security account already exists under this email coordinate.');
      }
      const newUser: User = {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        name: body.name,
        email: body.email,
        role: body.role || UserRole.ADMIN,
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      setStorageItem('isucc_users', users);
      return { user: newUser, token: 'mock_token_' + newUser.id };
    },
    
    forgotPassword: async (email: string) => {
      return { message: `Verification check check dispatched successfully to ${email}.` };
    },
  },

  customers: {
    list: async (query = '') => {
      const list = getStorageItem<Customer[]>('isucc_customers', defaultCustomers);
      if (!query) return list;
      const q = query.toLowerCase();
      return list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.email.toLowerCase().includes(q) || 
        (c.companyName && c.companyName.toLowerCase().includes(q))
      );
    },
    
    create: async (data: Partial<Customer>) => {
      const list = getStorageItem<Customer[]>('isucc_customers', defaultCustomers);
      const newCust: Customer = {
        id: 'cust_' + Math.random().toString(36).substring(2, 9),
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        companyName: data.companyName || '',
        designation: data.designation || '',
        address: data.address || '',
        notes: data.notes || '',
        createdAt: new Date().toISOString()
      };
      list.unshift(newCust); // Put newest at the top
      setStorageItem('isucc_customers', list);
      return newCust;
    },
    
    update: async (id: string, data: Partial<Customer>) => {
      const list = getStorageItem<Customer[]>('isucc_customers', defaultCustomers);
      const idx = list.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Customer profile not located.');
      const updated = { ...list[idx], ...data };
      list[idx] = updated;
      setStorageItem('isucc_customers', list);
      return updated;
    },
    
    delete: async (id: string) => {
      const list = getStorageItem<Customer[]>('isucc_customers', defaultCustomers);
      const updated = list.filter(c => c.id !== id);
      setStorageItem('isucc_customers', updated);
      return { success: true, message: 'Customer profile coordinates removed.' };
    },
  },

  invoices: {
    list: async () => {
      return getStorageItem<Invoice[]>('isucc_invoices', defaultInvoices);
    },
    
    create: async (data: { 
      customerId: string; 
      items: any[]; 
      sponsorshipAmount: number; 
      status: string;
      grandTotal?: number;
      payableAmount?: number;
    }) => {
      const list = getStorageItem<Invoice[]>('isucc_invoices', defaultInvoices);
      
      // Auto-compute next clean billing index sequence
      let nextNum = 103;
      list.forEach(inv => {
        const match = inv.id.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num >= nextNum) nextNum = num + 1;
        }
      });

      const newInvoiceId = `inv_${nextNum}`;

      const invoiceItems = data.items.map((item, idx) => {
        const priceVal = Number(item.price) || 0;
        const gstVal = item.gstAmount !== undefined && !isNaN(Number(item.gstAmount)) 
          ? Number(item.gstAmount) 
          : (Number(item.gst) || 0);
        const rowTotal = Number(item.total) || (priceVal + gstVal);
        return {
          id: `item_${Date.now()}_${idx}`,
          invoiceId: newInvoiceId,
          programName: item.programName || 'Training Development Program',
          duration: item.duration || '90 Days',
          price: priceVal,
          gst: gstVal,
          total: rowTotal
        };
      });

      const subTotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
      const grand = data.grandTotal !== undefined ? data.grandTotal : subTotal;
      const sponsor = data.sponsorshipAmount !== undefined ? data.sponsorshipAmount : Math.round(grand * 0.5 * 100) / 100;
      const payable = data.payableAmount !== undefined ? data.payableAmount : Math.max(0, grand - sponsor);

      const newInvoice: Invoice = {
        id: newInvoiceId,
        customerId: data.customerId,
        grandTotal: Math.round(grand * 100) / 100,
        sponsorshipAmount: Math.round(sponsor * 100) / 100,
        payableAmount: Math.round(payable * 100) / 100,
        status: (data.status as InvoiceStatus) || InvoiceStatus.PENDING,
        createdAt: new Date().toISOString(),
        items: invoiceItems
      };

      list.unshift(newInvoice); // Put newest on top
      setStorageItem('isucc_invoices', list);
      return newInvoice;
    },
    
    updateStatus: async (id: string, status: string) => {
      const list = getStorageItem<Invoice[]>('isucc_invoices', defaultInvoices);
      const idx = list.findIndex(inv => inv.id === id);
      if (idx === -1) throw new Error('Invoice billing ledger object not located.');
      list[idx].status = status as InvoiceStatus;
      setStorageItem('isucc_invoices', list);
      return list[idx];
    },

    delete: async (id: string) => {
      const list = getStorageItem<Invoice[]>('isucc_invoices', defaultInvoices);
      const updated = list.filter(inv => inv.id !== id);
      setStorageItem('isucc_invoices', updated);
      return { success: true, message: 'Billing statement discarded.' };
    },
  },

  templates: {
    list: async () => {
      return getStorageItem<EmailTemplate[]>('isucc_templates', defaultTemplates);
    },
    
    create: async (data: Partial<EmailTemplate>) => {
      const list = getStorageItem<EmailTemplate[]>('isucc_templates', defaultTemplates);
      const newTemp: EmailTemplate = {
        id: 'temp_' + Math.random().toString(36).substring(2, 9),
        templateName: data.templateName || 'Modified Message Layout',
        subject: data.subject || '',
        htmlContent: data.htmlContent || '',
        category: data.category || 'Billing',
        createdAt: new Date().toISOString()
      };
      list.unshift(newTemp); // Newest on top
      setStorageItem('isucc_templates', list);
      return newTemp;
    },
    
    update: async (id: string, data: Partial<EmailTemplate>) => {
      const list = getStorageItem<EmailTemplate[]>('isucc_templates', defaultTemplates);
      const idx = list.findIndex(t => t.id === id);
      if (idx === -1) throw new Error('Template schema not located.');
      const updated = { ...list[idx], ...data };
      list[idx] = updated;
      setStorageItem('isucc_templates', list);
      return updated;
    },
    
    delete: async (id: string) => {
      const list = getStorageItem<EmailTemplate[]>('isucc_templates', defaultTemplates);
      const updated = list.filter(t => t.id !== id);
      setStorageItem('isucc_templates', updated);
      return { success: true, message: 'Template layout removed.' };
    },
    
    duplicate: async (id: string) => {
      const list = getStorageItem<EmailTemplate[]>('isucc_templates', defaultTemplates);
      const target = list.find(t => t.id === id);
      if (!target) throw new Error('Template source not located.');
      const duplicated: EmailTemplate = {
        ...target,
        id: 'temp_' + Math.random().toString(36).substring(2, 9),
        templateName: `${target.templateName} (Copy)`,
        createdAt: new Date().toISOString()
      };
      list.unshift(duplicated); // Newest on top
      setStorageItem('isucc_templates', list);
      return duplicated;
    },
  },

  emailLogs: {
    list: async () => {
      return getStorageItem<EmailLog[]>('isucc_logs', defaultLogs);
    },
    
    send: async (data: {
      customerId: string;
      invoiceId: string;
      templateId?: string;
      customSubject?: string;
      customBody?: string;
    }) => {
      const logs = getStorageItem<EmailLog[]>('isucc_logs', defaultLogs);
      const customers = getStorageItem<Customer[]>('isucc_customers', defaultCustomers);
      const invoices = getStorageItem<Invoice[]>('isucc_invoices', defaultInvoices);
      const templates = getStorageItem<EmailTemplate[]>('isucc_templates', defaultTemplates);

      const cust = customers.find(c => c.id === data.customerId);
      const inv = invoices.find(i => i.id === data.invoiceId);
      const temp = templates.find(t => t.id === data.templateId);

      const emailStr = cust ? cust.email : 'candidate@isuccessnode.com';
      const custName = cust ? cust.name : 'Unknown Candidate';
      const tempName = temp ? temp.templateName : 'AdHoc Custom Draft';
      const invoiceTotal = inv ? inv.payableAmount : 0;

      const newLogId = 'log_' + Math.random().toString(36).substring(2, 9);
      const newLog: EmailLog = {
        id: newLogId,
        customerId: data.customerId,
        invoiceId: data.invoiceId,
        templateId: data.templateId,
        email: emailStr,
        subject: data.customSubject || 'Professional Course Training Proposal',
        status: 'Delivered',
        sentAt: new Date().toISOString(),
        customerName: custName,
        templateName: tempName,
        invoiceTotal: invoiceTotal
      };

      const settings = getStorageItem<CompanySettings>('isucc_settings', defaultSettings);
      const resendApiKey = settings.resendApiKey;
      let trackingNotes = '';
      
      const deliveredPayload = data.customBody || `<p>No Email Body Provided</p>`;

      if (resendApiKey) {
        try {
          const response = await fetch('/api/send-email-direct', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              to: emailStr,
              subject: data.customSubject || 'Professional Course Training Proposal',
              html: deliveredPayload,
              apiKey: resendApiKey,
              fromName: settings.companyName
            })
          });

          if (response.ok) {
            const resData = await response.json();
            trackingNotes = `Dispatched successfully via Resend API (ID: ${resData.id})`;
            newLog.status = 'Delivered';
          } else {
            const errJson = await response.json();
            trackingNotes = `Resend API Error: ${errJson.error || 'Unknown error'}`;
            newLog.status = 'Failed';
          }
        } catch (err: any) {
          trackingNotes = `Connection Failed: ${err.message}`;
          newLog.status = 'Failed';
        }
      } else {
        trackingNotes = `MESSAGE_ID=[${newLogId.toUpperCase()}] status:DELIVERED transit_time=32ms gateway_channel=[AWS-SES-MOCK-TLS] encryption=AES_256_GCM`;
      }

      logs.unshift(newLog); // Put newest on top
      setStorageItem('isucc_logs', logs);

      return {
        success: true,
        message: resendApiKey ? 'Proposal dispatched directly.' : 'Proposal successfully prepared for Gmail API transmission.',
        log: newLog,
        trackingNotes,
        deliveredPayload
      };
    },
  },

  settings: {
    get: async () => {
      return getStorageItem<CompanySettings>('isucc_settings', defaultSettings);
    },
    
    save: async (data: Partial<CompanySettings>) => {
      const current = getStorageItem<CompanySettings>('isucc_settings', defaultSettings);
      const updated = { ...current, ...data };
      setStorageItem('isucc_settings', updated);
      return updated;
    },
  },
};
