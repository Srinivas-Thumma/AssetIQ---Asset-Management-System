import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Globe, Users, ShieldAlert, Award, Power, RefreshCw, 
  Plus, X, Brain, Database, CreditCard, Edit2, Trash2,
  Eye, MapPin, Package, Layers, Building2, CheckCircle2,
  ChevronRight, ChevronDown
} from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';

export default function SuperAdmin({ initialSubTab, autoOpenAddModal }) {
  const { apiCall } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab || 'organizations'); // 'organizations' | 'plans' | 'storage'
  const [analytics, setAnalytics] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [storageData, setStorageData] = useState([]);
  const [expandedOrgs, setExpandedOrgs] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Organization Inspection Modal State
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [inspectTab, setInspectTab] = useState('locations'); // 'locations' | 'assets' | 'users'

  // Sync state when sidebar passes initialSubTab or autoOpenAddModal
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
    if (autoOpenAddModal) {
      setShowCreateModal(true);
    }
  }, [initialSubTab, autoOpenAddModal]);

  const handleInspectOrg = async (org) => {
    setInspectLoading(true);
    setShowInspectModal(true);
    setInspectData(null);
    try {
      const res = await apiCall(`/api/v1/admin/organizations/${org._id}/inspect`);
      if (res.success) {
        setInspectData(res.data);
      }
    } catch (err) {
      console.error('Failed to inspect organization:', err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Manual Org Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: '',
    slug: '',
    planId: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [orgFormError, setOrgFormError] = useState('');
  const [orgSubmitting, setOrgSubmitting] = useState(false);

  // Plan Modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editPlanId, setEditPlanId] = useState('');
  const [planForm, setPlanForm] = useState({
    name: '',
    slug: '',
    price: 0,
    maxAssets: 100
  });
  const [planFormError, setPlanFormError] = useState('');
  const [planSubmitting, setPlanSubmitting] = useState(false);

  const fetchPlatformData = async () => {
    setRefreshing(true);
    try {
      const [analyticsRes, orgsRes, plansRes, storageRes] = await Promise.all([
        apiCall('/api/v1/admin/analytics'),
        apiCall('/api/v1/admin/organizations'),
        apiCall('/api/v1/admin/plans'),
        apiCall('/api/v1/admin/storage-usage')
      ]);

      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (orgsRes.success) setOrganizations(orgsRes.data);
      if (plansRes.success) {
        setPlans(plansRes.data);
        if (plansRes.data.length > 0 && !orgForm.planId) {
          setOrgForm(prev => ({ ...prev, planId: plansRes.data[0]._id }));
        }
      }
      if (storageRes.success) setStorageData(storageRes.data);
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

  const handleDeleteOrganization = async (id, orgName) => {
    if (!window.confirm(`Are you sure you want to PURGE organization "${orgName || 'Unknown'}"? This action will permanently delete all associated assets, users, and storage data.`)) return;
    
    setRefreshing(true);
    try {
      const res = await apiCall(`/api/v1/admin/organizations/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        fetchPlatformData();
      } else {
        alert(res.message || 'Failed to delete organization');
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
    setOrgFormError('');
    setOrgSubmitting(true);

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
        setOrgFormError(res.message || 'Failed to create organization');
      }
    } catch (err) {
      setOrgFormError('Connection failure.');
    } finally {
      setOrgSubmitting(false);
    }
  };

  const handleOpenPlanEdit = (plan) => {
    setEditPlanId(plan._id);
    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      price: plan.price,
      maxAssets: plan.maxAssets
    });
    setPlanFormError('');
    setShowPlanModal(true);
  };

  const handleOpenPlanCreate = () => {
    setEditPlanId('');
    setPlanForm({
      name: '',
      slug: '',
      price: 0,
      maxAssets: 100
    });
    setPlanFormError('');
    setShowPlanModal(true);
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    setPlanFormError('');
    setPlanSubmitting(true);
    const method = editPlanId ? 'PUT' : 'POST';
    const url = editPlanId ? `/api/v1/admin/plans/${editPlanId}` : '/api/v1/admin/plans';

    try {
      const res = await apiCall(url, {
        method,
        body: JSON.stringify(planForm)
      });

      if (res.success) {
        setShowPlanModal(false);
        fetchPlatformData();
      } else {
        setPlanFormError(res.message || 'Failed to submit plan details');
      }
    } catch (err) {
      setPlanFormError('Network connection issue.');
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan?')) return;
    setRefreshing(true);
    try {
      const res = await apiCall(`/api/v1/admin/plans/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        fetchPlatformData();
      } else {
        alert(res.message || 'Failed to delete subscription plan');
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Platform Control Center</h1>
          <p className="text-slate-500 mt-1">Cross-tenant monitoring, SaaS subscription plans, and data usage metrics.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPlatformData}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Sync Dashboard
          </button>
          
          {activeSubTab === 'organizations' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" />
              Add Organization
            </button>
          )}

          {activeSubTab === 'plans' && (
            <button
              onClick={handleOpenPlanCreate}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" />
              Create Plan
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-250 gap-6">
        <button
          onClick={() => setActiveSubTab('organizations')}
          className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'organizations' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Globe className="h-4.5 w-4.5" />
          Global Organizations
        </button>

        <button
          onClick={() => setActiveSubTab('plans')}
          className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'plans' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <CreditCard className="h-4.5 w-4.5" />
          Subscription Plans
        </button>

        <button
          onClick={() => setActiveSubTab('storage')}
          className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'storage' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Database className="h-4.5 w-4.5" />
          Organization Storage Footprint
        </button>
      </div>

      {/* --- TAB 1: ORGANIZATIONS & PLATFORM ANALYTICS --- */}
      {activeSubTab === 'organizations' && (
        <div className="space-y-6 animate-fade-in">
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

          {/* Plan Distribution Breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant Plan Allocation Breakdown:</span>
            <div className="flex gap-6 text-sm text-slate-700">
              {analytics?.planDistribution?.map((item, idx) => (
                <div key={idx} className="flex gap-1.5 items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                  <span className="font-semibold">{item.plan}:</span>
                  <span className="font-bold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Organizations Directory */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Global Organizations Register</h2>
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
                          <CustomSelect
                            value={org.planId?._id || ''}
                            onChange={(e) => handlePlanChange(org._id, e.target.value)}
                            options={plans.map((p) => ({
                              value: p._id,
                              label: p.name,
                            }))}
                            className="w-36"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColor} capitalize`}>
                            {org.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500">
                          {new Date(org.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleInspectOrg(org)}
                            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer transition-colors shadow-2xs"
                            title="Inspect organization structure, rooms, and asset inventory"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Inspect
                          </button>

                          <button
                            onClick={() => handleToggleOrgStatus(org._id, org.status)}
                            className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors shadow-2xs ${
                              org.status === 'active' 
                                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                                : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                            {org.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteOrganization(org._id, org.name)}
                            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer transition-colors shadow-2xs"
                            title="Purge organization and all stored assets"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
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
      )}

      {/* --- TAB 2: SUBSCRIPTION PLANS --- */}
      {activeSubTab === 'plans' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">SaaS Product Plan Configurator</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Plan Name</th>
                  <th className="py-4 px-6">Plan Slug</th>
                  <th className="py-4 px-6">Price</th>
                  <th className="py-4 px-6">Max Asset Quota</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {plans.map((plan) => (
                  <tr key={plan._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-800">{plan.name}</td>
                    <td className="py-4 px-6 font-mono text-slate-400 text-xs">{plan.slug}</td>
                    <td className="py-4 px-6 font-semibold text-slate-700">${plan.price}/mo</td>
                    <td className="py-4 px-6 font-semibold">
                      {plan.maxAssets === Number.MAX_SAFE_INTEGER || plan.maxAssets > 100000 
                        ? 'Unlimited Assets' 
                        : `${plan.maxAssets} Assets`}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2 shrink-0">
                      <button
                        onClick={() => handleOpenPlanEdit(plan)}
                        className="inline-flex p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                        title="Edit Plan"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan._id)}
                        className="inline-flex p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                        title="Delete Plan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: PLATFORM STORAGE USAGE --- */}
      {activeSubTab === 'storage' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Organization Storage</h2>
                <p className="text-xs text-slate-400 mt-0.5">Overview of registered organization inventory assets and room allocations</p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Total Orgs: {storageData.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-4 w-10 text-center"></th>
                    <th className="py-4 px-6">Organization Name</th>
                    <th className="py-4 px-6">Asset Inventory Size</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {storageData.map((data) => {
                    const isExpanded = expandedOrgs.has(data.organizationId);

                    return (
                      <React.Fragment key={data.organizationId || data.organizationName}>
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => {
                                setExpandedOrgs((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(data.organizationId)) {
                                    next.delete(data.organizationId);
                                  } else {
                                    next.add(data.organizationId);
                                  }
                                  return next;
                                });
                              }}
                              className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              title={isExpanded ? "Collapse asset list" : "Expand asset list"}
                            >
                              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-blue-600 font-bold' : ''}`} />
                            </button>
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{data.organizationName}</span>
                              {data.slug && <span className="text-xs font-mono font-normal text-slate-400">({data.slug})</span>}
                            </div>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-700">
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold">
                              <Package className="h-3.5 w-3.5 text-slate-500" />
                              {data.assetCount} {data.assetCount === 1 ? 'asset' : 'assets'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                              data.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                              {data.status || 'active'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            {data.organizationId ? (
                              <button
                                onClick={() => handleDeleteOrganization(data.organizationId, data.organizationName)}
                                className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-800 font-semibold text-xs border border-rose-200 hover:bg-rose-50 py-1.5 px-3 rounded-xl transition-all cursor-pointer shadow-2xs"
                                title="Delete organization and purge all associated storage data"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Purge Storage
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium italic">Protected</span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Asset Storage Details Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 border-b border-slate-100 animate-fade-in">
                            <td colSpan="5" className="px-6 py-4">
                              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                                    Asset Storage Locations ({data.assets?.length || 0})
                                  </h4>
                                  <span className="text-[11px] text-slate-400">
                                    Organization: <strong className="text-slate-700">{data.organizationName}</strong>
                                  </span>
                                </div>

                                {!data.assets || data.assets.length === 0 ? (
                                  <div className="py-6 text-center text-xs text-slate-400 italic">
                                    No assets currently registered in this organization storage.
                                  </div>
                                ) : (
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-2 px-3">Asset Code</th>
                                        <th className="py-2 px-3">Asset Name</th>
                                        <th className="py-2 px-3">Category</th>
                                        <th className="py-2 px-3">Stored Location (Room)</th>
                                        <th className="py-2 px-3 text-right">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                      {data.assets.map((ast) => (
                                        <tr key={ast._id} className="hover:bg-slate-50/60 transition-colors">
                                          <td className="py-2.5 px-3 font-mono font-bold text-slate-600">{ast.assetCode}</td>
                                          <td className="py-2.5 px-3 font-bold text-slate-900">{ast.name}</td>
                                          <td className="py-2.5 px-3 text-slate-500">{ast.categoryName}</td>
                                          <td className="py-2.5 px-3 font-medium text-slate-800">
                                            <span className="inline-flex items-center gap-1 text-slate-700">
                                              <MapPin className="h-3 w-3 text-purple-500 shrink-0" />
                                              {ast.roomLocation}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                              ast.status === 'available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                              ast.status === 'assigned' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                              ast.status === 'under_maintenance' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                              'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                              {ast.status?.replace('_', ' ')}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {storageData.length === 0 && (
                    <tr><td className="py-8 px-6 text-center text-slate-400 italic" colSpan="5">No organization storage records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MANUAL PROVISION MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Manually Provision Org Workspace</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleCreateOrg} className="p-6 space-y-4">
              {orgFormError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">
                  {orgFormError}
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
                <CustomSelect
                  value={orgForm.planId}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, planId: e.target.value }))}
                  options={plans.map((p) => ({
                    value: p._id,
                    label: `${p.name} ($${p.price}/mo)`,
                    description: `Max ${p.maxAssets || 100} Assets limit`,
                  }))}
                />
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block font-mono">Root Administrator Credentials</span>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Admin Email</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@initech.com"
                    value={orgForm.adminEmail}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, adminEmail: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-850 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Admin Password</label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={orgForm.adminPassword}
                      onChange={(e) => setOrgForm(prev => ({ ...prev, adminPassword: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pr-10 text-slate-850 text-sm focus:outline-none focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title={showAdminPassword ? "Hide password" : "Show password"}
                    >
                      {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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
                  disabled={orgSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 animate-fade-in"
                >
                  {orgSubmitting ? 'Adding...' : 'Add Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PLAN CONFIGURATION MODAL --- */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">
                {editPlanId ? 'Modify Subscription Plan' : 'Create Subscription Plan'}
              </h3>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handlePlanSubmit} className="p-6 space-y-4">
              {planFormError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">
                  {planFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Special"
                  value={planForm.name}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-850 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Domain Slug</label>
                <input
                  type="text"
                  required
                  disabled={!!editPlanId}
                  placeholder="e.g. enterprise-special"
                  value={planForm.slug}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '') }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-850 text-sm focus:outline-none focus:border-slate-400 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Monthly Billing Rate ($ USD)</label>
                <input
                  type="number"
                  required
                  placeholder="0 for Free"
                  value={planForm.price}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Maximum Asset Quota</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500"
                  value={planForm.maxAssets}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, maxAssets: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 animate-fade-in"
                >
                  {planSubmitting ? 'Submitting...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ORGANIZATION INSPECTION MODAL --- */}
      {showInspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/30 rounded-xl text-blue-400">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {inspectData?.organization?.name || 'Organization Inspector'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Slug: {inspectData?.organization?.slug} • Plan: {inspectData?.organization?.planId?.name || 'Standard'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInspectModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {inspectLoading ? (
              <div className="p-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50 p-4 text-center shrink-0">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branches</span>
                    <span className="text-xl font-extrabold text-slate-800">{inspectData?.branches?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Buildings / Floors / Rooms</span>
                    <span className="text-xl font-extrabold text-slate-800">
                      {inspectData?.buildings?.length || 0} / {inspectData?.floors?.length || 0} / {inspectData?.rooms?.length || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Assets</span>
                    <span className="text-xl font-extrabold text-blue-600">{inspectData?.assets?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Users & Admins</span>
                    <span className="text-xl font-extrabold text-emerald-600">{inspectData?.users?.length || 0}</span>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 px-6 gap-6 bg-white shrink-0">
                  <button
                    onClick={() => setInspectTab('locations')}
                    className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      inspectTab === 'locations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Hierarchy Breakdown ({inspectData?.branches?.length || 0} Branches)
                  </button>
                  <button
                    onClick={() => setInspectTab('assets')}
                    className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      inspectTab === 'assets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Assets Inventory ({inspectData?.assets?.length || 0})
                  </button>
                  <button
                    onClick={() => setInspectTab('users')}
                    className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      inspectTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Registered Users ({inspectData?.users?.length || 0})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-slate-50/30">
                  {inspectTab === 'locations' && (
                    <div className="space-y-4">
                      {inspectData?.branches?.length === 0 ? (
                        <p className="text-slate-400 italic text-sm text-center py-6">No branch locations registered yet.</p>
                      ) : (
                        inspectData?.branches?.map((branch) => {
                          const branchBldgs = inspectData?.buildings?.filter(b => b.branchId === branch._id || b.branchId?._id === branch._id) || [];
                          return (
                            <div key={branch._id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-blue-600" />
                                <span className="font-bold text-slate-900">{branch.name}</span>
                                <span className="text-xs font-mono text-slate-400">({branch.code})</span>
                              </div>

                              <div className="pl-6 space-y-2 border-l border-slate-200 ml-2">
                                {branchBldgs.map((bldg) => {
                                  const bldgFloors = inspectData?.floors?.filter(f => f.buildingId === bldg._id || f.buildingId?._id === bldg._id) || [];
                                  return (
                                    <div key={bldg._id} className="space-y-1">
                                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                        <Building2 className="h-4 w-4 text-indigo-500" />
                                        <span>{bldg.name} ({bldg.code})</span>
                                      </div>

                                      <div className="pl-6 grid grid-cols-1 md:grid-cols-3 gap-2">
                                        {bldgFloors.map((floor) => {
                                          const floorRooms = inspectData?.rooms?.filter(r => r.floorId === floor._id || r.floorId?._id === floor._id) || [];
                                          return (
                                            <div key={floor._id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                                              <span className="font-bold text-slate-800 block">{floor.name} (Lvl {floor.number})</span>
                                              <div className="mt-1 space-y-1">
                                                {floorRooms.map((rm) => {
                                                  const roomAssets = inspectData?.assets?.filter(a => a.roomId?._id === rm._id || a.roomId === rm._id) || [];
                                                  return (
                                                    <div key={rm._id} className="flex justify-between items-center text-[11px] bg-white p-1.5 rounded-lg border border-slate-100">
                                                      <span className="font-medium text-slate-700">{rm.name}</span>
                                                      <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md text-[10px]">
                                                        {roomAssets.length} assets
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                                {floorRooms.length === 0 && <span className="text-[10px] text-slate-400 italic">No rooms</span>}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {inspectTab === 'assets' && (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                            <th className="py-3 px-4">Code</th>
                            <th className="py-3 px-4">Asset Name</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Room Location</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Value ($)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {inspectData?.assets?.map((asset) => (
                            <tr key={asset._id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-mono font-bold text-slate-800">{asset.assetCode}</td>
                              <td className="py-3 px-4 font-semibold text-slate-900">{asset.name}</td>
                              <td className="py-3 px-4 text-slate-500">{asset.categoryId?.name || 'Standard'}</td>
                              <td className="py-3 px-4 font-medium text-slate-600">{asset.roomId?.name || 'Unassigned'}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 capitalize">
                                  {asset.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900">${asset.purchasePrice?.toLocaleString()}</td>
                            </tr>
                          ))}
                          {inspectData?.assets?.length === 0 && (
                            <tr>
                              <td colSpan="6" className="py-6 text-center text-slate-400 italic">No assets registered in this organization.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {inspectTab === 'users' && (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                            <th className="py-3 px-4">User Email</th>
                            <th className="py-3 px-4">Role</th>
                            <th className="py-3 px-4">Joined Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {inspectData?.users?.map((u) => (
                            <tr key={u._id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-semibold text-slate-900">{u.email}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 capitalize">
                                  {u.role.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
