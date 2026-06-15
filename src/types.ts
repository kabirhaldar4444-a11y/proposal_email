/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'Admin',
  STAFF = 'Staff',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  designation?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  programName: string;
  duration: string;
  price: number;
  gst: number;
  total: number;
}

export enum InvoiceStatus {
  PAID = 'Paid',
  PENDING = 'Pending',
  CANCELLED = 'Cancelled',
}

export interface Invoice {
  id: string;
  customerId: string;
  grandTotal: number;
  sponsorshipAmount: number;
  payableAmount: number;
  status: InvoiceStatus;
  createdAt: string;
  items: InvoiceItem[];
}

export interface EmailTemplate {
  id: string;
  templateName: string;
  subject: string;
  htmlContent: string;
  category: string;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  customerId: string;
  invoiceId: string;
  templateId?: string;
  email: string;
  subject: string;
  status: 'Sent' | 'Delivered' | 'Failed';
  sentAt: string;
  // Denormalized for display ease
  customerName?: string;
  templateName?: string;
  invoiceTotal?: number;
}

export interface CompanySettings {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  website: string;
  logoUrl: string;
  footerText: string;
  emailSignature: string;
  resendApiKey?: string;
}

