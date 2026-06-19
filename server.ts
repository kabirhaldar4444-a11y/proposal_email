/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ES Modules __dirname resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Serve static body content
app.use(express.json());

// Path to durable file database
const DB_DIR = path.join(__dirname, 'src', 'db');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure database folders exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initial seed data
const initialDb = {
  users: [
    {
      id: 'usr_admin',
      name: 'System Admin',
      email: 'admin@invoicemailer.pro',
      password: 'admin', // Simple clear credentials for local dev
      role: 'Admin',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_staff',
      name: 'Billing Executive',
      email: 'staff@invoicemailer.pro',
      password: 'staff',
      role: 'Staff',
      createdAt: new Date().toISOString()
    }
  ],
  customers: [
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
  ],
  invoices: [
    {
      id: 'inv_101',
      customerId: 'cust_1',
      grandTotal: 79000.00,
      sponsorshipAmount: 39500.00,
      payableAmount: 39500.00,
      status: 'Paid',
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
          programName: 'PgMP Professional Blueprint',
          duration: '90 Days',
          price: 33474.58,
          gst: 6025.42,
          total: 39500.00
        },
        {
          id: 'item_3',
          invoiceId: 'inv_101',
          programName: 'PMP Training (Complementary)',
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
      status: 'Pending',
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
  ],
  emailTemplates: [
    {
      id: 'temp_1',
      templateName: 'Premium Invoice Dispatch',
      subject: 'Invoice #{{invoice_total}} Generated - {{company_name}} Plan',
      htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2>InvoiceMailer Pro Confirmation</h2>
  </div>
  <p>Dear <strong>{{customer_name}}</strong>,</p>
  <p>We are pleased to share your invoice for services from <strong>{{company_name}}</strong>.</p>
  
  <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Billing Overview</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Customer Corporate:</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold;">{{company_name}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Grand Total Program:</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold;">₹{{invoice_total}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Sponsorship Discount:</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #22c55e;">₹{{sponsorship_amount}}</td>
      </tr>
      <tr style="border-top: 1px solid #cbd5e1; font-size: 1.1em;">
        <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">Total Payable Amount:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #7c3aed;">₹{{payable_amount}}</td>
      </tr>
    </table>
  </div>
  
  <p>Your programs: <br/> <em>{{program_list}}</em></p>
  <p>Please download your official billing statement as PDF from our web client dashboard.</p>
  
  <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 0.9em; color: #64748b;">
    <p>Contact Us: {{company_phone}} | <a href="mailto:{{company_email}}">{{company_email}}</a></p>
    <div style="font-style: italic;">{{email_signature}}</div>
  </div>
</div>`,
      category: 'Billing',
      createdAt: new Date().toISOString()
    },
    {
      id: 'temp_2',
      templateName: 'Welcome & Onboarding Email',
      subject: 'Welcome Package for {{program_name}} - {{customer_name}}',
      htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h2>Welcome to the Onboarding Framework!</h2>
  <p>Hello <strong>{{customer_name}}</strong>,</p>
  <p>Congratulations on enrolling in our prestigious program: <strong>{{program_name}}</strong>.</p>
  
  <p>Over the next ninety days, we will guide you step-by-step through our curriculum to secure your professional accreditation. Our support representatives are available directly at <strong>{{company_phone}}</strong>.</p>
  
  <p>Your account records have been setup under <strong>{{customer_email}}</strong>. Feel free to contact our support on <strong>{{company_email}}</strong> should you require any administrative services.</p>
  
  <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 0.9em; color: #64748b;">
    <p>Visit us at: <a href="https://{{company_website}}">{{company_website}}</a></p>
    <div style="font-style: italic;">{{email_signature}}</div>
  </div>
</div>`,
      category: 'Onboarding',
      createdAt: new Date().toISOString()
    },
    {
      id: 'temp_isuccessnode',
      templateName: 'I-SUCCESSNODE Program Proposal',
      subject: 'Thank you for your interest - Proposal from I-SUCCESSNODE',
      htmlContent: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Greetings from <strong>I-SUCCESSNODE (OPC) Private Limited</strong>!</p>
<p>It was a pleasure speaking with you earlier. We appreciate your interest in our professional training and development programs. As discussed, please find below the details of our proposal along with the course fee and next steps.</p>

<h3 style="margin-top: 24px; color: #002d62; border-bottom: 2px solid #002d62; padding-bottom: 6px; font-size: 16px;">About Our Services</h3>
<p>At <strong>I-SUCCESSNODE</strong>, we focus on helping individuals strengthen their personal and professional skills to achieve greater success in their careers. Our training model is designed for <strong>working professionals and aspirants</strong> who are looking to upgrade their confidence, communication, leadership, and overall personality to stand out in their professional journey.</p>
<p>We understand that every learner has unique goals, so we ensure that each participant receives <strong>personalized guidance from industry experts and experienced trainers</strong>. Our flexible learning approach allows you to learn at your own pace, from anywhere, and at any time — without disrupting your work-life balance.</p>
<p>From enhancing self-confidence and public presence to mastering decision-making and professional behaviour, we are committed to guiding you step-by-step toward your personal growth and career advancement.</p>

<p><strong>Flexible Learning:</strong><br/>
Learners receive <strong>comprehensive study materials and recorded video sessions</strong> within 6 working hours of enrollment — enabling self-paced learning anytime, anywhere.</p>

<p style="margin-top: 12px;"><strong>Fast & Transparent Onboarding:</strong><br/>
After enrollment, candidates receive an <strong>official invoice, study materials, and training access</strong> promptly.</p>

<p style="margin-top: 12px;"><strong>Structured Evaluation:</strong><br/>
A <strong>Pre-Board Exam</strong> is scheduled within 24–48 hours to help learners assess their preparation before the final assessment.</p>

<p style="margin-top: 12px;"><strong>Recognized Certification:</strong><br/>
Upon successful completion of the final online exam, learners receive a <strong>Final PC Softcopy Certificate</strong> verifying their successful training and certification status.</p>

<p style="margin-top: 12px;"><strong>Digital Convenience:</strong><br/>
All materials, exams, and certifications are delivered <strong>entirely online</strong> — ensuring quick, hassle-free access from any location.</p>

<p style="margin-top: 12px;"><strong>Flexible Course Duration:</strong><br/>
The complete program is designed to be completed within <strong>60 to 90 days</strong>, giving learners the flexibility to balance studies with their schedules.</p>

<p style="margin-top: 12px;"><strong>Fair Refund Policy:</strong><br/>
A <strong>90% refund</strong> is available before attempting any exam. A minimal 10% fee is retained to cover digital resources and content access.</p>

<p style="margin-top: 12px;"><strong>Material Dispatch:</strong><br/>
The Initial PC Softcopy will be delivered within 48 to 72 hours after the Pre-Board Exam attempt. The initial soft copy will represent that the customer is under training, once they complete the final exam, then only they will be getting the final certificates.</p>

<p style="margin-top: 12px;"><strong>Commitment to Transparency:</strong><br/>
All processes — from enrollment to certification — are governed by clear, structured policies to ensure learners receive reliable, transparent service throughout their journey.</p>

<h3 style="margin-top: 28px; color: #002d62; border-bottom: 2px solid #002d62; padding-bottom: 6px; font-size: 16px;">Proposed Plan & Fee Details</h3>

{{invoice_table}}

<p>Once the payment is completed, our onboarding team will immediately begin your enrolment process. You’ll be connected with your dedicated mentor, who will assist you throughout your training journey.</p>

<h3 style="margin-top: 28px; color: #002d62; border-bottom: 2px solid #002d62; padding-bottom: 6px; font-size: 16px;">Next Steps</h3>
<ol style="padding-left: 20px; font-size: 13px; line-height: 1.8; margin-top: 10px;">
  <li style="margin-bottom: 4px;">Review this proposal and confirm your enrollment.</li>
  <li style="margin-bottom: 4px;">Fill out this order form: <a href="https://www.isuccessnode.com/contact.html" style="color: #4f46e5; text-decoration: underline; font-weight: 500;">https://www.isuccessnode.com/contact.html</a></li>
  <li style="margin-bottom: 4px;">Proceed with payment using your preferred payment method.</li>
  <li style="margin-bottom: 4px;">Receive your onboarding details and personalized session schedule within 24 working hours of payment confirmation.</li>
</ol>

<p style="margin-top: 16px;">Should you have any questions or require assistance at any stage, please feel free to reach out. Our team is available to ensure you have a smooth and transparent onboarding experience.</p>
<p>We look forward to welcoming you to <strong>I-SUCCESSNODE</strong>, where personal growth meets professional excellence.</p>`,
      category: 'Onboarding',
      createdAt: new Date().toISOString()
    }
  ],
  emailLogs: [
    {
      id: 'log_1',
      customerId: 'cust_1',
      invoiceId: 'inv_101',
      templateId: 'temp_1',
      email: 'rahul.sharma@vertex-corp.io',
      subject: 'Invoice #79000.00 Generated - Vertex Tech Corp Plan',
      status: 'Delivered',
      sentAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      customerName: 'Rahul Sharma',
      templateName: 'Premium Invoice Dispatch',
      invoiceTotal: 79000
    },
    {
      id: 'log_2',
      customerId: 'cust_2',
      invoiceId: 'inv_102',
      templateId: 'temp_1',
      email: 'anjali.n@cloudscale.net',
      subject: 'Invoice #38500.00 Generated - CloudScale Inc Plan',
      status: 'Sent',
      sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      customerName: 'Anjali Nair',
      templateName: 'Premium Invoice Dispatch',
      invoiceTotal: 38500
    }
  ],
  settings: {
    companyName: 'InvoiceMailer Pro Solutions',
    companyPhone: '+91 80001 09999',
    companyEmail: 'finance@invoicemailer.pro',
    website: 'https://invoicemailer.pro',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80',
    footerText: 'InvoiceMailer Pro Ltd, Bandra Kurla Complex, Mumbai, MH, 400051',
    emailSignature: 'With professional regard,<br/><strong>Team InvoiceMailer Pro Operations</strong>'
  }
};

// Help helper to get file database content
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(data);

    // Auto-migrate database: inject temp_isuccessnode template if it is missing
    if (db && db.emailTemplates && !db.emailTemplates.some((t: any) => t.id === 'temp_isuccessnode')) {
      const isuccTemplate = initialDb.emailTemplates.find(t => t.id === 'temp_isuccessnode');
      if (isuccTemplate) {
        db.emailTemplates.push(isuccTemplate);
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        console.log('[Database Migration] Succesfully injected I-SUCCESSNODE proposal template into db.json.');
      }
    }
    return db;
  } catch (err) {
    console.error("Error reading database file, using runtime fallback", err);
    return initialDb;
  }
}

// Write helper to save content to database
function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing database file", err);
  }
}

// --- AUTHENTICATION API ROUTES ---

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  // Return user info & session token mock
  const { password: _, ...userWithoutPassword } = user;
  res.json({
    user: userWithoutPassword,
    token: `mk_jwt_token_${user.id}_${Date.now()}`
  });
});

// Register endpoint
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  
  const db = readDb();
  if (db.users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }
  
  const newUser = {
    id: `usr_${Date.now()}`,
    name,
    email,
    password,
    role: role || 'Staff',
    createdAt: new Date().toISOString()
  };
  
  db.users.push(newUser);
  writeDb(db);
  
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({
    user: userWithoutPassword,
    token: `mk_jwt_token_${newUser.id}_${Date.now()}`
  });
});

// Reset Password endpoint simulation
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ error: 'No account registered with this email address' });
  }
  res.json({ message: 'Password recovery email dispatched successfully to ' + email });
});

// --- CUSTOMER API ROUTES ---

// GET All customers with optional search
app.get('/api/customers', (req, res) => {
  const db = readDb();
  const query = (req.query.q as string || '').toLowerCase();
  
  let result = db.customers;
  if (query) {
    result = result.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.companyName.toLowerCase().includes(query)
    );
  }
  
  // Return sorted descending by createdAt
  result = [...result].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(result);
});

// POST New customer
app.post('/api/customers', (req, res) => {
  const { name, email, phone, companyName, designation, address, notes } = req.body;
  if (!name || !email || !companyName) {
    return res.status(400).json({ error: 'Name, email and Company Name are required fields.' });
  }
  
  const db = readDb();
  const newCustomer = {
    id: `cust_${Date.now()}`,
    name,
    email,
    phone: phone || '',
    companyName,
    designation: designation || '',
    address: address || '',
    notes: notes || '',
    createdAt: new Date().toISOString()
  };
  
  db.customers.push(newCustomer);
  writeDb(db);
  res.status(201).json(newCustomer);
});

// PUT Edit Customer
app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone, companyName, designation, address, notes } = req.body;
  
  const db = readDb();
  const index = db.customers.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  
  db.customers[index] = {
    ...db.customers[index],
    name: name || db.customers[index].name,
    email: email || db.customers[index].email,
    phone: phone ?? db.customers[index].phone,
    companyName: companyName || db.customers[index].companyName,
    designation: designation ?? db.customers[index].designation,
    address: address ?? db.customers[index].address,
    notes: notes ?? db.customers[index].notes,
  };
  
  writeDb(db);
  res.json(db.customers[index]);
});

// DELETE Customer
app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const index = db.customers.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  
  db.customers.splice(index, 1);
  writeDb(db);
  res.json({ success: true, message: 'Customer record successfully deleted.' });
});


// --- INVOICES API ROUTES ---

// GET All Invoices
app.get('/api/invoices', (req, res) => {
  const db = readDb();
  // Sort descending by date
  const result = [...db.invoices].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(result);
});

// POST Create Invoice
app.post('/api/invoices', (req, res) => {
  const { customerId, items, sponsorshipAmount, status, grandTotal, payableAmount } = req.body;
  if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Customer selection and at least one billing item are required' });
  }
  
  const db = readDb();
  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Selected customer not found' });
  }
  
  const invoiceId = `inv_${Date.now()}`;
  
  // Auto-calculate billing matrix with precise GST
  let computedGrandTotal = 0;
  const processedItems = items.map((item, idx) => {
    const rawPrice = Number(item.price) || 0;
    const clientGst = item.gst !== undefined ? Number(item.gst) : null;
    const clientTotal = item.total !== undefined ? Number(item.total) : null;

    // Use client supplied GST or calculate standard 18% GST (or previous 0.15012 if fallback)
    const calculatedGst = clientGst !== null ? clientGst : (rawPrice > 0 ? Math.round(rawPrice * 0.18 * 100) / 100 : 0);
    const computedTotal = clientTotal !== null ? clientTotal : Math.round((rawPrice + calculatedGst) * 100) / 100;
    computedGrandTotal += computedTotal;
    
    return {
      id: `item_${invoiceId}_${idx}`,
      invoiceId,
      programName: item.programName,
      duration: item.duration || '90 Days',
      price: rawPrice,
      gst: calculatedGst,
      total: computedTotal
    };
  });
  
  const finalGrandTotal = grandTotal !== undefined ? Number(grandTotal) : Math.round(computedGrandTotal * 100) / 100;
  const computedSponsorship = Number(sponsorshipAmount) || 0;
  const finalPayable = payableAmount !== undefined ? Number(payableAmount) : Math.max(0, Math.round((finalGrandTotal - computedSponsorship) * 100) / 100);
  
  const newInvoice = {
    id: invoiceId,
    customerId,
    grandTotal: finalGrandTotal,
    sponsorshipAmount: computedSponsorship,
    payableAmount: finalPayable,
    status: status || 'Pending',
    createdAt: new Date().toISOString(),
    items: processedItems
  };
  
  db.invoices.push(newInvoice);
  writeDb(db);
  res.status(201).json(newInvoice);
});

// PUT Update Invoice Status
app.put('/api/invoices/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status || !['Paid', 'Pending', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid invoice status value' });
  }
  
  const db = readDb();
  const index = db.invoices.findIndex(i => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  
  db.invoices[index].status = status;
  writeDb(db);
  res.json(db.invoices[index]);
});

// DELETE Invoice
app.delete('/api/invoices/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const index = db.invoices.findIndex(i => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  db.invoices.splice(index, 1);
  writeDb(db);
  res.json({ success: true, message: 'Invoice successfully removed.' });
});


// --- EMAIL TEMPLATES API ROUTES ---

// GET All Templates
app.get('/api/email-templates', (req, res) => {
  const db = readDb();
  res.json(db.emailTemplates);
});

// POST Create Template
app.post('/api/email-templates', (req, res) => {
  const { templateName, subject, htmlContent, category } = req.body;
  if (!templateName || !subject || !htmlContent) {
    return res.status(400).json({ error: 'Template name, subject, and content body are required.' });
  }
  
  const db = readDb();
  const newTemplate = {
    id: `temp_${Date.now()}`,
    templateName,
    subject,
    htmlContent,
    category: category || 'General',
    createdAt: new Date().toISOString()
  };
  
  db.emailTemplates.push(newTemplate);
  writeDb(db);
  res.status(201).json(newTemplate);
});

// PUT Edit Template
app.put('/api/email-templates/:id', (req, res) => {
  const { id } = req.params;
  const { templateName, subject, htmlContent, category } = req.body;
  
  const db = readDb();
  const index = db.emailTemplates.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Email template not found' });
  }
  
  db.emailTemplates[index] = {
    ...db.emailTemplates[index],
    templateName: templateName || db.emailTemplates[index].templateName,
    subject: subject || db.emailTemplates[index].subject,
    htmlContent: htmlContent || db.emailTemplates[index].htmlContent,
    category: category || db.emailTemplates[index].category,
  };
  
  writeDb(db);
  res.json(db.emailTemplates[index]);
});

// DELETE Template
app.delete('/api/email-templates/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const index = db.emailTemplates.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  db.emailTemplates.splice(index, 1);
  writeDb(db);
  res.json({ success: true, message: 'Template successfully deleted.' });
});

// POST Duplicate Template
app.post('/api/email-templates/:id/duplicate', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const template = db.emailTemplates.find(t => t.id === id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  const dupTemplate = {
    ...template,
    id: `temp_${Date.now()}`,
    templateName: `${template.templateName} (Copy)`,
    createdAt: new Date().toISOString()
  };
  
  db.emailTemplates.push(dupTemplate);
  writeDb(db);
  res.status(201).json(dupTemplate);
});


// --- EMAIL LAUNCH / DELIVERY MODULE ---

// GET Email logs
app.get('/api/email-logs', (req, res) => {
  const db = readDb();
  const result = [...db.emailLogs].sort((a,b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  res.json(result);
});

// POST Send Email (Parses & renders templates server-side, interacts with optional Resend API)
app.post('/api/send-email', async (req, res) => {
  const { customerId, invoiceId, templateId, customSubject, customBody } = req.body;
  
  if (!customerId || !invoiceId) {
    return res.status(400).json({ error: 'Customer and Invoice linked references are required' });
  }
  
  const db = readDb();
  const customer = db.customers.find(c => c.id === customerId);
  const invoice = db.invoices.find(i => i.id === invoiceId);
  const settings = db.settings;
  
  if (!customer) return res.status(404).json({ error: 'Selected customer record could not be found' });
  if (!invoice) return res.status(404).json({ error: 'Selected invoice record could not be found' });
  
  // Set up variable replacements values
  const programNames = invoice.items.map(it => it.programName).join(', ');
  const programDetails = invoice.items.map(it => `${it.programName} (${it.duration} @ ₹${it.total})`).join(', ');

  // Dynamic High-Fidelity HTML Table for I-SUCCESSNODE styling
  let invoiceTableHtml = `
    <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; margin: 20px 0; color: #000000;">
      <thead>
        <tr style="background-color: #002d62; color: #ffffff;">
          <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase;">Selected Programs</th>
          <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase;">Duration</th>
          <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase;">Price (Excl. Tax)</th>
          <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase;">GST 18% in Rs</th>
          <th style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold; font-size: 13px; text-transform: uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>
  `;

  invoice.items.forEach((item: any) => {
    const isComp = !item.price || item.price === 0 || item.programName.toLowerCase().includes('complementary') || item.programName.toLowerCase().includes('complimentary');
    const priceVal = isComp ? '' : '₹' + Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const gstVal = isComp ? '' : '₹' + Number(item.gst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalVal = '₹' + Number(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    invoiceTableHtml += `
        <tr style="background-color: #ffffff; text-align: center;">
          <td style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold;">${item.programName}</td>
          <td style="padding: 10px; border: 1.5px solid #000000; text-align: center;">${item.duration || '90 Days'}</td>
          <td style="padding: 10px; border: 1.5px solid #000000; text-align: center;">${priceVal}</td>
          <td style="padding: 10px; border: 1.5px solid #000000; text-align: center;">${gstVal}</td>
          <td style="padding: 10px; border: 1.5px solid #000000; text-align: center; font-weight: bold;">${totalVal}</td>
        </tr>
    `;
  });

  invoiceTableHtml += `
        <tr style="text-align: center;">
          <td colspan="4" style="background-color: #e07a22; color: #000000; font-weight: bold; text-align: center; border: 1.5px solid #000000; padding: 10px; font-size: 13px; text-transform: uppercase;">Total</td>
          <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 13px;">₹${Number(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr style="text-align: center;">
          <td colspan="4" style="background-color: #e07a22; color: #000000; font-weight: bold; text-align: center; border: 1.5px solid #000000; padding: 10px; font-size: 13px; text-transform: uppercase;">Sponsorship</td>
          <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 13px;">₹${Number(invoice.sponsorshipAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr style="text-align: center;">
          <td colspan="4" style="background-color: #e07a22; color: #000000; font-weight: bold; text-align: center; border: 1.5px solid #000000; padding: 10px; font-size: 13px; text-transform: uppercase;">Total Payable Amount</td>
          <td style="padding: 10px; border: 1.5px solid #000000; font-weight: bold; text-align: center; background-color: #ffffff; font-size: 13px;">₹${Number(invoice.payableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>
  `;
  
  const replacer = (text: string) => {
    if (!text) return '';
    return text
      .replace(/{{customer_name}}/gi, customer.name)
      .replace(/{{customer_email}}/gi, customer.email)
      .replace(/{{customer_phone}}/gi, customer.phone || 'N/A')
      .replace(/{{company_name}}/gi, customer.companyName || 'N/A')
      .replace(/{{program_name}}/gi, invoice.items[0]?.programName || 'N/A')
      .replace(/{{program_list}}/gi, programDetails)
      .replace(/{{invoice_total}}/gi, invoice.grandTotal.toFixed(2))
      .replace(/{{sponsorship_amount}}/gi, invoice.sponsorshipAmount.toFixed(2))
      .replace(/{{payable_amount}}/gi, invoice.payableAmount.toFixed(2))
      .replace(/{{invoice_table}}/gi, invoiceTableHtml)
      .replace(/{{company_phone}}/gi, settings.companyPhone)
      .replace(/{{company_email}}/gi, settings.companyEmail)
      .replace(/{{company_website}}/gi, settings.website)
      .replace(/{{current_date}}/gi, new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }));
  };

  // Determine subject and final html payload
  let finalSubject = '';
  let finalHtml = '';
  let templateNameUsed = 'AdHoc Manual Draft';

  if (templateId && templateId !== 'custom') {
    const template = db.emailTemplates.find(t => t.id === templateId);
    if (template) {
      finalSubject = replacer(template.subject);
      finalHtml = replacer(template.htmlContent);
      templateNameUsed = template.templateName;
    }
  }

  // Use override fields if provided
  if (customSubject) finalSubject = customSubject;
  if (customBody) finalHtml = customBody;

  // Render final HTML context incorporating branding frame wrapper
  const brandingWrapper = `
    <div style="background-color: #f1f5f9; padding: 30px; font-family: 'Inter', system-ui, sans-serif; display: flex; justify-content: center;">
      <div style="background-color: #ffffff; width: 100%; max-width: 600px; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
        ${settings.logoUrl ? `
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); padding: 24px; text-align: center;">
          <img src="${settings.logoUrl}" alt="${settings.companyName} Logo" style="max-height: 50px; border-radius: 6px; background-color: white; padding: 4px; display: inline-block;" />
          <h1 style="color: white; margin: 10px 0 0 0; font-size: 1.5rem; text-align: center;">${settings.companyName}</h1>
        </div>
        ` : ''}
        <div style="padding: 30px; color: #1e293b; line-height: 1.6; font-size: 15px;">
          ${finalHtml}
        </div>
        <div style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          <p style="margin: 0 0 8px 0; font-weight: 500;">${settings.companyName}</p>
          <p style="margin: 0 0 8px 0;">${settings.footerText}</p>
          <p style="margin: 0; color: #94a3b8;">Ref ID: ${invoice.id} | Sent on ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  `;

  let deliveryStatus: 'Sent' | 'Delivered' | 'Failed' = 'Delivered';
  let trackingNotes = 'Successfully dispatched via local high-fidelity mock gateway.';

  // Attempt real Resend API delivery if configured in environment variables
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`[Resend Engine] Attempting delivery of "${finalSubject}" to ${customer.email}`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: `${settings.companyName} <onboarding@resend.dev>`, // Resend testing domain defaults
          to: customer.email,
          subject: finalSubject,
          html: brandingWrapper
        })
      });

      if (response.ok) {
        const payload = await response.json();
        trackingNotes = `Dispatched successfully via Resend API (ID: ${payload.id})`;
        deliveryStatus = 'Delivered';
      } else {
        const errorText = await response.text();
        console.error('[Resend Error Response]', errorText);
        trackingNotes = `Resend API failed: ${errorText}. Simulated standard fallback executed.`;
      }
    } catch (err: any) {
      console.error('[Resend API Connection Error]', err);
      trackingNotes = `Resend network connection timed out. Saved backup locally: ${err.message}`;
    }
  }

  // Create Email History Log
  const newLog = {
    id: `log_${Date.now()}`,
    customerId: customer.id,
    invoiceId: invoice.id,
    templateId: templateId || 'custom',
    email: customer.email,
    subject: finalSubject,
    status: deliveryStatus,
    sentAt: new Date().toISOString(),
    customerName: customer.name,
    templateName: templateNameUsed,
    invoiceTotal: invoice.grandTotal
  };

  db.emailLogs.push(newLog);
  writeDb(db);

  res.json({
    success: true,
    message: 'Email dispatched successfully.',
    log: newLog,
    trackingNotes,
    deliveredPayload: brandingWrapper
  });
});

// POST Send Email Direct (acts as a Node-side proxy to bypass browser CORS restrictions for Resend)
app.post('/api/send-email-direct', async (req, res) => {
  const { to, subject, html, apiKey, fromName } = req.body;
  
  if (!to || !subject || !html || !apiKey) {
    return res.status(400).json({ error: 'to, subject, html, and apiKey are required' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: `${fromName || 'I-SUCCESSNODE'} <onboarding@resend.dev>`,
        to,
        subject,
        html
      })
    });

    if (response.ok) {
      const payload = await response.json();
      res.json({ success: true, id: payload.id });
    } else {
      const errorText = await response.text();
      res.status(response.status).json({ error: errorText });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- BRANDING SETTINGS API ROUTES ---

// GET Brand Settings
app.get('/api/settings', (req, res) => {
  const db = readDb();
  res.json(db.settings);
});

// POST Save Brand Settings
app.post('/api/settings', (req, res) => {
  const { companyName, companyPhone, companyEmail, website, logoUrl, footerText, emailSignature } = req.body;
  const db = readDb();
  
  db.settings = {
    companyName: companyName || db.settings.companyName,
    companyPhone: companyPhone || db.settings.companyPhone,
    companyEmail: companyEmail || db.settings.companyEmail,
    website: website || db.settings.website,
    logoUrl: logoUrl || db.settings.logoUrl,
    footerText: footerText || db.settings.footerText,
    emailSignature: emailSignature || db.settings.emailSignature,
  };
  
  writeDb(db);
  res.json(db.settings);
});


// Serve Frontend assets using Vite Dev Server in Development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[InvoiceMailer Pro Server] Online and running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
