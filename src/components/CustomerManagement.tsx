/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, User, Mail, Phone, Briefcase, MapPin, 
  Trash2, Edit3, X, FileText, ChevronLeft, ChevronRight, 
  Building2, Users, Loader2 
} from 'lucide-react';
import { api } from '../lib/api';
import { Customer } from '../types';

interface CustomerManagementProps {
  onNotify: (message: string, type: 'success' | 'error') => void;
  // Trigger update notification to sync state upwards
  onRefreshData: () => void;
}

export default function CustomerManagement({ onNotify, onRefreshData }: CustomerManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Filter Selection
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('All');

  // Modal controls
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    designation: '',
    address: '',
    notes: ''
  });

  const fetchCustomers = async (sq = '') => {
    setLoading(true);
    try {
      const data = await api.customers.list(sq);
      setCustomers(data);
    } catch (err: any) {
      onNotify(err.message || 'Error pulling customer records from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(search);
  }, [search]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      companyName: '',
      designation: '',
      address: '',
      notes: ''
    });
    setEditingId(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      companyName: customer.companyName,
      designation: customer.designation || '',
      address: customer.address || '',
      notes: customer.notes || ''
    });
    setEditingId(customer.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently remove customer ${name}? This action cannot be reversed.`)) {
      return;
    }
    
    try {
      await api.customers.delete(id);
      onNotify(`Successfully removed customer ${name} from records.`, 'success');
      fetchCustomers();
      onRefreshData();
    } catch (err: any) {
      onNotify(err.message || 'Error occurred deleting customer.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.companyName) {
      onNotify('Name, Email and Company Name are required fields.', 'error');
      return;
    }

    try {
      if (editingId) {
        await api.customers.update(editingId, formData);
        onNotify(`Successfully updated details for ${formData.name}.`, 'success');
      } else {
        await api.customers.create(formData);
        onNotify(`Successfully registered new customer ${formData.name}.`, 'success');
      }
      setIsOpen(false);
      fetchCustomers();
      onRefreshData();
    } catch (err: any) {
      onNotify(err.message || 'Error writing customer record to database.', 'error');
    }
  };

  // Get unique companies list for the filtering dropdown
  const uniqueCompanies = ['All', ...new Set(customers.map(c => c.companyName).filter(Boolean))];

  // Apply filtration
  const filteredCustomers = customers.filter(c => {
    if (selectedCompanyFilter === 'All') return true;
    return c.companyName === selectedCompanyFilter;
  });

  // Calculate pagination boundaries
  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Top Header Filter Command strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Customer Ledger</h1>
          <p className="text-slate-400 text-xs mt-1">Manage, filter, and review active client contact records.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Filter and Search Actions Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/20 backdrop-blur-md p-4 rounded-2xl border border-slate-800/60 shadow-xl">
        
        {/* Search Input Node */}
        <div className="md:col-span-3 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search customers by name, corporate company, or email address..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
          />
        </div>

        {/* Filter Dropdown Node */}
        <div className="relative">
          <select
            value={selectedCompanyFilter}
            onChange={(e) => { setSelectedCompanyFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-slate-400 focus:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 cursor-pointer appearance-none"
          >
            {uniqueCompanies.map((comp) => (
              <option key={comp} value={comp} className="bg-slate-900 text-white">
                Company: {comp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Customer Records Table Layout */}
      {loading && customers.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-medium">Synchronizing client profiles...</p>
        </div>
      ) : currentItems.length === 0 ? (
        <div className="py-20 rounded-2xl border border-slate-800/40 bg-slate-900/5 text-center flex flex-col items-center justify-center">
          <Users className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-white">No Corporate Profiles Found</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm">No databases correspond to selected constraints. Try adjusting the query filter.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {currentItems.map((c) => (
              <motion.div
                key={c.id}
                layoutId={`customer-${c.id}`}
                className="bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/60 p-5 rounded-2xl shadow-xl hover:shadow-violet-500/[0.02] flex flex-col justify-between group transition-all duration-300"
              >
                {/* Visual Card Heading details */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 font-bold flex items-center justify-center text-sm uppercase">
                        {c.name.split(' ').map(n=>n[0]).join('').substring(0, 2)}
                      </div>
                      
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-white truncate">{c.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-violet-400/80" />
                          {c.companyName}
                        </p>
                      </div>
                    </div>

                    {/* Controls Actions panel */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Edit Customer Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-slate-400 hover:text-white transition-all cursor-pointer"
                        title="Remove Customer Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body Information list */}
                  <div className="space-y-2 border-t border-slate-800/40 pt-3 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                      <span className="truncate text-slate-300">{c.email}</span>
                    </div>

                    {c.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                        <span className="truncate text-slate-300">{c.phone}</span>
                      </div>
                    )}

                    {c.designation && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                        <span className="truncate text-slate-300">{c.designation}</span>
                      </div>
                    )}

                    {c.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                        <span className="truncate text-slate-300">{c.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional Note block */}
                {c.notes && (
                  <div className="mt-4 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/40 text-[10px] text-slate-500 italic mt-auto flex items-start gap-1.5">
                    <FileText className="w-3 h-3 text-slate-600 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{c.notes}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Pagination Command controllers */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-slate-900/15 p-4 rounded-xl border border-slate-850/30 text-xs">
              <span className="text-slate-500">
                Displaying <strong className="text-slate-400">{indexOfFirstItem + 1}</strong> to{' '}
                <strong className="text-slate-400">{Math.min(indexOfLastItem, totalItems)}</strong> of{' '}
                <strong className="text-slate-300">{totalItems}</strong> customers
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-slate-300 font-mono text-xs px-2">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Creation and Modification Modal overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-[#06080e]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 bg-slate-950/20">
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <User className="w-4 h-4 text-violet-400" />
                  {editingId ? 'Edit Customer Coordinates' : 'Register Corporate Profile'}
                </h3>
                
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content body container */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                
                {/* Two Column items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vertex Tech Corp"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Designation / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. VP Engineering"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Office Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Plot 42, Sector V, Salt Lake City, Kolkata"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Notes / Special Instructions</label>
                  <textarea
                    placeholder="Provide any custom billing agreements, corporate billing directions, etc."
                    value={formData.notes || ''}
                    rows={3}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
                  />
                </div>

                {/* Controls Submit bottom line */}
                <div className="flex gap-3 pt-4 border-t border-slate-800 justify-end flex-shrink-0 bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-white text-xs hover:bg-slate-950/40 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-violet-500/10 cursor-pointer"
                  >
                    {editingId ? 'Save Profile' : 'Provision Customer'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
