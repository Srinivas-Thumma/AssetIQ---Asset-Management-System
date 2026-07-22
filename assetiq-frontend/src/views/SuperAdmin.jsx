import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Globe, Users, ShieldAlert, Award, Power, RefreshCw, Plus, X, Brain } from 'lucide-react';

export default function SuperAdmin() {
  const { apiCall } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Manual Org Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: '',
    slug: '',
    planId: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPlatformData = async () => {
    setRefreshing(true);
    try {
      const [analyticsRes, orgsRes, plansRes] = await Promise.all([
        apiCall('/api/v1/admin/analytics'),
        apiCall('/api/v1/admin/organizations'),
        apiCall('/api/v1/admin/plans')
      ]);

      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (orgsRes.success) setOrganizations(orgsRes.data);
      if (plansRes.success) {
        setPlans(plansRes.data);
        if (plansRes.data.length > 0 && !orgForm.planId) {
          setOrgForm(prev => ({ ...prev, planId: plansRes.data[0]._id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const handleToggleOrgStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Are you sure you want to change this organization's status to ${nextStatus.toUpperCase()}?`)) return;
    
    setRefreshing(true);
    try {
      const res = await apiCall(`/api/v1/admin/organizations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.success) {
        fetchPlatformData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePlanChange = async (orgId, planId) => {
    setRefreshing(true);
    try {
      const res = await apiCall(`/api/v1/admin/organizations/${orgId}`, {
        method: 'PUT',
        body: JSON.stringify({ planId }),
      });

      if (res.success) {
        fetchPlatformData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOrgNameChange = (e) => {
    const value = e.target.value;
    const slugified = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setOrgForm(prev => ({ ...prev, name: value, slug: slugified }));
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await apiCall('/api/v1/admin/organizations', {
        method: 'POST',
        body: JSON.stringify(orgForm),
      });

      if (res.success) {
        setShowCreateModal(false);
        setOrgForm({
          name: '',
          slug: '',
          planId: plans[0]?._id || '',
          adminEmail: '',
          adminPassword: ''
        });
        fetchPlatformData();
      } else {
        setFormError(res.message || 'Failed to create organization');
      }
    } catch (err) {
      setFormError('Connection failure.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Super Admin Platform Control</h1>
          <p className="text-slate-500 mt-1">Cross-tenant monitoring, SaaS plan quotas, and organization status toggles.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPlatformData}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Reload Stats
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Provision Tenant
          </button>
        </div>
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total SaaS Tenants</span>
            <span className="text-4xl font-extrabold text-slate-800 mt-2 block">{analytics?.totalOrganizations || 0}</span>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl text-blue-600">
            <Globe className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Platform Users</span>
            <span className="text-4xl font-extrabold text-slate-800 mt-2 block">{analytics?.totalUsers || 0}</span>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl text-emerald-600">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Active Managed Assets</span>
            <span className="text-4xl font-extrabold text-slate-800 mt-2 block">{analytics?.totalAssets || 0}</span>
          </div>
          <div className="p-4 bg-indigo-50 rounded-xl text-indigo-600">
            <Award className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">AI Calls (Weekly)</span>
            <span className="text-4xl font-extrabold text-purple-600 mt-2 block">{analytics?.aiUsageCount || 0}</span>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl text-purple-600">
            <Brain className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Plan Distribution Mini Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant Plan Allocation Breakdown:</span>
        <div className="flex gap-6 text-sm text-slate-700">
          {analytics?.planDistribution?.map((item, idx) => (
            <div key={idx} className="flex gap-1.5 items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="font-semibold">{item.plan}:</span>
              <span className="font-bold text-slate-900">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Organizations Directory */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Global Tenants Register</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Organization Name</th>
                <th className="py-4 px-6">Domain Slug</th>
                <th className="py-4 px-6">Service Plan</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Created Date</th>
                <th className="py-4 px-6 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {organizations.map((org) => {
                const badgeColor = org.status === 'active' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : 'bg-red-50 text-red-700 border-red-100';

                return (
                  <tr key={org._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-800">{org.name}</td>
                    <td className="py-4 px-6 font-mono text-slate-500 text-xs">{org.slug}</td>
                    <td className="py-4 px-6">
                      <select
                        value={org.planId?._id || ''}
                        onChange={(e) => handlePlanChange(org._id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-xs font-semibold focus:outline-none"
                      >
                        {plans.map((p) => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColor} capitalize`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {new Date(org.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleToggleOrgStatus(org._id, org.status)}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors shadow-2xs ${
                          org.status === 'active' 
                            ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {org.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MANUAL PROVISION MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Manually Provision Org Workspace</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleCreateOrg} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Initech Corp"
                  value={orgForm.name}
                  onChange={handleOrgNameChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Domain Slug</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. initech-corp"
                  value={orgForm.slug}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '') }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-850 text-sm focus:outline-none focus:border-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-sans">Service Plan Level</label>
                <select
                  required
                  value={orgForm.planId}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, planId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 text-sm focus:outline-none"
                >
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} (${p.price}/mo)</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Root Administrator Credentials</span>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Admin Email</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@initech.com"
                    value={orgForm.adminEmail}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, adminEmail: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Admin Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={orgForm.adminPassword}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, adminPassword: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Provisioning...' : 'Provision Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
