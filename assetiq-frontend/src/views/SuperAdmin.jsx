import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Globe, Users, ShieldAlert, Award, Power, RefreshCw } from 'lucide-react';

export default function SuperAdmin() {
  const { apiCall } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlatformData = async () => {
    setRefreshing(true);
    try {
      const [analyticsRes, orgsRes] = await Promise.all([
        apiCall('/api/v1/admin/analytics'),
        apiCall('/api/v1/admin/organizations')
      ]);

      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (orgsRes.success) setOrganizations(orgsRes.data);
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
        <button
          onClick={fetchPlatformData}
          disabled={refreshing}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Reload Platform Stats
        </button>
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
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Plan Distribution</span>
            <div className="mt-2 space-y-0.5 text-xs text-slate-500 font-medium">
              {analytics?.planDistribution && analytics.planDistribution.length > 0 ? (
                analytics.planDistribution.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-4">
                    <span>{item.plan}:</span>
                    <span className="font-bold text-slate-800">{item.count}</span>
                  </div>
                ))
              ) : (
                <div>No active plans.</div>
              )}
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl text-purple-600">
            <Globe className="h-6 w-6" />
          </div>
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
                    <td className="py-4 px-6 font-medium">{org.planId?.name || 'N/A'}</td>
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
                        {org.status === 'active' ? 'Suspend Org' : 'Activate Org'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
